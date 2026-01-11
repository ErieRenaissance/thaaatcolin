// =============================================================================
// FERALIS PLATFORM - QUERY PARTS DTO
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
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartStatus, PartType, ProcessType } from '@prisma/client';

export class QueryPartsDto {
  @ApiPropertyOptional({
    description: 'Page number',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Search term (part number, name, description, material)',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: PartStatus,
  })
  @IsOptional()
  @IsEnum(PartStatus)
  status?: PartStatus;

  @ApiPropertyOptional({
    description: 'Filter by part type',
    enum: PartType,
  })
  @IsOptional()
  @IsEnum(PartType)
  partType?: PartType;

  @ApiPropertyOptional({
    description: 'Filter by process type',
    enum: ProcessType,
  })
  @IsOptional()
  @IsEnum(ProcessType)
  processType?: ProcessType;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by product line',
  })
  @IsOptional()
  @IsString()
  productLine?: string;

  @ApiPropertyOptional({
    description: 'Filter by product family',
  })
  @IsOptional()
  @IsString()
  productFamily?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Sort field',
    default: 'partNumber',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'partNumber';

  @ApiPropertyOptional({
    description: 'Sort order',
    default: 'asc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'asc';
}
