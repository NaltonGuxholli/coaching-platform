import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, createHmac, randomBytes } from 'crypto';
import { PRISMA_SERVICE } from '../prisma/prisma.constants';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from './authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { BootstrapDto } from './dto/bootstrap.dto';
import { RegisterInstructorDto } from './dto/register-instructor.dto';
import {
  PasswordResetDto,
  PasswordResetRequestDto,
} from './dto/password-reset.dto';
import { JwtPayload } from './jwt-payload.interface';
import { RoleName } from './role.enum';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PRISMA_SERVICE)
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const tenant = await this.resolveTenant(dto.tenantId, dto.tenantSlug);
    return this.createUser(tenant.id, dto, RoleName.STUDENT);
  }

  async registerInstructor(dto: RegisterInstructorDto) {
    const email = dto.email.trim().toLowerCase();
    const duplicate = await this.prisma.tenant.findFirst({
      where: { OR: [{ slug: dto.tenantSlug }, { subdomain: dto.subdomain }] },
    });
    if (duplicate) {
      throw new ConflictException(
        'That tenant slug or subdomain is already in use',
      );
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName.trim(),
          slug: dto.tenantSlug,
          subdomain: dto.subdomain,
          status: 'ACTIVE',
        },
      });
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          brandName: dto.tenantName.trim(),
          browserTitle: dto.tenantName.trim(),
        },
      });
      const role = await tx.role.create({
        data: { tenantId: tenant.id, name: RoleName.INSTRUCTOR },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          passwordHash,
          status: 'ACTIVE',
          userRoles: { create: { roleId: role.id } },
        },
      });
      return { tenant, user };
    });
    return this.issueToken(
      await this.withSession(result.user.id, {
        id: result.user.id,
        tenantId: result.user.tenantId,
        email: result.user.email,
        roles: [RoleName.INSTRUCTOR],
      }),
    );
  }

  async bootstrap(dto: BootstrapDto) {
    if ((await this.prisma.tenant.count()) > 0) {
      throw new ConflictException(
        'Bootstrap is unavailable because a tenant already exists',
      );
    }
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName.trim(),
          slug: dto.tenantSlug,
          subdomain: dto.subdomain,
          status: 'ACTIVE',
        },
      });
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          brandName: dto.tenantName.trim(),
          browserTitle: dto.tenantName.trim(),
        },
      });
      const role = await tx.role.create({
        data: { tenantId: tenant.id, name: RoleName.ADMIN },
      });
      return tx.user.create({
        data: {
          tenantId: tenant.id,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          email,
          passwordHash,
          isPlatformAdmin: true,
          status: 'ACTIVE',
          userRoles: { create: { roleId: role.id } },
        },
      });
    });
    return this.issueToken(
      await this.withSession(user.id, {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles: [RoleName.ADMIN],
        isPlatformAdmin: true,
      }),
    );
  }

  async createUser(
    tenantId: string,
    dto: Omit<CreateUserDto, 'role'> | RegisterDto,
    role: RoleName,
  ) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tenant is unavailable');
    }

    const assignedRole = await this.prisma.role.upsert({
      where: { tenantId_name: { tenantId, name: role } },
      update: {},
      create: { tenantId, name: role },
    });
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email,
        passwordHash,
        status: 'ACTIVE',
        userRoles: { create: { roleId: assignedRole.id } },
      },
    });

    return this.issueToken(
      await this.withSession(user.id, {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles: [role],
      }),
    );
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const tenant = await this.resolveTenant(dto.tenantId, dto.tenantSlug);
    const user = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email } },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (
      user.mfaEnabled &&
      (!dto.mfaCode || !this.verifyTotp(user.mfaSecret, dto.mfaCode))
    ) {
      throw new UnauthorizedException('A valid MFA code is required');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const roles = user.userRoles
      .map(({ role }) => role.name)
      .filter((role): role is RoleName =>
        Object.values(RoleName).includes(role as RoleName),
      );

    return this.issueToken(
      await this.withSession(user.id, {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles,
        isPlatformAdmin: user.isPlatformAdmin,
      }),
    );
  }

  async requestPasswordReset(dto: PasswordResetRequestDto) {
    const tenant = await this.resolveTenant(dto.tenantId, dto.tenantSlug);
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email: dto.email.trim().toLowerCase(),
        },
      },
    });
    if (!user || user.status !== 'ACTIVE') return { accepted: true };
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await this.prisma.emailLog.create({
      data: { userId: user.id, template: 'PASSWORD_RESET', status: 'QUEUED' },
    });
    return {
      accepted: true,
      ...(process.env.NODE_ENV === 'production'
        ? {}
        : { developmentToken: rawToken }),
    };
  }

  async resetPassword(dto: PasswordResetDto) {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const token = await this.prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!token)
      throw new UnauthorizedException(
        'Password reset token is invalid or expired',
      );
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash: await bcrypt.hash(dto.password, 12) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.deviceSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true };
  }

  async logout(user: AuthenticatedUser) {
    if (user.sessionId) {
      await this.prisma.deviceSession.updateMany({
        where: { id: user.sessionId, userId: user.id },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true };
  }

  async setupMfa(user: AuthenticatedUser) {
    const secret = randomBytes(20)
      .toString('base64')
      .replace(/[^A-Z2-7]/gi, '')
      .slice(0, 32)
      .toUpperCase();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret, mfaEnabled: false },
    });
    return {
      secret,
      otpauthUrl: `otpauth://totp/Coaching%20Platform:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Coaching%20Platform`,
    };
  }

  async confirmMfa(user: AuthenticatedUser, code: string) {
    const account = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { mfaSecret: true },
    });
    if (!account?.mfaSecret || !this.verifyTotp(account.mfaSecret, code))
      throw new UnauthorizedException('MFA code is invalid');
    return this.prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
      select: { id: true, mfaEnabled: true },
    });
  }

  disableMfa(user: AuthenticatedUser) {
    return this.prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null },
      select: { id: true, mfaEnabled: true },
    });
  }

  private verifyTotp(secret: string | null, code: string) {
    if (!secret || !/^\d{6}$/.test(code)) return false;
    const key = this.base32Decode(secret);
    const counter = Math.floor(Date.now() / 1000 / 30);
    return [-1, 0, 1].some((offset) => {
      const buffer = Buffer.alloc(8);
      buffer.writeBigInt64BE(BigInt(counter + offset));
      const digest = createHmac('sha1', key).update(buffer).digest();
      const index = digest[digest.length - 1] & 15;
      const value = (digest.readUInt32BE(index) & 0x7fffffff) % 1000000;
      return value.toString().padStart(6, '0') === code;
    });
  }

  private base32Decode(value: string) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = '';
    for (const character of value.replace(/=+$/, '').toUpperCase()) {
      const index = alphabet.indexOf(character);
      if (index < 0) return Buffer.alloc(0);
      bits += index.toString(2).padStart(5, '0');
    }
    const bytes: number[] = [];
    for (let index = 0; index + 8 <= bits.length; index += 8)
      bytes.push(parseInt(bits.slice(index, index + 8), 2));
    return Buffer.from(bytes);
  }

  private async resolveTenant(tenantId?: string, tenantSlug?: string) {
    if (!tenantId && !tenantSlug) {
      throw new BadRequestException('tenantId or tenantSlug is required');
    }
    const tenant = await this.prisma.tenant.findFirst({
      where: tenantId ? { id: tenantId } : { slug: tenantSlug },
    });
    if (!tenant || tenant.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tenant is unavailable');
    }
    return tenant;
  }

  private async withSession(userId: string, user: AuthenticatedUser) {
    const sessionId = randomBytes(24).toString('base64url');
    const activeSessions = await this.prisma.deviceSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (activeSessions.length >= 5) {
      await this.prisma.deviceSession.update({
        where: { id: activeSessions[0].id },
        data: { revokedAt: new Date() },
      });
    }
    await this.prisma.deviceSession.create({
      data: {
        id: sessionId,
        userId,
        tokenHash: sessionId,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { ...user, sessionId };
  }

  private issueToken(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles,
      isPlatformAdmin: user.isPlatformAdmin,
      sessionId: user.sessionId,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      tokenType: 'Bearer',
      user: {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles: user.roles,
        isPlatformAdmin: user.isPlatformAdmin,
        sessionId: user.sessionId,
      },
    };
  }
}
