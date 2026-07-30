import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import { RoleName } from './role.enum';

describe('AuthService', () => {
  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    passwordHash: '',
    status: 'ACTIVE',
    mfaEnabled: false,
    mfaSecret: null,
    isPlatformAdmin: false,
    userRoles: [{ role: { name: RoleName.STUDENT } }],
  };

  const makePrisma = () => {
    const prisma = {
      tenant: {
        count: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      tenantSettings: { create: jest.fn() },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      role: { upsert: jest.fn(), create: jest.fn() },
      deviceSession: {
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
        updateMany: jest.fn(),
        create: jest.fn((args: unknown) => Promise.resolve(args)),
      },
      passwordResetToken: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      emailLog: { create: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation((operation: unknown) => {
      if (Array.isArray(operation)) return Promise.all(operation);
      return (operation as (tx: typeof prisma) => unknown)(prisma);
    });
    return prisma;
  };

  const makeService = () => {
    const prisma = makePrisma();
    const jwt = { sign: jest.fn().mockReturnValue('jwt-token') };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
    return { prisma, service };
  };

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('registers a learner by tenant slug and issues a session-bound token', async () => {
    const { prisma, service } = makeService();
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: 'ACTIVE',
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.tenant.findUnique.mockResolvedValue({ status: 'ACTIVE' });
    prisma.role.upsert.mockResolvedValue({ id: 'role-1' });
    prisma.user.create.mockResolvedValue({ ...user, userRoles: undefined });

    const result = await service.register({
      tenantSlug: 'ada-maths',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ADA@example.com',
      password: 'password-123',
    });

    expect(result.accessToken).toBe('jwt-token');
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'ada@example.com' }),
      }),
    );
    expect(prisma.deviceSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: result.user.sessionId,
          tokenHash: result.user.sessionId,
        }),
      }),
    );
  });

  it('rejects duplicate learner accounts within one tenant', async () => {
    const { prisma, service } = makeService();
    prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1', status: 'ACTIVE' });
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        tenantSlug: 'ada-maths',
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: 'password-123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with a tenant slug and rejects invalid passwords', async () => {
    const { prisma, service } = makeService();
    const passwordHash = await bcrypt.hash('password-123', 4);
    prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1', status: 'ACTIVE' });
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });

    const result = await service.login({
      tenantSlug: 'ada-maths',
      email: 'ada@example.com',
      password: 'password-123',
    });
    expect(result.accessToken).toBe('jwt-token');
    expect(prisma.user.update).toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });
    await expect(
      service.login({
        tenantSlug: 'ada-maths',
        email: 'ada@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates an instructor and tenant through self-service registration', async () => {
    const { prisma, service } = makeService();
    prisma.tenant.findFirst.mockResolvedValue(null);
    prisma.tenant.create.mockResolvedValue({ id: 'tenant-2' });
    prisma.role.create.mockResolvedValue({ id: 'role-2' });
    prisma.user.create.mockResolvedValue({
      id: 'instructor-1',
      tenantId: 'tenant-2',
      email: 'instructor@example.com',
    });

    const result = await service.registerInstructor({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'instructor@example.com',
      password: 'password-123',
      tenantName: 'Grace Coding',
      tenantSlug: 'grace-coding',
      subdomain: 'grace-coding',
    });

    expect(result.user.roles).toEqual([RoleName.INSTRUCTOR]);
    expect(prisma.tenantSettings.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-2' }) }),
    );
  });

  it('queues password reset mail without revealing unknown accounts', async () => {
    const { prisma, service } = makeService();
    prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1', status: 'ACTIVE' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset({
        tenantSlug: 'ada-maths',
        email: 'unknown@example.com',
      }),
    ).resolves.toEqual({ accepted: true });
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it('revokes the current device session on logout', async () => {
    const { prisma, service } = makeService();
    await service.logout({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'ada@example.com',
      roles: [RoleName.STUDENT],
      sessionId: 'session-1',
    });
    expect(prisma.deviceSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'session-1', userId: 'user-1' },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
