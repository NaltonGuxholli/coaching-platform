import { Body, Controller, Get, Post, UseGuards, Delete, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './authenticated-user.interface';
import { UsersService } from '../users/users.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { RoleName } from './role.enum';
import { BootstrapDto } from './dto/bootstrap.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import {
  PasswordResetDto,
  PasswordResetRequestDto,
} from './dto/password-reset.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterInstructorDto } from './dto/register-instructor.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ConfirmMfaDto } from '../users/dto/account.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly usersService: UsersService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register/instructor')
  registerInstructor(@Body() dto: RegisterInstructorDto) {
    return this.authService.registerInstructor(dto);
  }

  @Post('bootstrap')
  bootstrap(@Body() dto: BootstrapDto) {
    return this.authService.bootstrap(dto);
  }

  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('password-reset/reset')
  resetPassword(@Body() dto: PasswordResetDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  sessions(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.sessions(user.id);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  revokeSession(@CurrentUser() user: AuthenticatedUser, @Param('sessionId') sessionId: string) {
    return this.usersService.revokeSession(user.id, sessionId);
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  setupMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupMfa(user);
  }

  @Post('mfa/confirm')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  confirmMfa(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConfirmMfaDto,
  ) {
    return this.authService.confirmMfa(user, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  disableMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.disableMfa(user);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  createUser(
    @CurrentUser() admin: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.authService.createUser(admin.tenantId, dto, dto.role);
  }
}
