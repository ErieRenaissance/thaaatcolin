// =============================================================================
// FERALIS PLATFORM - ADJUSTMENT DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustmentDto {
  @ApiProperty({ description: 'Part ID' })
  @IsNotEmpty({ message: 'Part is required' })
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Location ID' })
  @IsNotEmpty({ message: 'Location is required' })
  @IsUUID()
  locationId: string;

  @ApiProperty({ description: 'Adjustment quantity (positive or negative)' })
  @IsNotEmpty({ message: 'Adjustment quantity is required' })
  @Type(() => Number)
  @IsNumber()
  adjustmentQty: number;

  @ApiProperty({ description: 'Reason for adjustment' })
  @IsNotEmpty({ message: 'Reason is required' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;
}
