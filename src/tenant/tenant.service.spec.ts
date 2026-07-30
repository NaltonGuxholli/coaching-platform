import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TenantService } from './tenant.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RoleName } from '../auth/role.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';

describe('TenantService', () => {
  const admin: AuthenticatedUser = {
    id: 'admin-1',
    tenantId: 'tenant-1',
    email: 'admin@example.com',
    roles: [RoleName.ADMIN],
    isPlatformAdmin: true,
  };

  const instructor: AuthenticatedUser = {
    id: 'instructor-1',
    tenantId: 'tenant-1',
    email: 'instructor@example.com',
    roles: [RoleName.INSTRUCTOR],
  };

  const makePrisma = () => ({
    theme: {
      count: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    themeVersion: { create: jest.fn() },
    tenantSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    tenantThemeRevision: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    customDomain: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  });

  const makeService = () => {
    const prisma = makePrisma();
    prisma.$transaction.mockImplementation((operation: unknown) =>
      (operation as (tx: typeof prisma) => unknown)(prisma),
    );
    return {
      prisma,
      service: new TenantService(prisma as unknown as PrismaService),
    };
  };

  it('creates the default theme library when none exists', async () => {
    const { prisma, service } = makeService();
    prisma.theme.count.mockResolvedValue(0);
    prisma.theme.findMany.mockResolvedValue([
      { id: 'theme-1', name: 'Dark Premium' },
    ]);
    await expect(service.listThemes()).resolves.toEqual([
      { id: 'theme-1', name: 'Dark Premium' },
    ]);
    expect(prisma.theme.createMany).toHaveBeenCalled();
  });

  it('rejects selecting an inactive or unknown theme', async () => {
    const { prisma, service } = makeService();
    prisma.theme.findFirst.mockResolvedValue(null);
    await expect(
      service.updateSettings(instructor, { baseThemeId: 'missing-theme' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('stores branding edits as a draft and publishes a revision', async () => {
    const { prisma, service } = makeService();
    prisma.tenantSettings.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'settings-1',
        tenantId: 'tenant-1',
        draftJson: { brandName: 'Ada Maths', primaryColor: '#111111' },
      })
      .mockResolvedValueOnce({ id: 'settings-1', tenantId: 'tenant-1' });
    prisma.tenantSettings.upsert.mockResolvedValue({ id: 'settings-1' });
    prisma.tenantThemeRevision.findFirst.mockResolvedValue({ version: 2 });
    prisma.tenantThemeRevision.create.mockResolvedValue({
      id: 'revision-3',
      version: 3,
    });
    prisma.tenantSettings.update.mockResolvedValue({ id: 'settings-1' });

    const draft = await service.updateSettings(instructor, {
      brandName: 'Ada Maths',
      primaryColor: '#111111',
    });
    expect(draft.preview).toEqual({
      brandName: 'Ada Maths',
      primaryColor: '#111111',
    });

    const published = await service.publishSettings(instructor);
    expect(published.revision).toEqual({ id: 'revision-3', version: 3 });
    expect(prisma.tenantThemeRevision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ version: 3 }),
      }),
    );
  });

  it('scopes domains to the current tenant', async () => {
    const { prisma, service } = makeService();
    prisma.customDomain.create.mockResolvedValue({
      id: 'domain-1',
      tenantId: 'tenant-1',
      domain: 'coach.example.com',
    });
    await service.addDomain(instructor, { domain: ' Coach.Example.com ' });
    expect(prisma.customDomain.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        domain: 'coach.example.com',
        sslStatus: 'PENDING',
      },
    });
  });

  it('allows theme-library writes only to platform administrators', async () => {
    const { prisma, service } = makeService();
    await expect(
      service.createTheme(instructor, {
        name: 'Custom',
        tokenJson: { colors: {} },
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.theme.create.mockResolvedValue({ id: 'theme-2', name: 'Custom' });
    await expect(
      service.createTheme(admin, {
        name: 'Custom',
        tokenJson: { colors: {} },
      }),
    ).resolves.toEqual({ id: 'theme-2', name: 'Custom' });
  });
});
