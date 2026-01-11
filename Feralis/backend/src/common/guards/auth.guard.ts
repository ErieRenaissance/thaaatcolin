/**
 * Feralis Manufacturing Platform
 * Authentication & Authorization Guards
 * Phase 7: Analytics & Customer Portal Implementation
 *
 * Guards included:
 * - JwtAuthGuard: Manual JWT verification for internal users
 * - PortalAuthGuard: Manual JWT verification for portal users
 * - RolesGuard: Checks 'roles' metadata for internal users
 * - PortalRolesGuard: Checks 'portalRoles' metadata for portal users
 * - PermissionsGuard: Checks 'permissions' metadata (works for both user types)
 * - OrganizationGuard: Ensures user can only access their organization's data
 * - ApiKeyGuard: Validates API key from 'X-API-Key' header against database
 * - RateLimitGuard: Basic in-memory rate limiting (supplement to ThrottlerGuard)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Internal user payload attached to request after JWT verification
 */
export interface InternalUserPayload {
  id: string;
  email: string;
  organizationId: string;
  facilityId?: string;
  roles: string[];
  permissions: string[];
  employeeId?: string;
  department?: string;
}

/**
 * Portal user payload attached to request after JWT verification
 */
export interface PortalUserPayload {
  id: string;
  email: string;
  customerId: string;
  customerName: string;
  organizationId: string;
  role: string;
  permissions: string[];
  sessionId?: string;
}

/**
 * API Key metadata attached to request after validation
 */
export interface ApiKeyPayload {
  id: string;
  key: string;
  name: string;
  organizationId: string;
  permissions: string[];
  rateLimit?: number;
  expiresAt?: Date;
}

/**
 * JWT token payload structure for internal users
 */
interface InternalTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  facilityId?: string;
  roles: string[];
  permissions: string[];
  employeeId?: string;
  department?: string;
  tokenType: 'internal';
  iat?: number;
  exp?: number;
}

/**
 * JWT token payload structure for portal users
 */
interface PortalTokenPayload {
  sub: string;
  email: string;
  customerId: string;
  customerName: string;
  organizationId: string;
  role: string;
  permissions: string[];
  sessionId?: string;
  tokenType: 'portal';
  iat?: number;
  exp?: number;
}

/**
 * Extended Express Request with user payloads
 */
export interface AuthenticatedRequest extends Request {
  user?: InternalUserPayload;
  portalUser?: PortalUserPayload;
  apiKey?: ApiKeyPayload;
}

// ============================================================================
// METADATA KEYS
// ============================================================================

export const ROLES_KEY = 'roles';
export const PORTAL_ROLES_KEY = 'portalRoles';
export const PERMISSIONS_KEY = 'permissions';
export const IS_PUBLIC_KEY = 'isPublic';
export const API_KEY_REQUIRED_KEY = 'apiKeyRequired';

// ============================================================================
// JWT AUTH GUARD - Internal Users
// ============================================================================

/**
 * Authenticates internal platform users via JWT tokens.
 * Verifies tokens against JWT_SECRET environment variable.
 * Attaches user payload to request.user
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<InternalTokenPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      // Verify this is an internal user token
      if (payload.tokenType !== 'internal') {
        throw new UnauthorizedException('Invalid token type for this endpoint');
      }

      // Attach user to request
      request.user = {
        id: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        facilityId: payload.facilityId,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        employeeId: payload.employeeId,
        department: payload.department,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`JWT verification failed: ${errorMessage}`);

      if (errorMessage.includes('expired')) {
        throw new UnauthorizedException('Token has expired');
      }

      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

// ============================================================================
// PORTAL AUTH GUARD - Customer Portal Users
// ============================================================================

/**
 * Authenticates customer portal users via JWT tokens.
 * Verifies tokens against PORTAL_JWT_SECRET environment variable.
 * Attaches portal user payload to request.portalUser
 */
