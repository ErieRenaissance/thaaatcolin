/**
 * Feralis Manufacturing Platform
 * Authentication Guards
 * Phase 7: Analytics & Customer Portal Implementation
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

// ============================================================================
// JWT AUTH GUARD - Internal Users
// ============================================================================

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'feralis-secret-key',
      });

      // Verify this is an internal user token
      if (payload.tokenType !== 'internal') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Attach user to request
      request['user'] = {
        id: payload.sub,
        email: payload.email,
        organizationId: payload.organizationId,
        facilityId: payload.facilityId,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// ============================================================================
// PORTAL AUTH GUARD - Customer Portal Users
// ============================================================================

@Injectable()
export class PortalAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.PORTAL_JWT_SECRET || 'feralis-portal-secret',
      });

      // Verify this is a portal user token
      if (payload.tokenType !== 'portal') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Attach portal user to request
      request['portalUser'] = {
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
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}

// ============================================================================
// ROLES GUARD - Internal Users
// ============================================================================

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      throw new ForbiddenException('User has no roles assigned');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

// ============================================================================
// PORTAL ROLES GUARD - Customer Portal Users
// ============================================================================

@Injectable()
export class PortalRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('portalRoles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.portalUser;

    if (!user || !user.role) {
      throw new ForbiddenException('Portal user has no role assigned');
    }

    const hasRole = requiredRoles.includes(user.role);
    
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required portal roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

// ============================================================================
// PERMISSIONS GUARD - Fine-grained Permission Check
// ============================================================================

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user || request.portalUser;

    if (!user || !user.permissions) {
      throw new ForbiddenException('User has no permissions');
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

// ============================================================================
// ORGANIZATION GUARD - Ensure User Belongs to Organization
// ============================================================================

@Injectable()
export class OrganizationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const organizationId = request.params.organizationId || request.body?.organizationId;

    if (organizationId && user.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to this organization');
    }

    return true;
  }
}

// ============================================================================
// API KEY GUARD - For External Integrations
// ============================================================================

@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // TODO: Validate API key against database
    // const apiKeyRecord = await this.apiKeyService.validate(apiKey);
    // if (!apiKeyRecord || !apiKeyRecord.isActive) {
    //   throw new UnauthorizedException('Invalid or inactive API key');
    // }

    // For now, basic validation
    if (!apiKey.startsWith('frl_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    // Attach API key metadata to request
    request['apiKey'] = {
      key: apiKey,
      // organizationId: apiKeyRecord.organizationId,
      // permissions: apiKeyRecord.permissions,
    };

    return true;
  }
}

// ============================================================================
// RATE LIMIT GUARD
// ============================================================================

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly requests = new Map<string, { count: number; resetTime: number }>();
  private readonly limit = 100; // requests per window
  private readonly windowMs = 60000; // 1 minute

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = this.getKey(request);
    const now = Date.now();

    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (record.count >= this.limit) {
      throw new ForbiddenException('Rate limit exceeded. Please try again later.');
    }

    record.count++;
    return true;
  }

  private getKey(request: Request): string {
    const user = request['user'] || request['portalUser'];
    if (user) {
      return `user:${user.id}`;
    }
    return `ip:${request.ip}`;
  }
}
