/**
 * Feralis Manufacturing Platform
 * Custom Decorators
 *
 * This module provides all custom decorators used throughout the Feralis platform
 * for authentication, authorization, caching, scoping, and request metadata extraction.
 *
 * @module common/decorators
 */

import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';

// ============================================================================
// METADATA KEYS
// ============================================================================

/** Metadata key for roles-based access control */
export const ROLES_KEY = 'roles';

/** Metadata key for portal roles-based access control */
export const PORTAL_ROLES_KEY = 'portalRoles';

/** Metadata key for permission-based access control */
export const PERMISSIONS_KEY = 'permissions';

/** Metadata key for marking routes as public */
export const IS_PUBLIC_KEY = 'isPublic';

/** Metadata key for audit logging configuration */
export const AUDIT_KEY = 'audit';

/** Metadata key for cache configuration */
export const CACHE_KEY = 'cacheable';

/** Metadata key for organization-scoped data access */
export const ORG_SCOPED_KEY = 'organizationScoped';

/** Metadata key for facility-scoped data access */
export const FACILITY_SCOPED_KEY = 'facilityScoped';

/** Metadata key for customer-scoped data access */
export const CUSTOMER_SCOPED_KEY = 'customerScoped';

/** Metadata key for custom rate limiting */
export const RATE_LIMIT_KEY = 'rateLimit';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Configuration options for the Audit decorator
 */
export interface AuditOptions {
  /** The action being performed (e.g., 'CREATE', 'UPDATE', 'DELETE') */
  action: string;
  /** The type of entity being affected (e.g., 'ORDER', 'CUSTOMER', 'PART') */
  entityType: string;
  /** Optional flag to include request body in audit log */
  includeBody?: boolean;
  /** Optional flag to include response in audit log */
  includeResponse?: boolean;
}

/**
 * Configuration options for the Cacheable decorator
 */
export interface CacheOptions {
  /** Time to live in seconds */
  ttl: number;
  /** Optional custom cache key prefix */
  key?: string;
}

/**
 * Configuration options for the RateLimit decorator
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed within the time window */
  limit: number;
  /** Time window in seconds */
  ttl: number;
}

// ============================================================================
// AUTHORIZATION DECORATORS
// ============================================================================

/**
 * Decorator to specify required roles for accessing an endpoint.
 * Used with RolesGuard to enforce role-based access control for internal users.
 * User must have at least ONE of the specified roles to gain access.
 *
 * @param roles - Array of role names required to access the endpoint
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * // Require ADMIN or OPERATIONS_MANAGER role
 * @Roles('ADMIN', 'OPERATIONS_MANAGER')
 * @Get('sensitive-data')
 * async getSensitiveData() { ... }
 *
 * @example
 * // Apply to entire controller
 * @Roles('ADMIN')
 * @Controller('admin')
 * export class AdminController { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Decorator to specify required portal roles for accessing an endpoint.
 * Used with PortalRolesGuard to enforce role-based access control for customer portal users.
 * Portal user must have at least ONE of the specified roles to gain access.
 *
 * @param roles - Array of portal role names required (e.g., 'ADMIN', 'BUYER', 'VIEWER')
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * // Require portal ADMIN or BUYER role
 * @PortalRoles('ADMIN', 'BUYER')
 * @Post('place-order')
 * async placeOrder() { ... }
 */
export const PortalRoles = (...roles: string[]) =>
  SetMetadata(PORTAL_ROLES_KEY, roles);

/**
 * Decorator to specify required permissions for accessing an endpoint.
 * Used with PermissionsGuard to enforce fine-grained permission-based access control.
 * User must have ALL specified permissions to gain access.
 *
 * @param permissions - Array of permission codes required (e.g., 'orders.create', 'orders.view')
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * // Require both read and write permissions
 * @Permissions('orders.read', 'orders.write')
 * @Put(':id')
 * async updateOrder() { ... }
 *
 * @example
 * // Single permission
 * @Permissions('reports.export')
 * @Get('export')
 * async exportReport() { ... }
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to mark an endpoint as public, bypassing authentication.
 * Routes marked with @Public() will not require a valid JWT token or API key.
 * Use sparingly and only for truly public endpoints.
 *
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * @Public()
 * @Get('health')
 * async healthCheck() {
 *   return { status: 'ok' };
 * }
 *
 * @example
 * @Public()
 * @Post('auth/login')
 * async login(@Body() credentials: LoginDto) { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// ============================================================================
// SCOPING DECORATORS
// ============================================================================

/**
 * Decorator to indicate that endpoint data should be scoped to the user's organization.
 * Used with OrganizationScopeInterceptor to automatically filter data by organizationId.
 * Ensures multi-tenant data isolation.
 *
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * @OrganizationScoped()
 * @Get()
 * async findAll() {
 *   // Data will be automatically filtered by user's organizationId
 *   return this.ordersService.findAll();
 * }
 */
