// =============================================================================
// FERALIS PLATFORM - RESET PASSWORD DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: 'abc123def456...',
  })
  @IsNotEmpty({ message: 'Reset token is required' })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password (min 12 chars, must include uppercase, lowercase, number, special char)',
    example: 'NewSecurePassword123!',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  password: string;
}
