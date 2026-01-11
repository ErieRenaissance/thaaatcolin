// =============================================================================
// FERALIS PLATFORM - CHANGE PASSWORD DTO
// =============================================================================

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Current password',
    example: 'CurrentPassword123!',
  })
  @IsNotEmpty({ message: 'Current password is required' })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    description: 'New password (min 12 chars, must include uppercase, lowercase, number, special char)',
    example: 'NewSecurePassword123!',
  })
  @IsNotEmpty({ message: 'New password is required' })
  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message: 'Password must include uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
