import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlatformService } from './platform.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../auth/role.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';

describe('PlatformService', () => {
  const admin: AuthenticatedUser = {
    id: 'platform-admin',
    tenantId: 'tenant-1',
    email: 'admin@example.com',
    roles: [RoleName.ADMIN],
    isPlatformAdmin: true,
  };
  const tenantAdmin: AuthenticatedUser = {
    ...admin,
    isPlatformAdmin: false,
  };

  const makePrisma = () => ({
    tenant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    report: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    course: { updateMany: jest.fn() },
  });

  it('denies platform operations to tenant administrators', async () => {
    const prisma = makePrisma();
    const service = new PlatformService(prisma as unknown as PrismaService);
    await expect(service.listTenants(tenantAdmin)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lists tenants with account and course counts', async () => {
    const prisma = makePrisma();
    const service = new PlatformService(prisma as unknown as PrismaService);
    prisma.tenant.findMany.mockResolvedValue([{ id: 'tenant-1' }]);
    await expect(service.listTenants(admin)).resolves.toEqual([{ id: 'tenant-1' }]);
    expect(prisma.tenant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: expect.objectContaining({ _count: expect.any(Object) }) }),
    );
  });

  it('updates only existing tenant statuses', async () => {
    const prisma = makePrisma();
    const service = new PlatformService(prisma as unknown as PrismaService);
    prisma.tenant.findUnique.mockResolvedValue(null);
    await expect(
      service.updateTenantStatus(admin, 'missing', 'SUSPENDED'),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.tenant.findUnique.mockResolvedValue({ id: 'tenant-2' });
    prisma.tenant.update.mockResolvedValue({ id: 'tenant-2', status: 'ACTIVE' });
    await expect(
      service.updateTenantStatus(admin, 'tenant-2', 'ACTIVE'),
    ).resolves.toEqual({ id: 'tenant-2', status: 'ACTIVE' });
  });

  it('archives reported courses when an admin resolves a report', async () => {
    const prisma = makePrisma();
    const service = new PlatformService(prisma as unknown as PrismaService);
    prisma.report.findUnique.mockResolvedValue({
      id: 'report-1',
      entityType: 'COURSE',
      entityId: 'course-1',
    });
    prisma.report.update.mockResolvedValue({ id: 'report-1', status: 'RESOLVED' });

    await service.reviewReport(admin, 'report-1', {
      status: 'RESOLVED',
      resolutionNote: 'Removed',
    });
    expect(prisma.course.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'course-1' } }),
    );
  });
});
