import { RoleName } from './role.enum';

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: RoleName[];
  isPlatformAdmin?: boolean;
  sessionId?: string;
}
