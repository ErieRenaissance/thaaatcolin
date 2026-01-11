// =============================================================================
// FERALIS PLATFORM - TRANSFER DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsNumber,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TransferDto {
  @ApiProperty({ description: 'Part ID' })
  @IsNotEmpty({ message: 'Part is required' })
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Source location ID' })
  @IsNotEmpty({ message: 'Source location is required' })
  @IsUUID()
  fromLocationId: string;

  @ApiProperty({ description: 'Destination location ID' })
  @IsNotEmpty({ message: 'Destination location is required' })
  @IsUUID()
  toLocationId: string;

  @ApiProperty({ description: 'Quantity to transfer' })
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

  @ApiPropertyOptional({ description: 'Reason for transfer' })
  @IsOptional()
  @IsString()
  reason?: string;
}
