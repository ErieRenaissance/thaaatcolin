// =============================================================================
// FERALIS PLATFORM - AUTH SERVICE
// =============================================================================

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from './password.service';
import { MfaService } from './mfa.service';
import { TokenService } from './token.service';

import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User, UserStatus } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  type: 'access' | 'refresh';
  sessionId?: string;
  mfaVerified?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResult {
  user: Partial<User>;
  tokens?: AuthTokens;
  requiresMfa?: boolean;
  mfaToken?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
    private readonly mfaService: MfaService,
    private readonly tokenService: TokenService,
  ) {}

  // ===========================================================================
  // AUTH-LOGIN-001: Login
  // ===========================================================================

  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<LoginResult> {
    const { email, password, organizationCode } = loginDto;

    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        organization: organizationCode ? { code: organizationCode } : undefined,
        deletedAt: null,
      },
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
          },
        },
      },
    });

    if (!user) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        metadata: { email, reason: 'User not found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw new ForbiddenException(
        `Account is locked. Try again in ${remainingMinutes} minutes.`,
      );
    }

    // Check account status
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(`Account is ${user.status.toLowerCase()}`);
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verify(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.handleFailedLogin(user, ipAddress, userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login count on successful password verification
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Check if MFA is required
    if (user.mfaEnabled) {
      const mfaToken = await this.tokenService.createMfaToken(user.id);
      
      await this.auditService.log({
        action: 'LOGIN_MFA_REQUIRED',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        organizationId: user.organizationId,
        ipAddress,
        userAgent,
      });

      return {
        user: this.sanitizeUser(user),
        requiresMfa: true,
        mfaToken,
      };
    }

    // Generate tokens and create session
    const tokens = await this.createSession(user, ipAddress, userAgent);

    await this.auditService.log({
      action: 'LOGIN_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress,
      userAgent,
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ===========================================================================
  // AUTH-LOGIN-002: MFA Verification
  // ===========================================================================

  async verifyMfa(
    mfaVerifyDto: MfaVerifyDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<LoginResult> {
    const { mfaToken, code } = mfaVerifyDto;

    // Validate MFA token and get user ID
    const userId = await this.tokenService.validateMfaToken(mfaToken);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired MFA token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
          },
        },
      },
    });

    if (!user || !user.mfaSecret) {
      throw new UnauthorizedException('Invalid MFA configuration');
    }

    // Verify TOTP code
    const isValid = this.mfaService.verifyTotp(user.mfaSecret, code);

    // If TOTP fails, check backup codes
    if (!isValid) {
      const backupCodeUsed = await this.mfaService.verifyBackupCode(
        user.id,
        code,
      );
      if (!backupCodeUsed) {
        await this.auditService.log({
          action: 'MFA_VERIFICATION_FAILED',
          entityType: 'User',
          entityId: user.id,
          userId: user.id,
          organizationId: user.organizationId,
          ipAddress,
          userAgent,
        });
        throw new UnauthorizedException('Invalid verification code');
      }
    }

    // Invalidate MFA token
    await this.tokenService.invalidateMfaToken(mfaToken);

    // Create session
    const tokens = await this.createSession(user, ipAddress, userAgent, true);

    await this.auditService.log({
      action: 'MFA_VERIFICATION_SUCCESS',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress,
      userAgent,
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ===========================================================================
  // AUTH-LOGOUT-001: Logout
  // ===========================================================================

  async logout(
    userId: string,
    sessionId: string,
    refreshToken: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    // Revoke refresh token
    await this.tokenService.revokeRefreshToken(refreshToken, 'logout');

    // Delete session from Redis
    await this.redis.deleteSession(userId, sessionId);

    // Update user record
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    await this.auditService.log({
      action: 'LOGOUT',
      entityType: 'User',
      entityId: userId,
      userId,
      organizationId: user?.organizationId,
      ipAddress,
      userAgent,
    });
  }

  // ===========================================================================
  // AUTH-TOKEN-001: Refresh Token
  // ===========================================================================

  async refreshTokens(
    refreshTokenDto: RefreshTokenDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<AuthTokens> {
    const { refreshToken } = refreshTokenDto;

    // Validate refresh token
    const tokenData = await this.tokenService.validateRefreshToken(refreshToken);
    if (!tokenData) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: tokenData.userId },
      include: {
        organization: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Rotate refresh token
    const newTokens = await this.tokenService.rotateRefreshToken(
      refreshToken,
      tokenData.family,
      user,
      ipAddress,
      userAgent,
    );

    return newTokens;
  }

  // ===========================================================================
  // AUTH-FORGOT-001: Forgot Password
  // ===========================================================================

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      this.logger.log(`Password reset requested for unknown email: ${email}`);
      return;
    }

    // Generate reset token
    const resetToken = await this.tokenService.createPasswordResetToken(user.id);

    // Update user with reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: await this.passwordService.hash(resetToken),
        resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: Send email with reset link
    // For now, log the token (in production, send email)
    this.logger.log(`Password reset token for ${email}: ${resetToken}`);

    await this.auditService.log({
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      organizationId: user.organizationId,
      ipAddress,
      userAgent,
    });
  }

  // ===========================================================================
  // AUTH-RESET-001: Reset Password
  // ===========================================================================

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const { token, password } = resetPasswordDto;

    // Find user by reset token
    const users = await this.prisma.user.findMany({
      where: {
        resetTokenExpires: { gte: new Date() },
        deletedAt: null,
      },
    });

    // Find user with matching token
    let matchedUser: User | null = null;
    for (const user of users) {
      if (user.resetToken) {
        const isMatch = await this.passwordService.verify(token, user.resetToken);
        if (isMatch) {
          matchedUser = user;
          break;
        }
      }
    }

    if (!matchedUser) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Validate password strength
    const passwordValidation = await this.passwordService.validateStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Check password breach
    if (this.configService.get<boolean>('password.checkBreach')) {
      const isBreached = await this.passwordService.checkBreach(password);
      if (isBreached) {
        throw new BadRequestException(
          'This password has been found in a data breach. Please choose a different password.',
        );
      }
    }

    // Hash and save new password
    const passwordHash = await this.passwordService.hash(password);

    await this.prisma.user.update({
      where: { id: matchedUser.id },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        resetToken: null,
        resetTokenExpires: null,
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    // Revoke all refresh tokens
    await this.tokenService.revokeAllUserTokens(matchedUser.id, 'password_reset');

    // Delete all sessions
    await this.redis.deleteAllUserSessions(matchedUser.id);

    await this.auditService.log({
      action: 'PASSWORD_RESET_SUCCESS',
      entityType: 'User',
      entityId: matchedUser.id,
      userId: matchedUser.id,
      organizationId: matchedUser.organizationId,
      ipAddress,
      userAgent,
    });
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private async handleFailedLogin(
    user: User,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const threshold = this.configService.get<number>('lockout.threshold') || 5;
    const lockoutDuration =
      this.configService.get<number>('lockout.durationMinutes') || 30;

    const failedCount = user.failedLoginCount + 1;

    const updateData: any = {
      failedLoginCount: failedCount,
    };

    if (failedCount >= threshold) {
      updateData.lockedUntil = new Date(
        Date.now() + lockoutDuration * 60 * 1000,
      );
      
      await this.auditService.log({
        action: 'ACCOUNT_LOCKED',
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        organizationId: user.organizationId,
        metadata: { failedAttempts: failedCount, lockoutMinutes: lockoutDuration },
        ipAddress,
        userAgent,
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    await this.auditService.log({
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: user.id,
      metadata: { failedAttempts: failedCount },
      ipAddress,
      userAgent,
    });
  }

  private async createSession(
    user: any,
    ipAddress: string,
    userAgent: string,
    mfaVerified = false,
  ): Promise<AuthTokens> {
    const sessionId = uuidv4();
    const tokenFamily = uuidv4();

    // Generate tokens
    const tokens = await this.tokenService.generateTokens(
      user,
      sessionId,
      tokenFamily,
      mfaVerified,
      ipAddress,
      userAgent,
    );

    // Create session in Redis
    const sessionTimeout =
      this.configService.get<number>('session.absoluteTimeoutHours') || 12;
    
    await this.redis.createSession(
      user.id,
      sessionId,
      {
        userId: user.id,
        organizationId: user.organizationId,
        email: user.email,
        ipAddress,
        userAgent,
        mfaVerified,
      },
      sessionTimeout * 60 * 60,
    );

    // Enforce concurrent session limit
    await this.enforceSessionLimit(user.id);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    return tokens;
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const maxSessions =
      this.configService.get<number>('session.maxConcurrent') || 5;
    const sessions = await this.redis.getUserSessions(userId);

    if (sessions.length > maxSessions) {
      // Remove oldest sessions
      const sessionsToRemove = sessions.slice(0, sessions.length - maxSessions);
      for (const sessionId of sessionsToRemove) {
        await this.redis.deleteSession(userId, sessionId);
      }
    }
  }

  private sanitizeUser(user: any): Partial<User> {
    const {
      passwordHash,
      mfaSecret,
      mfaBackupCodes,
      resetToken,
      resetTokenExpires,
      verificationToken,
      verificationExpires,
      ...sanitized
    } = user;

    // Extract permissions
    const permissions = new Set<string>();
    for (const userRole of user.userRoles || []) {
      for (const rolePermission of userRole.role?.rolePermissions || []) {
        permissions.add(rolePermission.permission.code);
      }
    }

    return {
      ...sanitized,
      permissions: Array.from(permissions),
    } as any;
  }
}