export const OrganizationScoped = () => SetMetadata(ORG_SCOPED_KEY, true);

/**
 * Decorator to indicate that endpoint data should be scoped to the user's facility.
 * Used with FacilityScopeInterceptor to automatically filter data by facilityId.
 * Useful for facility-specific operations in multi-facility organizations.
 *
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * @FacilityScoped()
 * @Get('inventory')
 * async getInventory() {
 *   // Data will be automatically filtered by user's current facilityId
 *   return this.inventoryService.findAll();
 * }
 */
export const FacilityScoped = () => SetMetadata(FACILITY_SCOPED_KEY, true);

/**
 * Decorator to indicate that endpoint data should be scoped to the portal user's customer.
 * Used with CustomerScopeInterceptor to automatically filter data by customerId.
 * Ensures customer portal users only see their own data.
 *
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * @CustomerScoped()
 * @Get('my-orders')
 * async getMyOrders() {
 *   // Portal users will only see orders for their customer account
 *   return this.ordersService.findAll();
 * }
 */
export const CustomerScoped = () => SetMetadata(CUSTOMER_SCOPED_KEY, true);

// ============================================================================
// CACHING & RATE LIMITING DECORATORS
// ============================================================================

/**
 * Decorator to mark an endpoint response as cacheable.
 * Used with CacheInterceptor to implement response caching.
 * Reduces database load and improves response times for frequently accessed data.
 *
 * @param ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param key - Optional custom cache key prefix for namespacing
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * // Cache for 5 minutes with default key
 * @Cacheable(300)
 * @Get('dashboard')
 * async getDashboard() { ... }
 *
 * @example
 * // Cache for 1 hour with custom key prefix
 * @Cacheable(3600, 'product-catalog')
 * @Get('products')
 * async getProducts() { ... }
 *
 * @example
 * // Cache with default TTL (5 minutes)
 * @Cacheable()
 * @Get('config')
 * async getConfig() { ... }
 */
export const Cacheable = (ttl: number = 300, key?: string) =>
  SetMetadata(CACHE_KEY, { ttl, key } as CacheOptions);

/**
 * Decorator to set custom rate limits for an endpoint.
 * Overrides default rate limiting configuration for specific endpoints.
 * Used with RateLimitGuard to enforce request throttling.
 *
 * @param limit - Maximum number of requests allowed within the time window
 * @param ttl - Time window in seconds
 * @returns MethodDecorator & ClassDecorator
 *
 * @example
 * // Allow 10 requests per minute
 * @RateLimit(10, 60)
 * @Post('send-email')
 * async sendEmail() { ... }
 *
 * @example
 * // Allow 100 requests per hour for expensive operations
 * @RateLimit(100, 3600)
 * @Post('generate-report')
 * async generateReport() { ... }
 *
 * @example
 * // Strict limit for authentication endpoints
 * @RateLimit(5, 300)
 * @Post('login')
 * async login() { ... }
 */
export const RateLimit = (limit: number, ttl: number) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, ttl } as RateLimitOptions);

// ============================================================================
// AUDIT DECORATOR
// ============================================================================

