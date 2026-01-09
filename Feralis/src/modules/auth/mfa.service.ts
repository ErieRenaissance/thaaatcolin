// =============================================================================
// FERALIS PLATFORM - MFA SERVICE
// =============================================================================

import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as OTPAuth from 'otplib';
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { PasswordService } from './password.service';

export interface MfaSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly passwordService: PasswordService,
  ) {
    // Configure TOTP
    OTPAuth.authenticator.options = {
      window: 1, // Allow 1 step before/after for clock drift
    };
  }

  /**
   * Generate MFA setup data for a user
   */
  async generateSetup(userId: string, email: string): Promise<MfaSetupResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user?.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    const issuer = this.configService.get<string>('mfa.issuer') || 'Feralis';
    const secret = OTPAuth.authenticator.generateSecret();
    
    const otpauthUrl = OTPAuth.authenticator.keyuri(email, issuer, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    };
  }

  /**
   * Enable MFA for a user
   */
  async enable(
    userId: string,
    secret: string,
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string[]> {
    // Verify the code first
    const isValid = this.verifyTotp(secret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.passwordService.hash(code)),
    );

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: secret,
        mfaBackupCodes: hashedBackupCodes,
        mfaVerifiedAt: new Date(),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    await this.auditService.log({
      action: 'MFA_ENABLED',
      entityType: 'User',
      entityId: userId,
      userId,
      organizationId: user?.organizationId,
      ipAddress,
      userAgent,
    });

    return backupCodes;
  }

  /**
   * Disable MFA for a user
   */
  async disable(
    userId: string,
    code: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify the code
    const isValid = this.verifyTotp(user.mfaSecret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Disable MFA
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
        mfaVerifiedAt: null,
      },
    });

    await this.auditService.log({
      action: 'MFA_DISABLED',
      entityType: 'User',
      entityId: userId,
      userId,
      organizationId: user.organizationId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Verify a TOTP code
   */
  verifyTotp(secret: string, code: string): boolean {
    try {
      return OTPAuth.authenticator.verify({ token: code, secret });
    } catch (error) {
      this.logger.error('TOTP verification error', error);
      return false;
    }
  }

  /**
   * Verify a backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.mfaBackupCodes || user.mfaBackupCodes.length === 0) {
      return false;
    }

    // Check each backup code
    for (let i = 0; i < user.mfaBackupCodes.length; i++) {
      const isMatch = await this.passwordService.verify(
        code.replace(/-/g, ''),
        user.mfaBackupCodes[i],
      );

      if (isMatch) {
        // Remove used backup code
        const updatedCodes = [...user.mfaBackupCodes];
        updatedCodes.splice(i, 1);

        await this.prisma.user.update({
          where: { id: userId },
          data: { mfaBackupCodes: updatedCodes },
        });

        await this.auditService.log({
          action: 'MFA_BACKUP_CODE_USED',
          entityType: 'User',
          entityId: userId,
          userId,
          organizationId: user.organizationId,
          metadata: { remainingCodes: updatedCodes.length },
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string, code: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    // Verify current code
    const isValid = this.verifyTotp(user.mfaSecret, code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => this.passwordService.hash(code)),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: hashedBackupCodes },
    });

    await this.auditService.log({
      action: 'MFA_BACKUP_CODES_REGENERATED',
      entityType: 'User',
      entityId: userId,
      userId,
      organizationId: user.organizationId,
    });

    return backupCodes;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const count = this.configService.get<number>('mfa.backupCodesCount') || 10;
    const codes: string[] = [];

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      // Format as XXXX-XXXX
      codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
    }

    return codes;
  }
}
