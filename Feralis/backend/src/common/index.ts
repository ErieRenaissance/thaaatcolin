/**
 * Common Module Barrel Export
 * 
 * This file serves as the central export point for all common utilities,
 * guards, and decorators used throughout the Feralis platform.
 * 
 * Usage:
 *   import { JwtAuthGuard, Roles, CurrentUser } from '@common';
 *   // or
 *   import { JwtAuthGuard, Roles, CurrentUser } from '../common';
 */

// ============================================================================
// Guards
// ============================================================================
export {
  JwtAuthGuard,
  PortalAuthGuard,
  RolesGuard,
  PortalRolesGuard,
  PermissionsGuard,
  OrganizationGuard,
  ApiKeyGuard,
  RateLimitGuard,
} from './guards/auth.guard';

// ============================================================================
// Decorators
// ============================================================================
export {
  Roles,
  PortalRoles,
  Permissions,
  CurrentUser,
  CurrentPortalUser,
  ApiKey,
  Public,
  Audit,
  RateLimit,
  Cacheable,
  OrganizationScoped,
  FacilityScoped,
  CustomerScoped,
  RequestId,
  ClientIp,
  UserAgent,
} from './decorators/decorators';
