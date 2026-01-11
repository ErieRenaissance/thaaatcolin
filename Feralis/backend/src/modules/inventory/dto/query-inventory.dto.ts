// =============================================================================
// FERALIS PLATFORM - QUERY INVENTORY DTO
// =============================================================================

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryInventoryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Filter by facility' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by location' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Filter by part' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Filter by lot number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Include zero quantity records', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeZeroQty?: boolean = false;

  @ApiPropertyOptional({ description: 'Show only quarantined items', default: false })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  quarantinedOnly?: boolean = false;

  @ApiPropertyOptional({ default: 'part', enum: ['part', 'location', 'quantityOnHand', 'receivedDate'] })
  @IsOptional()
  @IsString()
  sortBy?: string = 'part';

  @ApiPropertyOptional({ default: 'asc', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