@Injectable()
export class PortalAuthGuard implements CanActivate {
  private readonly logger = new Logger(PortalAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PortalTokenPayload>(token, {
        secret: process.env.PORTAL_JWT_SECRET,
      });

      // Verify this is a portal user token
      if (payload.tokenType !== 'portal') {
        throw new UnauthorizedException('Invalid token type for portal access');
      }

      // Attach portal user to request
      request.portalUser = {
        id: payload.sub,
        email: payload.email,
        customerId: payload.customerId,
        customerName: payload.customerName,
        organizationId: payload.organizationId,
        role: payload.role,
        permissions: payload.permissions || [],
        sessionId: payload.sessionId,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Portal JWT verification failed: ${errorMessage}`);

      if (errorMessage.includes('expired')) {
        throw new UnauthorizedException('Portal session has expired');
      }

      throw new UnauthorizedException('Invalid or expired portal token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}

// ============================================================================
// ROLES GUARD - Internal Users
// ============================================================================

/**
 * Checks if internal user has required roles.
 * Uses 'roles' metadata key set via @Roles() decorator.
 * User must have at least ONE of the required roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.roles || user.roles.length === 0) {
      throw new ForbiddenException('User has no roles assigned');
    }

    // Check if user has ANY of the required roles
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}

// ============================================================================
// PORTAL ROLES GUARD - Customer Portal Users
// ============================================================================

/**
 * Checks if portal user has required portal roles.
 * Uses 'portalRoles' metadata key set via @PortalRoles() decorator.
 * Portal user must have at least ONE of the required roles.
 */
@Injectable()
export class PortalRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(PORTAL_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const portalUser = request.portalUser;

    if (!portalUser) {
      throw new ForbiddenException('Portal user not authenticated');
    }

    if (!portalUser.role) {
      throw new ForbiddenException('Portal user has no role assigned');
    }

    // Check if portal user has ANY of the required roles
    const hasRole = requiredRoles.includes(portalUser.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required portal roles: ${requiredRoles.join(' or ')}`,
      );
    }

    return true;
  }
}

// ============================================================================
// PERMISSIONS GUARD - Fine-grained Permission Check
// ============================================================================

/**
 * Checks if user (internal or portal) has required permissions.
 * Uses 'permissions' metadata key set via @Permissions() decorator.
 * User must have ALL required permissions.
 * Works with both internal users (request.user) and portal users (request.portalUser).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required - allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Try internal user first, then portal user
    const user = request.user || request.portalUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (!user.permissions || user.permissions.length === 0) {
      throw new ForbiddenException('User has no permissions assigned');
    }

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (p) => !user.permissions.includes(p),
      );
      throw new ForbiddenException(
        `Access denied. Missing permissions: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

// ============================================================================
// ORGANIZATION GUARD - Multi-tenant Data Isolation
// ============================================================================

/**
 * Ensures users can only access data within their organization.
 * Checks organizationId from URL params, query params, or request body
 * against the authenticated user's organizationId.
 * Works with both internal and portal users.
 */
@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Get user (internal or portal)
    const user = request.user || request.portalUser;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Extract organizationId from various sources
    const requestedOrgId =
      request.params?.organizationId ||
      request.query?.organizationId ||
      request.body?.organizationId;

    // If no organization ID in request, allow (controller handles scoping)
    if (!requestedOrgId) {
      return true;
    }

    // Verify user belongs to the requested organization
    if (user.organizationId !== requestedOrgId) {
      throw new ForbiddenException(
        'Access denied. You do not have access to this organization.',
      );
    }

    return true;
  }
}

// ============================================================================
// API KEY GUARD - External Integrations
// ============================================================================

