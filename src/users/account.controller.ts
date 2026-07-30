import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ChangePasswordDto,
  UpdateAccountDto,
  UpdateNotificationPreferenceDto,
} from './dto/account.dto';
import { UsersService } from './users.service';

@ApiTags('Account')
@ApiBearerAuth()
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly users: UsersService) {}

  @Get('export')
  @ApiOperation({ summary: 'Export the authenticated user’s account data' })
  export(@CurrentUser() user: AuthenticatedUser) {
    return this.users.exportAccount(user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update the authenticated user’s profile' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.users.updateAccount(user, dto);
  }

  @Patch('password')
  @ApiOperation({ summary: 'Change the authenticated user’s password' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.users.changePassword(user.id, dto);
  }

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get notification and reminder preferences' })
  notificationPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getNotificationPreferences(user.id);
  }

  @Patch('notification-preferences')
  @ApiOperation({ summary: 'Update notification and reminder preferences' })
  updateNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateNotificationPreferenceDto,
  ) {
    return this.users.updateNotificationPreferences(user.id, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List active devices and sessions' })
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.users.sessions(user.id);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Revoke one active device session' })
  revokeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sessionId') sessionId: string,
  ) {
    return this.users.revokeSession(user.id, sessionId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Deactivate and anonymize the authenticated account',
  })
  remove(@CurrentUser() user: AuthenticatedUser) {
    return this.users.deleteAccount(user.id);
  }
}
