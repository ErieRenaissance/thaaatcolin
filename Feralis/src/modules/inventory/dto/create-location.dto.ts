// =============================================================================
// FERALIS PLATFORM - CREATE LOCATION DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LocationType, UnitOfMeasure } from '@prisma/client';

export class CreateLocationDto {
  @ApiPropertyOptional({ description: 'Facility ID (uses default if not provided)' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiProperty({ description: 'Location code', example: 'RAW-A01-01' })
  @IsNotEmpty({ message: 'Code is required' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Location name', example: 'Raw Material Aisle A, Rack 1, Shelf 1' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Location description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: LocationType, default: LocationType.RAW_MATERIAL })
  @IsOptional()
  @IsEnum(LocationType)
  locationType?: LocationType;

  @ApiPropertyOptional({ description: 'Parent location ID for hierarchy' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Zone identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  zone?: string;

  @ApiPropertyOptional({ description: 'Aisle identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  aisle?: string;

  @ApiPropertyOptional({ description: 'Rack identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  rack?: string;

  @ApiPropertyOptional({ description: 'Shelf identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  shelf?: string;

  @ApiPropertyOptional({ description: 'Bin identifier' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bin?: string;

  @ApiPropertyOptional({ description: 'Maximum capacity' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCapacity?: number;

  @ApiPropertyOptional({ enum: UnitOfMeasure })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  capacityUom?: UnitOfMeasure;

  @ApiPropertyOptional({ description: 'Can items be picked from this location', default: true })
  @IsOptional()
  @IsBoolean()
  isPickable?: boolean;

  @ApiPropertyOptional({ description: 'Can items be received into this location', default: true })
  @IsOptional()
  @IsBoolean()
  isReceivable?: boolean;
}
