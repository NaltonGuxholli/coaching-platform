import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../auth/role.enum';
import { ReviewReportDto, UpdateTenantStatusDto } from './dto/admin.dto';
import { PlatformService } from './platform.service';

@ApiTags('Platform administration')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
export class AdminController {
  constructor(private readonly platform: PlatformService) {}

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenant accounts' })
  tenants(@CurrentUser() user: AuthenticatedUser) {
    return this.platform.listTenants(user);
  }

  @Patch('tenants/:tenantId/status')
  @ApiOperation({ summary: 'Suspend or reinstate a tenant' })
  updateTenantStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantStatusDto,
  ) {
    return this.platform.updateTenantStatus(user, tenantId, dto.status);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List content moderation reports' })
  reports(@CurrentUser() user: AuthenticatedUser) {
    return this.platform.listReports(user);
  }

  @Patch('reports/:reportId')
  @ApiOperation({ summary: 'Resolve or reject a content moderation report' })
  review(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reportId') reportId: string,
    @Body() dto: ReviewReportDto,
  ) {
    return this.platform.reviewReport(user, reportId, dto);
  }
}