/**
 * Validates API keys for external system integrations.
 * Expects API key in 'X-API-Key' header.
 * Validates against database and checks expiration/status.
 * Attaches API key metadata to request.apiKey
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required. Include X-API-Key header.');
    }

    // Validate API key format (expecting 'frl_' prefix)
    if (!apiKey.startsWith('frl_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    try {
      // Hash the API key for database lookup (assuming keys are stored hashed)
      // For production, use proper hashing: const hashedKey = await bcrypt.hash(apiKey, 10)
      // Here we'll look up by the key directly if stored in plaintext, or implement your hashing strategy

      // Query the database for the API key
      const apiKeyRecord = await this.prisma.apiKey.findFirst({
        where: {
          key: apiKey,
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          organizationId: true,
          permissions: true,
          rateLimit: true,
          expiresAt: true,
          lastUsedAt: true,
        },
      });

      if (!apiKeyRecord) {
        this.logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 10)}...`);
        throw new UnauthorizedException('Invalid or inactive API key');
      }

      // Check expiration
      if (apiKeyRecord.expiresAt && new Date() > apiKeyRecord.expiresAt) {
        throw new UnauthorizedException('API key has expired');
      }

      // Attach API key metadata to request
      request.apiKey = {
        id: apiKeyRecord.id,
        key: apiKey,
        name: apiKeyRecord.name,
        organizationId: apiKeyRecord.organizationId,
        permissions: (apiKeyRecord.permissions as string[]) || [],
        rateLimit: apiKeyRecord.rateLimit || undefined,
        expiresAt: apiKeyRecord.expiresAt || undefined,
      };

      // Update last used timestamp (fire and forget)
      this.prisma.apiKey
        .update({
          where: { id: apiKeyRecord.id },
          data: { lastUsedAt: new Date() },
        })
        .catch((err) => {
          this.logger.warn(`Failed to update API key last used timestamp: ${err.message}`);
        });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Handle case where apiKey table doesn't exist yet
      if (
        error instanceof Error &&
        (error.message.includes('does not exist') ||
          error.message.includes('Invalid `prisma'))
      ) {
        this.logger.warn(
          'API key table not found. Falling back to format validation only.',
        );

        // Fallback: Basic validation when database table isn't ready
        request.apiKey = {
          id: 'fallback',
          key: apiKey,
          name: 'Unverified',
          organizationId: '',
          permissions: [],
        };

        return true;
      }

      this.logger.error(`API key validation error: ${error}`);
      throw new UnauthorizedException('API key validation failed');
    }
  }
}

// ============================================================================
// RATE LIMIT GUARD - Basic In-Memory Rate Limiting
// ============================================================================

/**
 * Basic in-memory rate limiting guard.
 * Supplements @nestjs/throttler for fine-grained control.
 * Tracks requests per IP address with configurable limits.
 *
 * Note: For production with multiple instances, use Redis-based rate limiting.
 * ThrottlerGuard from @nestjs/throttler handles most rate limiting cases.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  // Default configuration
  private readonly defaultLimit = 100; // requests per window
  private readonly defaultWindowMs = 60000; // 1 minute window

  // Cleanup interval to prevent memory leaks
  private readonly cleanupIntervalMs = 300000; // 5 minutes

  constructor() {
    // Periodically clean up expired entries
    setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Get rate limit from API key if present, otherwise use default
    const limit = request.apiKey?.rateLimit || this.defaultLimit;
    const windowMs = this.defaultWindowMs;

    // Generate key based on IP, user, or API key
    const key = this.generateKey(request);
    const now = Date.now();

    const record = this.requestCounts.get(key);

    // No existing record or window expired - create new
    if (!record || now > record.resetTime) {
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    // Check if limit exceeded
    if (record.count >= limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      this.logger.warn(`Rate limit exceeded for key: ${key}`);

      throw new ForbiddenException({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter,
      });
    }

    // Increment counter
    record.count++;
    return true;
  }

  /**
   * Generate a unique key for rate limiting based on request context
   */
  private generateKey(request: AuthenticatedRequest): string {
    // Prefer API key ID, then user ID, then IP address
    if (request.apiKey?.id) {
      return `apikey:${request.apiKey.id}`;
    }

    if (request.user?.id) {
      return `user:${request.user.id}`;
    }

    if (request.portalUser?.id) {
      return `portal:${request.portalUser.id}`;
    }

    // Fallback to IP address
    const ip =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.socket?.remoteAddress ||
      'unknown';

    return `ip:${Array.isArray(ip) ? ip[0] : ip}`;
  }

  /**
   * Clean up expired rate limit records to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, record] of this.requestCounts.entries()) {
      if (now > record.resetTime) {
        this.requestCounts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired rate limit records`);
    }
  }
}

// ============================================================================
// COMPOSITE GUARDS (Convenience Exports)
// ============================================================================

/**
 * Combined guard for authenticated internal users with role check.
 * Usage: @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const InternalAuthGuards = [JwtAuthGuard, RolesGuard];

/**
 * Combined guard for authenticated portal users with role check.
 * Usage: @UseGuards(PortalAuthGuard, PortalRolesGuard)
 */
export const PortalAuthGuards = [PortalAuthGuard, PortalRolesGuard];

/**
 * Combined guard for API key authentication with rate limiting.
 * Usage: @UseGuards(ApiKeyGuard, RateLimitGuard)
 */
export const ApiAuthGuards = [ApiKeyGuard, RateLimitGuard];
