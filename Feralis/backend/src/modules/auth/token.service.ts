// =============================================================================
// FERALIS PLATFORM - TOKEN SERVICE
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { User } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  sessionId: string;
  type: 'access' | 'refresh';
  mfaVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenData {
  userId: string;
  family: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate access and refresh tokens
   */
  async generateTokens(
    user: User & { organization?: any },
    sessionId: string,
    family: string,
    mfaVerified: boolean,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokens> {
    const accessPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      sessionId,
      type: 'access',
      mfaVerified,
    };

    const refreshPayload: TokenPayload = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
      sessionId,
      type: 'refresh',
    };

    // Generate access token
    const accessToken = this.jwtService.sign(accessPayload);

    // Generate refresh token with different secret
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: this.configService.get<string>('jwt.refreshExpiration') || '7d',
    });

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: this.hashToken(refreshToken),
        family,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        ipAddress,
        userAgent,
      },
    });

    // Calculate expiration in seconds
    const accessExpiration = this.configService.get<string>('jwt.accessExpiration') || '15m';
    const expiresIn = this.parseExpiration(accessExpiration);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Validate a refresh token
   */
  async validateRefreshToken(token: string): Promise<RefreshTokenData | null> {
    try {
      // Verify JWT
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        return null;
      }

      // Check token in database
      const hashedToken = this.hashToken(token);
      const storedToken = await this.prisma.refreshToken.findFirst({
        where: {
          token: hashedToken,
          isRevoked: false,
          expiresAt: { gte: new Date() },
        },
      });

      if (!storedToken) {
        // Token reuse detected - invalidate entire family
        const existingToken = await this.prisma.refreshToken.findFirst({
          where: { token: hashedToken },
        });

        if (existingToken) {
          this.logger.warn(`Token reuse detected for user ${payload.sub}`);
          await this.revokeTokenFamily(existingToken.family, 'reuse_detected');
        }

        return null;
      }

      return {
        userId: payload.sub,
        family: storedToken.family,
      };
    } catch (error) {
      this.logger.debug('Refresh token validation failed', error);
      return null;
    }
  }

  /**
   * Rotate refresh token (issue new token, invalidate old)
   */
  async rotateRefreshToken(
    oldToken: string,
    family: string,
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokens> {
    // Revoke old token
    await this.revokeRefreshToken(oldToken, 'rotation');

    // Generate new tokens
    const sessionId = uuidv4();
    return this.generateTokens(user, sessionId, family, true, ipAddress, userAgent);
  }

  /**
   * Revoke a refresh token
   */
  async revokeRefreshToken(token: string, reason: string): Promise<void> {
    const hashedToken = this.hashToken(token);
    
    await this.prisma.refreshToken.updateMany({
      where: { token: hashedToken },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: reason,
      },
    });
  }

  /**
   * Revoke all tokens in a family
   */
  async revokeTokenFamily(family: string, reason: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: reason,
      },
    });
  }

  /**
   * Revoke all tokens for a user
   */
  async revokeAllUserTokens(userId: string, reason: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: reason,
      },
    });
  }

  /**
   * Create MFA token (short-lived token for MFA step)
   */
  async createMfaToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    await this.redis.set(`mfa:${token}`, userId, 300); // 5 minutes
    return token;
  }

  /**
   * Validate MFA token
   */
  async validateMfaToken(token: string): Promise<string | null> {
    const userId = await this.redis.get(`mfa:${token}`);
    return userId;
  }

  /**
   * Invalidate MFA token
   */
  async invalidateMfaToken(token: string): Promise<void> {
    await this.redis.del(`mfa:${token}`);
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Hash a token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Parse expiration string to seconds
   */
  private parseExpiration(expiration: string): number {
    const match = expiration.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 900;
    }
  }

  /**
   * Cleanup expired tokens
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isRevoked: true,
            revokedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        ],
      },
    });

    return result.count;
  }
}
