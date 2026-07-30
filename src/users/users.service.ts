import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  ChangePasswordDto,
  UpdateAccountDto,
  UpdateNotificationPreferenceDto,
} from './dto/account.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {}

  findAllForTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForTenant(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        userRoles: { select: { role: { select: { name: true } } } },
      },
    });
    if (!user) throw new UnauthorizedException('User was not found');
    return user;
  }

  async updateForTenant(tenantId: string, userId: string, dto: UpdateUserDto) {
    await this.findOneForTenant(tenantId, userId);
    const email = dto.email?.trim().toLowerCase();
    if (email) {
      const duplicate = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId, email } },
      });
      if (duplicate && duplicate.id !== userId)
        throw new ConflictException(
          'An account with this email already exists',
        );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        email,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });
  }

  async deactivateForTenant(tenantId: string, userId: string) {
    await this.findOneForTenant(tenantId, userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' },
      select: { id: true, status: true },
    });
  }

  async exportAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        enrollments: {
          include: { course: { select: { id: true, title: true } } },
        },
        lessonProgress: true,
        courseProgress: true,
        timerSessions: { include: { roundLogs: true } },
        notifications: true,
      },
    });
    if (!user) throw new UnauthorizedException('Account was not found');
    return user;
  }

  async updateAccount(user: AuthenticatedUser, dto: UpdateAccountDto) {
    const email = dto.email?.trim().toLowerCase();
    if (email) {
      const existing = await this.prisma.user.findUnique({
        where: { tenantId_email: { tenantId: user.tenantId, email } },
      });
      if (existing && existing.id !== user.id)
        throw new ConflictException(
          'An account with this email already exists',
        );
    }
    return this.prisma.user.update({
      where: { id: user.id },
      data: {
        ...dto,
        email,
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
      },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    )
      throw new UnauthorizedException('Current password is incorrect');
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) },
    });
    return { success: true };
  }

  async deleteAccount(userId: string) {
    const deletedEmail = `deleted-${userId}@invalid.local`;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: 'Deleted',
        lastName: 'User',
        email: deletedEmail,
        passwordHash: await bcrypt.hash(`${userId}-${Date.now()}`, 12),
        status: 'DELETED',
      },
    });
    return { success: true };
  }

  getNotificationPreferences(userId: string) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  updateNotificationPreferences(
    userId: string,
    dto: UpdateNotificationPreferenceDto,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  sessions(userId: string) {
    return this.prisma.deviceSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        lastSeenAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.deviceSession.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count) throw new UnauthorizedException('Session was not found');
    return { success: true };
  }
}
