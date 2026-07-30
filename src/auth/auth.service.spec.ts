import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const deviceSession = {
    findMany: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    create: jest.fn(
      (args: {
        data: {
          id: string;
          tokenHash: string;
          userId: string;
          expiresAt: Date;
        };
      }) => Promise.resolve(args),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PRISMA_SERVICE,
          useValue: { user: {}, tenant: {}, role: {}, deviceSession },
        },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('persists the session id that is embedded in the access token', async () => {
    const user = {
      id: 'user-1',
      tenantId: 'tenant-1',
      email: 'user@example.com',
      roles: [],
    } as const;

    const result = await (
      service as unknown as {
        withSession: (
          userId: string,
          value: typeof user,
        ) => Promise<typeof user & { sessionId: string }>;
      }
    ).withSession(user.id, user);

    expect(deviceSession.create).toHaveBeenCalled();
    const createCall = deviceSession.create.mock.calls[0]?.[0];
    expect(createCall?.data.id).toBe(result.sessionId);
    expect(createCall?.data.tokenHash).toBe(result.sessionId);
    expect(createCall?.data.userId).toBe(user.id);
  });
});
