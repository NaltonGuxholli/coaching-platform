import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import type { PrismaService } from '../prisma/prisma.service';

describe('AuditInterceptor', () => {
  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
    email: 'user@example.com',
    roles: [],
  };

  it('passes anonymous requests through without writing an audit record', () => {
    const prisma = { auditLog: { create: jest.fn() } };
    const interceptor = new AuditInterceptor(
      prisma as unknown as PrismaService,
    );
    const next = { handle: jest.fn(() => of('ok')) };
    const context = {
      switchToHttp: () => ({ getRequest: () => ({ user: undefined }) }),
    };

    expect(interceptor.intercept(context as never, next)).toBeDefined();
    expect(next.handle).toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('records authenticated requests after the handler succeeds', async () => {
    const prisma = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
    const interceptor = new AuditInterceptor(
      prisma as unknown as PrismaService,
    );
    const next = { handle: jest.fn(() => of('ok')) };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          method: 'PATCH',
          path: '/courses/course-1',
          params: { id: 'course-1' },
          query: { preview: 'true' },
          ip: '127.0.0.1',
        }),
      }),
      getClass: () => ({ name: 'CoursesController' }),
    };

    interceptor.intercept(context as never, next).subscribe();
    await new Promise((resolve) => setImmediate(resolve));
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          action: 'PATCH /courses/course-1',
          entityType: 'CoursesController',
          entityId: 'course-1',
        }),
      }),
    );
  });
});
