import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../authenticated-user.interface';
import { RoleName } from '../role.enum';

export function assertPlatformAdmin(user: AuthenticatedUser) {
  if (!user.roles.includes(RoleName.ADMIN) || !user.isPlatformAdmin)
    throw new ForbiddenException('Platform administrator access is required');
}
