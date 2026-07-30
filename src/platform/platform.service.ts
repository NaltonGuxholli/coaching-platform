import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { RoleName } from '../auth/role.enum';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import { ReviewReportDto } from './dto/admin.dto';

@Injectable()
export class PlatformService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  async listTenants(user: AuthenticatedUser) {
    this.assertPlatformAdmin(user);
    return this.prisma.tenant.findMany({
      include: {
        settings: true,
        _count: { select: { users: true, courses: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTenantStatus(
    user: AuthenticatedUser,
    tenantId: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ) {
    this.assertPlatformAdmin(user);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant was not found');
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });
  }

  async listReports(user: AuthenticatedUser) {
    this.assertPlatformAdmin(user);
    return this.prisma.report.findMany({
      include: {
        reporter: { select: { id: true, email: true, tenantId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewReport(
    user: AuthenticatedUser,
    reportId: string,
    dto: ReviewReportDto,
  ) {
    this.assertPlatformAdmin(user);
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report was not found');
    const update = await this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        resolutionNote: dto.resolutionNote,
      },
    });
    if (
      dto.status === 'RESOLVED' &&
      report.entityType.toUpperCase().includes('COURSE')
    ) {
      await this.prisma.course.updateMany({
        where: { id: report.entityId },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      });
    }
    return update;
  }

  private assertPlatformAdmin(user: AuthenticatedUser) {
    if (!user.roles.includes(RoleName.ADMIN) || !user.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator access is required');
    }
  }
}
