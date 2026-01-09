// =============================================================================
// FERALIS PLATFORM - MFA VERIFY DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({
    description: 'MFA token received from login',
    example: 'abc123def456...',
  })
  @IsNotEmpty({ message: 'MFA token is required' })
  @IsString()
  mfaToken: string;

  @ApiProperty({
    description: 'TOTP code from authenticator app or backup code',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Verification code is required' })
  @IsString()
  @Length(6, 9, { message: 'Code must be 6-9 characters' })
  code: string;
}
