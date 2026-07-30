import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PRISMA_SERVICE } from '../../prisma/prisma.constants';
import type { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../authenticated-user.interface';
import { JwtPayload } from '../jwt-payload.interface';
import { RoleName } from '../role.enum';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(PRISMA_SERVICE)
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, tenantId: payload.tenantId, status: 'ACTIVE' },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('User account is unavailable');
    }

    if (payload.sessionId) {
      const session = await this.prisma.deviceSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: user.id,
          tokenHash: payload.sessionId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (!session)
        throw new UnauthorizedException('Session is no longer active');
      await this.prisma.deviceSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date() },
      });
    }

    const roles = user.userRoles
      .map(({ role }) => role.name)
      .filter((role): role is RoleName =>
        Object.values(RoleName).includes(role as RoleName),
      );

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles,
      isPlatformAdmin: user.isPlatformAdmin,
      sessionId: payload.sessionId,
    };
  }
}
