// =============================================================================
// FERALIS PLATFORM - ROLES DECORATOR
// =============================================================================

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Require specific roles to access a route
 * User must have ANY of the specified roles
 *
 * @example
 * @Roles('ADMIN', 'MANAGER')
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
