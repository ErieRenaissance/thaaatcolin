// =============================================================================
// FERALIS PLATFORM - CREATE MATERIAL DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitOfMeasure } from '@prisma/client';

export class CreateMaterialDto {
  @ApiPropertyOptional({
    description: 'Line number (auto-generated if not provided)',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber?: number;

  @ApiPropertyOptional({
    description: 'Material/Part ID (reference to another part)',
  })
  @IsOptional()
  @IsUUID()
  materialId?: string;

  @ApiPropertyOptional({
    description: 'Material code',
    example: 'AL-6061-T6',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialCode?: string;

  @ApiProperty({
    description: 'Material name',
    example: '6061-T6 Aluminum Bar Stock',
  })
  @IsNotEmpty({ message: 'Material name is required' })
  @IsString()
  @MaxLength(255)
  materialName: string;

  @ApiPropertyOptional({
    description: 'Material specification',
    example: 'AMS 4027',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  materialSpec?: string;

  @ApiProperty({
    description: 'Quantity per unit',
    example: 1.5,
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityPer: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    enum: UnitOfMeasure,
    default: UnitOfMeasure.EACH,
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  uom?: UnitOfMeasure;

  @ApiPropertyOptional({
    description: 'Stock length',
    example: 12.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({
    description: 'Stock width',
    example: 4.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({
    description: 'Stock thickness',
    example: 0.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  thickness?: number;

  @ApiPropertyOptional({
    description: 'Stock diameter (for round stock)',
    example: 2.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  diameter?: number;

  @ApiPropertyOptional({
    description: 'Dimension unit',
    example: 'in',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  dimensionUnit?: string;

  @ApiPropertyOptional({
    description: 'Scrap factor (decimal)',
    example: 0.05,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  scrapFactor?: number;

  @ApiPropertyOptional({
    description: 'Setup scrap quantity',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  setupScrap?: number;

  @ApiPropertyOptional({
    description: 'Unit cost',
    example: 15.50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Operation number where material is consumed',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operationNumber?: number;

  @ApiPropertyOptional({
    description: 'Material type',
    example: 'RAW_MATERIAL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  materialType?: string;

  @ApiPropertyOptional({
    description: 'Is phantom (pass-through)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPhantom?: boolean;

  @ApiPropertyOptional({
    description: 'Notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