/**
 * Decorator to enable audit logging for an endpoint.
 * Captures detailed information about who performed what action on which entity.
 * Used with AuditInterceptor for compliance and traceability.
 *
 * @param options - Audit configuration options or action string
 * @param entityType - Entity type (when using simple two-argument form)
 * @returns MethodDecorator
 *
 * @example
 * // Simple usage with action and entity type
 * @Audit('CREATE', 'ORDER')
 * @Post()
 * async createOrder() { ... }
 *
 * @example
 * // Full options object
 * @Audit({
 *   action: 'UPDATE',
 *   entityType: 'CUSTOMER',
 *   includeBody: true,
 *   includeResponse: false
 * })
 * @Put(':id')
 * async updateCustomer() { ... }
 *
 * @example
 * // Delete operation audit
 * @Audit('DELETE', 'PART')
 * @Delete(':id')
 * async deletePart() { ... }
 */
export function Audit(options: AuditOptions): MethodDecorator;
export function Audit(action: string, entityType: string): MethodDecorator;
export function Audit(
  optionsOrAction: AuditOptions | string,
  entityType?: string,
): MethodDecorator {
  const options: AuditOptions =
    typeof optionsOrAction === 'string'
      ? { action: optionsOrAction, entityType: entityType! }
      : optionsOrAction;

  return SetMetadata(AUDIT_KEY, options);
}

// ============================================================================
// PARAMETER DECORATORS - USER EXTRACTION
// ============================================================================

/**
 * Parameter decorator to extract the current authenticated internal user from the request.
 * The user object is populated by the AuthGuard after JWT validation.
 *
 * @param data - Optional property name to extract from the user object
 * @returns The full user object or specific property if data is specified
 *
 * @example
 * // Get full user object
 * @Get('profile')
 * async getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 *
 * @example
 * // Get specific user property
 * @Get('my-org')
 * async getMyOrg(@CurrentUser('organizationId') orgId: string) {
 *   return this.orgService.findById(orgId);
 * }
 *
 * @example
 * // Get user ID directly
 * @Post('activity')
 * async logActivity(@CurrentUser('id') userId: string) {
 *   return this.activityService.log(userId);
 * }
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

/**
 * Parameter decorator to extract the current authenticated portal user from the request.
 * The portal user object is populated by the PortalAuthGuard after JWT validation.
 * Portal users are external customer users with different authentication context.
 *
 * @param data - Optional property name to extract from the portal user object
 * @returns The full portal user object or specific property if data is specified
 *
 * @example
 * // Get full portal user object
 * @Get('my-account')
 * async getMyAccount(@CurrentPortalUser() portalUser: PortalUser) {
 *   return portalUser;
 * }
 *
 * @example
 * // Get customer ID from portal user
 * @Get('my-orders')
 * async getMyOrders(@CurrentPortalUser('customerId') customerId: string) {
 *   return this.ordersService.findByCustomer(customerId);
 * }
 *
 * @example
 * // Get portal user's contact ID
 * @Get('my-contact')
 * async getMyContact(@CurrentPortalUser('contactId') contactId: string) {
 *   return this.contactService.findById(contactId);
 * }
 */
export const CurrentPortalUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const portalUser = request.portalUser;

    if (!portalUser) {
      return null;
    }

    return data ? portalUser[data] : portalUser;
  },
);

/**
 * Parameter decorator to extract API key metadata from the request.
 * The API key object is populated by the ApiKeyGuard after key validation.
 * Contains information about the API key including scopes and associated organization.
 *
 * @param data - Optional property name to extract from the API key object
 * @returns The full API key object or specific property if data is specified
 *
 * @example
 * // Get full API key object
 * @Get('api-info')
 * async getApiInfo(@ApiKey() apiKey: ApiKeyEntity) {
 *   return { name: apiKey.name, scopes: apiKey.scopes };
 * }
 *
 * @example
 * // Get API key's organization ID
 * @Post('webhook')
 * async handleWebhook(@ApiKey('organizationId') orgId: string) {
 *   return this.webhookService.process(orgId);
 * }
 *
 * @example
 * // Get API key scopes for authorization checks
 * @Get('data')
 * async getData(@ApiKey('scopes') scopes: string[]) {
 *   // Custom scope-based logic
 * }
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
// PARAMETER DECORATORS - REQUEST METADATA
// ============================================================================

/**
 * Parameter decorator to extract the request ID from headers.
 * Looks for X-Request-ID header or falls back to internally generated request ID.
 * Useful for distributed tracing and log correlation.
 *
 * @returns The request ID string
 *
 * @example
 * @Post('process')
 * async process(
 *   @RequestId() requestId: string,
 *   @Body() data: ProcessDto
 * ) {
 *   this.logger.log(`Processing request ${requestId}`);
 *   return this.service.process(data, requestId);
 * }
 *
 * @example
 * // Include request ID in error responses
 * @Get(':id')
 * async findOne(
 *   @Param('id') id: string,
 *   @RequestId() requestId: string
 * ) {
 *   const item = await this.service.findById(id);
 *   if (!item) {
 *     throw new NotFoundException(`Item not found. Request ID: ${requestId}`);
 *   }
 *   return item;
 * }
 */
