// =============================================================================
// FERALIS PLATFORM - AUTH CONTROLLER
// =============================================================================

import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

import { LoginDto } from './dto/login.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MfaSetupDto } from './dto/mfa-setup.dto';
import { MfaEnableDto } from './dto/mfa-enable.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mfaService: MfaService,
  ) {}

  // ===========================================================================
  // AUTH-LOGIN-001: Login
  // ===========================================================================

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 minutes
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    if (result.tokens) {
      // Set refresh token as HTTP-only cookie
      this.setRefreshTokenCookie(response, result.tokens.refreshToken);
    }

    return {
      user: result.user,
      accessToken: result.tokens?.accessToken,
      expiresIn: result.tokens?.expiresIn,
      requiresMfa: result.requiresMfa,
      mfaToken: result.mfaToken,
    };
  }

  // ===========================================================================
  // AUTH-LOGIN-002: MFA Verification
  // ===========================================================================

  @Public()
  @Post('mfa/verify')
  @Throttle({ default: { limit: 5, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA code' })
  @ApiResponse({ status: 200, description: 'MFA verification successful' })
  @ApiResponse({ status: 401, description: 'Invalid code' })
  async verifyMfa(
    @Body() mfaVerifyDto: MfaVerifyDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';

    const result = await this.authService.verifyMfa(
      mfaVerifyDto,
      ipAddress,
      userAgent,
    );

    if (result.tokens) {
      this.setRefreshTokenCookie(response, result.tokens.refreshToken);
    }

    return {
      user: result.user,
      accessToken: result.tokens?.accessToken,
      expiresIn: result.tokens?.expiresIn,
    };
  }

  // ===========================================================================
  // AUTH-LOGOUT-001: Logout
  // ===========================================================================

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: any,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';
    const refreshToken = request.cookies?.refreshToken;

    await this.authService.logout(
      user.id,
      user.sessionId,
      refreshToken,
      ipAddress,
      userAgent,
    );

    // Clear refresh token cookie
    response.clearCookie('refreshToken');

    return { message: 'Logout successful' };
  }

  // ===========================================================================
  // AUTH-TOKEN-001: Refresh Token
  // ===========================================================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';

    // Use cookie if body doesn't contain token
    if (!refreshTokenDto.refreshToken && request.cookies?.refreshToken) {
      refreshTokenDto.refreshToken = request.cookies.refreshToken;
    }

    const tokens = await this.authService.refreshTokens(
      refreshTokenDto,
      ipAddress,
      userAgent,
    );

    this.setRefreshTokenCookie(response, tokens.refreshToken);

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };
  }

  // ===========================================================================
  // AUTH-FORGOT-001: Forgot Password
  // ===========================================================================

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() request: Request,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';

    await this.authService.forgotPassword(
      forgotPasswordDto,
      ipAddress,
      userAgent,
    );

    // Always return success to prevent email enumeration
    return {
      message: 'If an account exists with this email, a reset link has been sent.',
    };
  }

  // ===========================================================================
  // AUTH-RESET-001: Reset Password
  // ===========================================================================

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid token or weak password' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() request: Request,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';

    await this.authService.resetPassword(
      resetPasswordDto,
      ipAddress,
      userAgent,
    );

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  // ===========================================================================
  // MFA Management
  // ===========================================================================

  @Get('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get MFA setup data' })
  async getMfaSetup(@CurrentUser() user: any) {
    const setup = await this.mfaService.generateSetup(user.id, user.email);
    return setup;
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Enable MFA' })
  async enableMfa(
    @CurrentUser() user: any,
    @Body() mfaEnableDto: MfaEnableDto,
    @Req() request: Request,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';

    const backupCodes = await this.mfaService.enable(
      user.id,
      mfaEnableDto.secret,
      mfaEnableDto.code,
      ipAddress,
      userAgent,
    );

    return {
      message: 'MFA enabled successfully',
      backupCodes,
    };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Disable MFA' })
  async disableMfa(
    @CurrentUser() user: any,
    @Body() body: { code: string },
    @Req() request: Request,
  ) {
    const ipAddress = this.getIpAddress(request);
    const userAgent = request.headers['user-agent'] || '';

    await this.mfaService.disable(user.id, body.code, ipAddress, userAgent);

    return { message: 'MFA disabled successfully' };
  }

  @Post('mfa/backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  async regenerateBackupCodes(
    @CurrentUser() user: any,
    @Body() body: { code: string },
  ) {
    const backupCodes = await this.mfaService.regenerateBackupCodes(
      user.id,
      body.code,
    );

    return { backupCodes };
  }

  // ===========================================================================
  // Session Info
  // ===========================================================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user' })
  async getCurrentUser(@CurrentUser() user: any) {
    return { user };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser() user: any) {
    // TODO: Implement session listing
    return { sessions: [] };
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private getIpAddress(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket.remoteAddress ||
      ''
    );
  }

  private setRefreshTokenCookie(response: Response, token: string): void {
    response.cookie('refreshToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }
}
