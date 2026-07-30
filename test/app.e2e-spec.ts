import { INestApplication } from '@nestjs/common';
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PRISMA_SERVICE } from '../src/prisma/prisma.constants';
import { PrismaService } from '../src/prisma/prisma.service';

process.env.JWT_SECRET = 'e2e-test-secret-not-for-production';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  type AuthenticatedUserRecord = {
    id: string;
    tenantId: string;
    email: string;
    userRoles: Array<{ role: { name: string } }>;
  };
  const prisma = {
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
    user: {
      findFirst: jest.fn<() => Promise<AuthenticatedUserRecord | null>>(),
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(PRISMA_SERVICE)
      .useValue(prisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    prisma.user.findFirst.mockReset();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('accepts a valid JWT and returns the authenticated tenant user', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'student-1',
      tenantId: 'tenant-1',
      email: 'student@example.com',
      userRoles: [{ role: { name: 'STUDENT' } }],
    });
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: 'student-1',
      tenantId: 'tenant-1',
      email: 'student@example.com',
      roles: ['STUDENT'],
    });

    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body).toEqual({
      id: 'student-1',
      tenantId: 'tenant-1',
      email: 'student@example.com',
      roles: ['STUDENT'],
    });
  });

  it('rejects missing, malformed, and expired JWTs', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);

    const expiredToken = new JwtService({
      secret: process.env.JWT_SECRET,
    }).sign(
      {
        sub: 'student-1',
        tenantId: 'tenant-1',
        email: 'student@example.com',
        roles: ['STUDENT'],
      },
      { expiresIn: -1 },
    );

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('denies a student access to instructor/admin user management', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'student-1',
      tenantId: 'tenant-1',
      email: 'student@example.com',
      userRoles: [{ role: { name: 'STUDENT' } }],
    });
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign({
      sub: 'student-1',
      tenantId: 'tenant-1',
      email: 'student@example.com',
      roles: ['STUDENT'],
    });

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});
