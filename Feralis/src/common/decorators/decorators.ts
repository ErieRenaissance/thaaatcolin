/**
 * Feralis Manufacturing Platform
 * Custom Decorators
 * Phase 7: Analytics & Customer Portal Implementation
 */

import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

// ============================================================================
// ROLES DECORATOR - Internal Users
// ============================================================================

/**
 * Decorator to specify required roles for an endpoint
 * @param roles - Array of role names required to access the endpoint
 * @example @Roles('ADMIN', 'OPERATIONS_MANAGER')
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

// ============================================================================
// PORTAL ROLES DECORATOR - Customer Portal Users
// ============================================================================

/**
 * Decorator to specify required portal roles for an endpoint
 * @param roles - Array of portal role names required
 * @example @PortalRoles('ADMIN', 'BUYER')
 */
export const PortalRoles = (...roles: string[]) => SetMetadata('portalRoles', roles);

// ============================================================================
// PERMISSIONS DECORATOR
// ============================================================================

/**
 * Decorator to specify required permissions for an endpoint
 * @param permissions - Array of permission codes required
 * @example @Permissions('orders.create', 'orders.view')
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

// ============================================================================
// CURRENT USER DECORATOR - Internal Users
// ============================================================================

/**
 * Parameter decorator to extract the current authenticated user from request
 * @param data - Optional property to extract from user object
 * @example
 * async getProfile(@CurrentUser() user: User) { ... }
 * async getOrgId(@CurrentUser('organizationId') orgId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

// ============================================================================
// CURRENT PORTAL USER DECORATOR - Customer Portal Users
// ============================================================================

/**
 * Parameter decorator to extract the current portal user from request
 * @param data - Optional property to extract from portal user object
 * @example
 * async getOrders(@CurrentPortalUser() user: PortalUser) { ... }
 * async getCustomerId(@CurrentPortalUser('customerId') customerId: string) { ... }
 */
export const CurrentPortalUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.portalUser;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

// ============================================================================
// API KEY DECORATOR
// ============================================================================

/**
 * Parameter decorator to extract API key metadata from request
 */
export const ApiKey = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const apiKey = request.apiKey;

    if (!apiKey) {
      return null;
    }

    return data ? apiKey[data] : apiKey;
  },
);

// ============================================================================
// PUBLIC DECORATOR
// ============================================================================

/**
 * Decorator to mark an endpoint as public (no authentication required)
 * @example @Public()
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ============================================================================
// AUDIT DECORATOR
// ============================================================================

/**
 * Decorator to enable audit logging for an endpoint
 * @param action - The action being performed
 * @param entityType - The type of entity being affected
 * @example @Audit('CREATE', 'ORDER')
 */
export const AUDIT_KEY = 'audit';
export const Audit = (action: string, entityType: string) =>
  SetMetadata(AUDIT_KEY, { action, entityType });

// ============================================================================
// RATE LIMIT DECORATOR
// ============================================================================

/**
 * Decorator to set custom rate limits for an endpoint
 * @param limit - Number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @example @RateLimit(10, 60000) // 10 requests per minute
 */
export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (limit: number, windowMs: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs });

// ============================================================================
// CACHE DECORATOR
// ============================================================================

/**
 * Decorator to enable caching for an endpoint
 * @param ttl - Time to live in seconds
 * @param key - Optional custom cache key prefix
 * @example @Cacheable(300, 'dashboard') // Cache for 5 minutes
 */
export const CACHE_KEY = 'cache';
export const Cacheable = (ttl: number, key?: string) =>
  SetMetadata(CACHE_KEY, { ttl, key });

// ============================================================================
// ORGANIZATION SCOPED DECORATOR
// ============================================================================

/**
 * Decorator to indicate the endpoint should be scoped to user's organization
 * @example @OrganizationScoped()
 */
export const ORG_SCOPED_KEY = 'organizationScoped';
export const OrganizationScoped = () => SetMetadata(ORG_SCOPED_KEY, true);

// ============================================================================
// FACILITY SCOPED DECORATOR
// ============================================================================

/**
 * Decorator to indicate the endpoint should be scoped to user's facility
 * @example @FacilityScoped()
 */
export const FACILITY_SCOPED_KEY = 'facilityScoped';
export const FacilityScoped = () => SetMetadata(FACILITY_SCOPED_KEY, true);

// ============================================================================
// CUSTOMER SCOPED DECORATOR
// ============================================================================

/**
 * Decorator to indicate the endpoint should be scoped to portal user's customer
 * @example @CustomerScoped()
 */
export const CUSTOMER_SCOPED_KEY = 'customerScoped';
export const CustomerScoped = () => SetMetadata(CUSTOMER_SCOPED_KEY, true);

// ============================================================================
// SWAGGER DECORATORS
// ============================================================================

/**
 * Composite decorator for common Swagger documentation patterns
 */
export const ApiPaginatedResponse = (type: any) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    // Apply Swagger decorators
    // This would be implemented with actual Swagger decorators
    return descriptor;
  };
};

// ============================================================================
// REQUEST ID DECORATOR
// ============================================================================

/**
 * Parameter decorator to extract request ID for tracing
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-request-id'] || request.id;
  },
);

// ============================================================================
// IP ADDRESS DECORATOR
// ============================================================================

/**
 * Parameter decorator to extract client IP address
 */
export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.connection?.remoteAddress ||
      request.ip
    );
  },
);

// ============================================================================
// USER AGENT DECORATOR
// ============================================================================

/**
 * Parameter decorator to extract user agent
 */
export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['user-agent'];
  },
);
