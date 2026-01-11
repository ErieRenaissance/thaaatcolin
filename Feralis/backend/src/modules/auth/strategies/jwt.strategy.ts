// =============================================================================
// FERALIS PLATFORM - JWT STRATEGY
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { TokenPayload } from '../token.service';
import { UserStatus } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.accessSecret'),
    });
  }

  async validate(payload: TokenPayload) {
    // Verify token type
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if session exists in Redis
    const session = await this.redis.getSession(payload.sub, payload.sessionId);
    if (!session) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Get user from database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            facility: true,
          },
        },
        defaultFacility: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    if (user.deletedAt) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // Extract permissions
    const permissions = new Set<string>();
    const roles: string[] = [];
    
    for (const userRole of user.userRoles) {
      roles.push(userRole.role.code);
      for (const rolePermission of userRole.role.rolePermissions) {
        permissions.add(rolePermission.permission.code);
      }
    }

    // Update session activity
    const sessionTimeout = this.configService.get<number>('session.absoluteTimeoutHours') || 12;
    await this.redis.updateSessionActivity(
      user.id,
      payload.sessionId,
      sessionTimeout * 60 * 60,
    );

    // Return user data for request
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName || `${user.firstName} ${user.lastName}`,
      organizationId: user.organizationId,
      organization: user.organization,
      defaultFacilityId: user.defaultFacilityId,
      defaultFacility: user.defaultFacility,
      userType: user.userType,
      roles,
      permissions: Array.from(permissions),
      sessionId: payload.sessionId,
      mfaVerified: payload.mfaVerified,
    };
  }
}
