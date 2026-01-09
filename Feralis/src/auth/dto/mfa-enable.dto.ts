// =============================================================================
// FERALIS PLATFORM - MFA ENABLE DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class MfaEnableDto {
  @ApiProperty({
    description: 'Secret from MFA setup',
    example: 'JBSWY3DPEHPK3PXP',
  })
  @IsNotEmpty({ message: 'Secret is required' })
  @IsString()
  secret: string;

  @ApiProperty({
    description: 'TOTP code from authenticator app',
    example: '123456',
  })
  @IsNotEmpty({ message: 'Verification code is required' })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code: string;
}
