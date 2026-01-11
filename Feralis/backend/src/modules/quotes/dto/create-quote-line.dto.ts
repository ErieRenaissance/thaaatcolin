// =============================================================================
// FERALIS PLATFORM - CREATE QUOTE LINE DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsInt,
  IsEnum,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitOfMeasure } from '@prisma/client';

export class CreateQuoteLineDto {
  @ApiPropertyOptional({
    description: 'Line number (auto-assigned if not provided)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  lineNumber?: number;

  @ApiPropertyOptional({
    description: 'Part ID',
  })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({
    description: 'Part number (if not using partId)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  partNumber?: string;

  @ApiPropertyOptional({
    description: 'Part revision',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  partRevision?: string;

  @ApiProperty({
    description: 'Line item description',
  })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({
    description: 'Quantity',
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    enum: UnitOfMeasure,
    default: UnitOfMeasure.EACH,
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  uom?: UnitOfMeasure;

  @ApiProperty({
    description: 'Unit price',
  })
  @IsNotEmpty({ message: 'Unit price is required' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: 'Unit cost (for margin calculation)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({
    description: 'Line discount percentage',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Requested delivery date',
  })
  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @ApiPropertyOptional({
    description: 'Promised delivery date',
  })
  @IsOptional()
  @IsDateString()
  promisedDate?: string;

  @ApiPropertyOptional({
    description: 'Lead time in days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  leadDays?: number;

  @ApiPropertyOptional({
    description: 'Line notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
