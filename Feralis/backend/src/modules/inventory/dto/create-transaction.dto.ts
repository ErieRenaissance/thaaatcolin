// =============================================================================
// FERALIS PLATFORM - CREATE TRANSACTION DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UnitOfMeasure } from '@prisma/client';

export class CreateTransactionDto {
  @ApiProperty({ description: 'Part ID' })
  @IsNotEmpty({ message: 'Part is required' })
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Location ID' })
  @IsNotEmpty({ message: 'Location is required' })
  @IsUUID()
  locationId: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ enum: UnitOfMeasure, default: UnitOfMeasure.EACH })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  uom?: UnitOfMeasure;

  @ApiPropertyOptional({ description: 'Unit cost' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ description: 'Reference type (e.g., PO, Order, etc.)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  referenceType?: string;

  @ApiPropertyOptional({ description: 'Reference ID' })
  @IsOptional()
  @IsUUID()
  referenceId?: string;

  @ApiPropertyOptional({ description: 'Reference number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @ApiPropertyOptional({ description: 'Reason/notes' })
  @IsOptional()
  @IsString()
  reason?: string;
}
