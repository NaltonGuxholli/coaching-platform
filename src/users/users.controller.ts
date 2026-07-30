import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../auth/role.enum';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Tenant users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.INSTRUCTOR)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users in the current tenant' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAllForTenant(user.tenantId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get one user in the current tenant' })
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ) {
    return this.usersService.findOneForTenant(user.tenantId, userId);
  }

  @Patch(':userId')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Update a user in the current tenant' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateForTenant(user.tenantId, userId, dto);
  }

  @Delete(':userId')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Suspend a user in the current tenant' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
  ) {
    return this.usersService.deactivateForTenant(user.tenantId, userId);
  }
}
