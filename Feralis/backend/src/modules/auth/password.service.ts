// =============================================================================
// FERALIS PLATFORM - PASSWORD SERVICE
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import * as zxcvbn from 'zxcvbn';

export interface PasswordValidationResult {
  isValid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
}

@Injectable()
export class PasswordService {
  private readonly logger = new Logger(PasswordService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Hash a password using Argon2id
   */
  async hash(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verify a password against a hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      this.logger.error('Password verification error', error);
      return false;
    }
  }

  /**
   * Validate password strength
   */
  async validateStrength(password: string): Promise<PasswordValidationResult> {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    const minLength = this.configService.get<number>('password.minLength') || 12;
    const requireUppercase = this.configService.get<boolean>('password.requireUppercase') ?? true;
    const requireLowercase = this.configService.get<boolean>('password.requireLowercase') ?? true;
    const requireNumber = this.configService.get<boolean>('password.requireNumber') ?? true;
    const requireSpecial = this.configService.get<boolean>('password.requireSpecial') ?? true;

    // Check minimum length
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    // Check uppercase
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check lowercase
    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check number
    if (requireNumber && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check special character
    if (requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Use zxcvbn for additional analysis
    const result = zxcvbn(password);
    
    if (result.score < 2) {
      errors.push('Password is too weak');
    }

    if (result.feedback.suggestions) {
      suggestions.push(...result.feedback.suggestions);
    }

    if (result.feedback.warning) {
      errors.push(result.feedback.warning);
    }

    return {
      isValid: errors.length === 0,
      score: result.score,
      errors,
      suggestions,
    };
  }

  /**
   * Check if password appears in known data breaches
   * Uses the Have I Been Pwned API with k-anonymity
   */
  async checkBreach(password: string): Promise<boolean> {
    try {
      // Create SHA-1 hash of password
      const hash = crypto
        .createHash('sha1')
        .update(password)
        .digest('hex')
        .toUpperCase();

      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      // Query Have I Been Pwned API
      const response = await fetch(
        `https://api.pwnedpasswords.com/range/${prefix}`,
        {
          headers: {
            'User-Agent': 'Feralis-Platform',
          },
        },
      );

      if (!response.ok) {
        this.logger.warn('Failed to check password breach status');
        return false; // Fail open - don't block login if service is unavailable
      }

      const text = await response.text();
      const hashes = text.split('\r\n');

      // Check if our suffix appears in the response
      for (const line of hashes) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix === suffix) {
          this.logger.debug(`Password found in ${count} breaches`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Error checking password breach', error);
      return false; // Fail open
    }
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const allChars = uppercase + lowercase + numbers + special;

    let password = '';
    
    // Ensure at least one of each required type
    password += uppercase[crypto.randomInt(uppercase.length)];
    password += lowercase[crypto.randomInt(lowercase.length)];
    password += numbers[crypto.randomInt(numbers.length)];
    password += special[crypto.randomInt(special.length)];

    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[crypto.randomInt(allChars.length)];
    }

    // Shuffle the password
    return password
      .split('')
      .sort(() => crypto.randomInt(3) - 1)
      .join('');
  }

  /**
   * Generate a secure random token
   */
  generateToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
