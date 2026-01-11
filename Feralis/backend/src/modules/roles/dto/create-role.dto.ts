// =============================================================================
// FERALIS PLATFORM - CREATE ROLE DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'Production Manager',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    description: 'Role code',
    example: 'PROD_MANAGER',
  })
  @IsNotEmpty({ message: 'Code is required' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_]+$/, {
    message: 'Code must contain only uppercase letters, numbers, and underscores',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Manager responsible for production floor operations',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
