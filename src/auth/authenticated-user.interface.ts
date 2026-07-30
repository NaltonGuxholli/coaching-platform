import { RoleName } from './role.enum';

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  roles: RoleName[];
  isPlatformAdmin?: boolean;
  sessionId?: string;
}
