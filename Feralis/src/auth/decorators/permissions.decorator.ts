// =============================================================================
// FERALIS PLATFORM - PERMISSIONS DECORATOR
// =============================================================================

import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Require specific permissions to access a route
 * User must have ALL specified permissions
 *
 * @example
 * @Permissions('orders.read', 'orders.write')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
