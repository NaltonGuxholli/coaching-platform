import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import type { PrismaService } from '../../prisma/prisma.service';
import { RoleName } from '../role.enum';

describe('JwtStrategy', () => {
  it('loads the active tenant user and validates its device session', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          tenantId: 'tenant-1',
          email: 'user@example.com',
          isPlatformAdmin: false,
          userRoles: [{ role: { name: RoleName.STUDENT } }],
        }),
      },
      deviceSession: {
        findFirst: jest.fn().mockResolvedValue({ id: 'session-1' }),
        update: jest.fn(),
      },
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
    };
    const strategy = new JwtStrategy(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );

    await expect(
      strategy.validate({
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'user@example.com',
        roles: [RoleName.STUDENT],
        sessionId: 'session-1',
      }),
    ).resolves.toEqual({
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'user@example.com',
      roles: [RoleName.STUDENT],
      isPlatformAdmin: false,
      sessionId: 'session-1',
    });
    expect(prisma.deviceSession.update).toHaveBeenCalled();
  });

  it('rejects revoked or missing sessions', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'user-1',
          tenantId: 'tenant-1',
          email: 'user@example.com',
          userRoles: [],
        }),
      },
      deviceSession: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const config = { getOrThrow: jest.fn().mockReturnValue('test-secret') };
    const strategy = new JwtStrategy(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
    );
    await expect(
      strategy.validate({
        sub: 'user-1',
        tenantId: 'tenant-1',
        email: 'user@example.com',
        roles: [],
        sessionId: 'revoked-session',
      }),
    ).rejects.toThrow('Session is no longer active');
  });
});
