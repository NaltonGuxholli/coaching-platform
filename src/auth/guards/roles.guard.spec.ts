import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RoleName } from '../role.enum';

describe('RolesGuard', () => {
  it('allows requests when no role metadata is configured', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows a user with one required role and denies other roles', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([RoleName.INSTRUCTOR]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: [RoleName.INSTRUCTOR] } }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);

    const deniedContext = {
      ...context,
      switchToHttp: () => ({
        getRequest: () => ({ user: { roles: [RoleName.STUDENT] } }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(deniedContext)).toBe(false);
  });
});
