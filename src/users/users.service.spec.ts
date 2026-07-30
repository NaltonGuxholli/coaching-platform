import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../auth/role.enum';

describe('UsersService', () => {
  const makePrisma = () => ({
    user: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    notificationPreference: {
      upsert: jest.fn(),
    },
    deviceSession: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  });

  const makeService = () => {
    const prisma = makePrisma();
    return {
      prisma,
      service: new UsersService(prisma as unknown as PrismaService),
    };
  };

  const account = {
    id: 'user-1',
    tenantId: 'tenant-1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
  };

  it('lists only users from the requested tenant', async () => {
    const { prisma, service } = makeService();
    prisma.user.findMany.mockResolvedValue([]);
    await service.findAllForTenant('tenant-1');
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
    );
  });

  it('returns one tenant-scoped user and deactivates that user', async () => {
    const { prisma, service } = makeService();
    prisma.user.findFirst.mockResolvedValue(account);
    prisma.user.update.mockResolvedValue({ id: 'user-1', status: 'SUSPENDED' });

    await expect(
      service.findOneForTenant('tenant-1', 'user-1'),
    ).resolves.toEqual(account);
    await expect(
      service.deactivateForTenant('tenant-1', 'user-1'),
    ).resolves.toEqual({ id: 'user-1', status: 'SUSPENDED' });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: { status: 'SUSPENDED' },
      }),
    );
  });

  it('exports an account and rejects missing accounts', async () => {
    const { prisma, service } = makeService();
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', enrollments: [] });
    await expect(service.exportAccount('user-1')).resolves.toEqual({
      id: 'user-1',
      enrollments: [],
    });

    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.exportAccount('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('updates the authenticated account and notification preferences', async () => {
    const { prisma, service } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
    });
    await service.updateAccount(
      { ...account, roles: [RoleName.STUDENT] },
      { firstName: ' Ada ', email: 'NEW@example.com' },
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          firstName: 'Ada',
          email: 'new@example.com',
        }),
      }),
    );
    prisma.notificationPreference.upsert.mockResolvedValue({
      userId: 'user-1',
    });
    await expect(service.getNotificationPreferences('user-1')).resolves.toEqual(
      {
        userId: 'user-1',
      },
    );
  });

  it('rejects updates for users outside the tenant', async () => {
    const { prisma, service } = makeService();
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.updateForTenant('tenant-1', 'other-user', { firstName: 'New' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects duplicate email changes inside a tenant', async () => {
    const { prisma, service } = makeService();
    prisma.user.findFirst.mockResolvedValue(account);
    prisma.user.findUnique.mockResolvedValue({ id: 'other-user' });
    await expect(
      service.updateForTenant('tenant-1', 'user-1', {
        email: 'other@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('changes a password only when the current password matches', async () => {
    const { prisma, service } = makeService();
    const passwordHash = await bcrypt.hash('old-password', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash,
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      }),
    ).resolves.toEqual({ success: true });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user-1' } }),
    );

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'wrong-password',
        newPassword: 'new-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('upserts notification preferences and returns active sessions', async () => {
    const { prisma, service } = makeService();
    prisma.notificationPreference.upsert.mockResolvedValue({
      userId: 'user-1',
      remindersEnabled: false,
    });
    prisma.deviceSession.findMany.mockResolvedValue([{ id: 'session-1' }]);

    await expect(
      service.updateNotificationPreferences('user-1', {
        remindersEnabled: false,
      }),
    ).resolves.toEqual({ userId: 'user-1', remindersEnabled: false });
    await service.sessions('user-1');
    expect(prisma.deviceSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-1' }),
      }),
    );
  });

  it('revokes an owned session and rejects a missing session', async () => {
    const { prisma, service } = makeService();
    prisma.deviceSession.updateMany.mockResolvedValue({ count: 1 });
    await expect(service.revokeSession('user-1', 'session-1')).resolves.toEqual(
      {
        success: true,
      },
    );

    prisma.deviceSession.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      service.revokeSession('user-1', 'missing-session'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('anonymizes an account instead of physically deleting its record', async () => {
    const { prisma, service } = makeService();
    prisma.user.update.mockResolvedValue({ id: 'user-1', status: 'DELETED' });
    await expect(service.deleteAccount('user-1')).resolves.toEqual({
      success: true,
    });
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          status: 'DELETED',
          email: expect.stringContaining('deleted-user-1'),
        }),
      }),
    );
  });
});
