// =============================================================================
// FERALIS PLATFORM - LOCAL STRATEGY
// =============================================================================

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';

import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  async validate(email: string, password: string): Promise<any> {
    // This strategy is not used directly - login is handled by AuthService
    // Kept for potential future use
    throw new UnauthorizedException('Use /auth/login endpoint');
  }
}
