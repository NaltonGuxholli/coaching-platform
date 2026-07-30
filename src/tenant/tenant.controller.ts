import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../auth/role.enum';
import {
  CreateDomainDto,
  CreateThemeDto,
  UpdateDomainDto,
  UpdateTenantSettingsDto,
} from './dto/tenant.dto';
import { TenantService } from './tenant.service';

@ApiTags('Tenant branding')
@ApiBearerAuth()
@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.INSTRUCTOR)
export class TenantController {
  constructor(private readonly tenants: TenantService) {}
  @Get('themes') themes() {
    return this.tenants.listThemes();
  }
  @Get('settings') settings(@CurrentUser() user: AuthenticatedUser) {
    return this.tenants.getSettings(user);
  }
  @Patch('settings') update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenants.updateSettings(user, dto);
  }
  @Post('settings/publish') publish(@CurrentUser() user: AuthenticatedUser) {
    return this.tenants.publishSettings(user);
  }
  @Get('theme-revisions') revisions(@CurrentUser() user: AuthenticatedUser) {
    return this.tenants.revisions(user);
  }
  @Post('theme-revisions/:revisionId/rollback') rollback(
    @CurrentUser() user: AuthenticatedUser,
    @Param('revisionId') id: string,
  ) {
    return this.tenants.rollback(user, id);
  }
  @Get('domains') domains(@CurrentUser() user: AuthenticatedUser) {
    return this.tenants.domains(user);
  }
  @Post('domains') addDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDomainDto,
  ) {
    return this.tenants.addDomain(user, dto);
  }
  @Patch('domains/:id') updateDomain(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDomainDto,
  ) {
    return this.tenants.updateDomain(user, id, dto);
  }
  @Post('themes') @Roles(RoleName.ADMIN) createTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateThemeDto,
  ) {
    return this.tenants.createTheme(user, dto);
  }
  @Patch('themes/:id') @Roles(RoleName.ADMIN) updateTheme(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateThemeDto,
  ) {
    return this.tenants.updateTheme(user, id, dto);
  }
}
