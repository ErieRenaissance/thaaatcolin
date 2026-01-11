// =============================================================================
// FERALIS PLATFORM - COPY PART DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  MaxLength,
  Matches,
} from 'class-validator';

export class CopyPartDto {
  @ApiProperty({
    description: 'New part number',
    example: 'PART-002',
  })
  @IsNotEmpty({ message: 'New part number is required' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Part number must contain only letters, numbers, underscores, and hyphens',
  })
  newPartNumber: string;

  @ApiPropertyOptional({
    description: 'New part name (defaults to original name with "(Copy)" suffix)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  newName?: string;

  @ApiPropertyOptional({
    description: 'Include operations in copy',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeOperations?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include materials/BOM in copy',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeMaterials?: boolean = true;
}