export const RequestId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      request.id ||
      'unknown'
    );
  },
);

/**
 * Parameter decorator to extract the client's IP address from the request.
 * Handles proxied requests by checking X-Forwarded-For header first.
 * Useful for rate limiting, geolocation, and audit logging.
 *
 * @returns The client IP address string
 *
 * @example
 * @Post('login')
 * async login(
 *   @Body() credentials: LoginDto,
 *   @ClientIp() ipAddress: string
 * ) {
 *   return this.authService.login(credentials, ipAddress);
 * }
 *
 * @example
 * // Log access with IP for security auditing
 * @Get('sensitive-data')
 * async getSensitiveData(
 *   @CurrentUser() user: User,
 *   @ClientIp() ip: string
 * ) {
 *   this.auditService.logAccess(user.id, 'SENSITIVE_DATA', ip);
 *   return this.dataService.getSensitive();
 * }
 */
export const ClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Check X-Forwarded-For header (handles proxy/load balancer scenarios)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      // X-Forwarded-For can contain multiple IPs; the first is the original client
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // Check X-Real-IP header (common with nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fall back to connection remote address or Express's ip property
    return (
      request.ip ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  },
);

/**
 * Parameter decorator to extract the User-Agent header from the request.
 * Useful for analytics, device detection, and security logging.
 *
 * @returns The User-Agent string or undefined if not present
 *
 * @example
 * @Post('login')
 * async login(
 *   @Body() credentials: LoginDto,
 *   @UserAgent() userAgent: string
 * ) {
 *   return this.authService.login(credentials, { userAgent });
 * }
 *
 * @example
 * // Track user sessions with device info
 * @Post('session')
 * async createSession(
 *   @CurrentUser() user: User,
 *   @UserAgent() userAgent: string,
 *   @ClientIp() ip: string
 * ) {
 *   return this.sessionService.create({
 *     userId: user.id,
 *     userAgent,
 *     ipAddress: ip
 *   });
 * }
 */
export const UserAgent = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['user-agent'];
  },
);

// ============================================================================
// UTILITY DECORATORS
// ============================================================================

/**
 * Parameter decorator to extract a custom header value from the request.
 * Generic decorator for accessing any header not covered by specific decorators.
 *
 * @param headerName - The name of the header to extract (case-insensitive)
 * @returns The header value string or undefined if not present
 *
 * @example
 * @Get('data')
 * async getData(
 *   @Header('X-Custom-Header') customValue: string,
 *   @Header('Accept-Language') language: string
 * ) {
 *   return this.service.getData({ customValue, language });
 * }
 */
export const Header = createParamDecorator(
  (headerName: string, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers[headerName.toLowerCase()];
  },
);

/**
 * Parameter decorator to extract organization ID from the current user context.
 * Convenience decorator that extracts organizationId from either internal or portal user.
 *
 * @returns The organization ID string or null if not authenticated
 *
 * @example
 * @Get('org-data')
 * async getOrgData(@OrganizationId() orgId: string) {
 *   return this.service.findByOrg(orgId);
 * }
 */
export const OrganizationId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.user?.organizationId ||
      request.portalUser?.organizationId ||
      null
    );
  },
);

/**
 * Parameter decorator to extract facility ID from the current user context.
 * Returns the user's currently selected/assigned facility.
 *
 * @returns The facility ID string or null if not set
 *
 * @example
 * @Get('facility-inventory')
 * async getInventory(@FacilityId() facilityId: string) {
 *   return this.inventoryService.findByFacility(facilityId);
 * }
 */
export const FacilityId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.user?.facilityId ||
      request.headers['x-facility-id'] ||
      null
    );
  },
);
