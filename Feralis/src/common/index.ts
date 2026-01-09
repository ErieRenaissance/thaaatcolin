/**
 * Feralis Manufacturing Platform
 * Common Module Exports
 * Phase 7: Analytics & Customer Portal Implementation
 */

// Guards
export * from './guards/auth.guard';

// Decorators
export * from './decorators/decorators';

// Re-export specific items for convenience
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
