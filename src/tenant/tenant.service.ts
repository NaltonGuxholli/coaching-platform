import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { RoleName } from '../auth/role.enum';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import {
  CreateDomainDto,
  CreateThemeDto,
  UpdateDomainDto,
  UpdateTenantSettingsDto,
} from './dto/tenant.dto';

@Injectable()
export class TenantService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  listThemes() {
    return this.ensureDefaultThemes();
  }

  async getSettings(user: AuthenticatedUser) {
    return this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
      include: { baseTheme: true },
    });
  }

  async updateSettings(user: AuthenticatedUser, dto: UpdateTenantSettingsDto) {
    if (dto.baseThemeId) {
      const theme = await this.prisma.theme.findFirst({
        where: { id: dto.baseThemeId, isActive: true },
      });
      if (!theme) throw new NotFoundException('Theme was not found');
    }
    const existing = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    const current = existing ? this.settingsSnapshot(existing) : {};
    const draft = { ...current, ...dto };
    await this.prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      create: { tenantId: user.tenantId, draftJson: this.toJson(draft) },
      update: { draftJson: this.toJson(draft) },
    });
    return { settings: await this.getSettings(user), preview: draft };
  }

  async publishSettings(user: AuthenticatedUser) {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: user.tenantId },
    });
    if (!settings)
      throw new NotFoundException('Tenant settings were not found');
    const version =
      ((
        await this.prisma.tenantThemeRevision.findFirst({
          where: { tenantId: user.tenantId },
          orderBy: { version: 'desc' },
        })
      )?.version ?? 0) + 1;
    const snapshot =
      settings.draftJson &&
      typeof settings.draftJson === 'object' &&
      !Array.isArray(settings.draftJson)
        ? (settings.draftJson as Record<string, unknown>)
        : this.settingsSnapshot(settings);
    const revision = await this.prisma.tenantThemeRevision.create({
      data: {
        tenantId: user.tenantId,
        createdBy: user.id,
        version,
        configJson: this.toJson(snapshot),
      },
    });
    await this.prisma.tenantSettings.update({
      where: { id: settings.id },
      data: {
        ...this.settingsData(snapshot),
        publishedThemeRevisionId: revision.id,
        publishedAt: new Date(),
        draftJson: Prisma.JsonNull,
      },
    });
    return { revision, settings: await this.getSettings(user) };
  }

  revisions(user: AuthenticatedUser) {
    return this.prisma.tenantThemeRevision.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { version: 'desc' },
    });
  }

  async rollback(user: AuthenticatedUser, revisionId: string) {
    const revision = await this.prisma.tenantThemeRevision.findFirst({
      where: { id: revisionId, tenantId: user.tenantId },
    });
    if (!revision) throw new NotFoundException('Theme revision was not found');
    const config = revision.configJson as Record<string, unknown>;
    const settings = await this.prisma.tenantSettings.update({
      where: { tenantId: user.tenantId },
      data: {
        ...this.settingsData(config as UpdateTenantSettingsDto),
        publishedThemeRevisionId: revision.id,
        publishedAt: new Date(),
        draftJson: Prisma.JsonNull,
      },
    });
    return { settings, restoredRevision: revision };
  }

  async addDomain(user: AuthenticatedUser, dto: CreateDomainDto) {
    const domain = dto.domain.trim().toLowerCase();
    try {
      return await this.prisma.customDomain.create({
        data: { tenantId: user.tenantId, domain, sslStatus: 'PENDING' },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('That domain is already registered');
      throw error;
    }
  }

  async updateDomain(
    user: AuthenticatedUser,
    id: string,
    dto: UpdateDomainDto,
  ) {
    const domain = await this.prisma.customDomain.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!domain) throw new NotFoundException('Domain was not found');
    return this.prisma.customDomain.update({ where: { id }, data: dto });
  }

  domains(user: AuthenticatedUser) {
    return this.prisma.customDomain.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTheme(user: AuthenticatedUser, dto: CreateThemeDto) {
    this.assertPlatformAdmin(user);
    return this.prisma.theme.create({
      data: { ...dto, tokenJson: this.toJson(dto.tokenJson) },
    });
  }

  async updateTheme(user: AuthenticatedUser, id: string, dto: CreateThemeDto) {
    this.assertPlatformAdmin(user);
    const theme = await this.prisma.theme.findUnique({
      where: { id },
      include: { versions: true },
    });
    if (!theme) throw new NotFoundException('Theme was not found');
    const version = `v${theme.versions.length + 1}`;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.theme.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          previewImage: dto.previewImage,
          tokenJson: this.toJson(dto.tokenJson),
        },
      });
      await tx.themeVersion.create({
        data: { themeId: id, version, tokenJson: this.toJson(dto.tokenJson) },
      });
      return updated;
    });
  }

  private settingsData(dto: UpdateTenantSettingsDto | Record<string, unknown>) {
    const fields = [
      'brandName',
      'browserTitle',
      'logoUrl',
      'logoLightUrl',
      'logoDarkUrl',
      'faviconUrl',
      'heroImageUrl',
      'primaryColor',
      'secondaryColor',
      'tertiaryColor',
      'backgroundColor',
      'fontHeading',
      'fontBody',
      'baseThemeId',
      'locale',
      'customCss',
      'terminologyJson',
      'pageSectionsJson',
    ];
    return Object.fromEntries(
      fields
        .filter((key) => dto[key] !== undefined)
        .map((key) => [
          key,
          ['terminologyJson', 'pageSectionsJson'].includes(key)
            ? this.toJson(dto[key])
            : dto[key],
        ]),
    );
  }

  private settingsSnapshot(settings: Record<string, unknown>) {
    const {
      id,
      tenantId,
      createdAt,
      updatedAt,
      draftJson,
      publishedThemeRevisionId,
      publishedAt,
      ...snapshot
    } = settings;
    void id;
    void tenantId;
    void createdAt;
    void updatedAt;
    void draftJson;
    void publishedThemeRevisionId;
    void publishedAt;
    return snapshot;
  }

  private toJson(value: unknown) {
    return value as Prisma.InputJsonValue;
  }

  private async ensureDefaultThemes() {
    if ((await this.prisma.theme.count()) === 0) {
      await this.prisma.theme.createMany({
        data: [
          {
            name: 'Dark Premium',
            description: 'High-contrast premium theme',
            tokenJson: {
              colors: {
                background: '#101114',
                surface: '#1b1d22',
                text: '#f7f7f7',
                accent: '#d5ff3f',
              },
              typography: { heading: 'Inter', body: 'Inter' },
              spacing: [4, 8, 12, 16, 24, 32],
              radius: [4, 8, 16],
              elevation: ['0 4px 20px rgba(0,0,0,.24)'],
            },
          },
          {
            name: 'Light Minimal',
            description: 'Clean light theme for editorial teaching sites',
            tokenJson: {
              colors: {
                background: '#fafafa',
                surface: '#ffffff',
                text: '#202124',
                accent: '#2457d6',
              },
              typography: { heading: 'Manrope', body: 'Inter' },
              spacing: [4, 8, 12, 16, 24, 32],
              radius: [4, 8, 16],
              elevation: ['0 2px 12px rgba(0,0,0,.08)'],
            },
          },
          {
            name: 'Bold Studio',
            description: 'Confident, colorful theme for creator brands',
            tokenJson: {
              colors: {
                background: '#24132f',
                surface: '#382044',
                text: '#fff7ff',
                accent: '#ff6b4a',
                secondary: '#ffd166',
              },
              typography: { heading: 'Space Grotesk', body: 'DM Sans' },
              spacing: [4, 8, 16, 24, 40],
              radius: [8, 16, 24],
              elevation: ['0 6px 24px rgba(0,0,0,.2)'],
            },
          },
          {
            name: 'Editorial',
            description: 'Warm, typographic theme for thoughtful instruction',
            tokenJson: {
              colors: {
                background: '#f2eee7',
                surface: '#fffdf8',
                text: '#312c27',
                accent: '#a3482a',
              },
              typography: {
                heading: 'Libre Baskerville',
                body: 'Source Sans 3',
              },
              spacing: [4, 8, 12, 20, 28, 40],
              radius: [2, 6, 12],
              elevation: ['0 2px 10px rgba(60,40,20,.1)'],
            },
          },
        ],
      });
    }
    return this.prisma.theme.findMany({
      where: { isActive: true },
      include: { versions: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  private assertPlatformAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes(RoleName.ADMIN) || !user.isPlatformAdmin)
      throw new ForbiddenException('Platform administrator access is required');
  }
}
