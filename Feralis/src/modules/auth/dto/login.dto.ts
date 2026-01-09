// =============================================================================
// FERALIS PLATFORM - LOGIN DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@feralis.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({
    description: 'Organization code (for multi-tenant login)',
    example: 'FERALIS',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.toUpperCase().trim())
  organizationCode?: string;
}
