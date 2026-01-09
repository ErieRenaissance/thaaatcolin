// =============================================================================
// FERALIS PLATFORM - CREATE PART DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsInt,
  IsArray,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartType, PartStatus, ProcessType, UnitOfMeasure } from '@prisma/client';

export class CreatePartDto {
  @ApiProperty({
    description: 'Part number (unique identifier)',
    example: 'PART-001',
  })
  @IsNotEmpty({ message: 'Part number is required' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Part number must contain only letters, numbers, underscores, and hyphens',
  })
  partNumber: string;

  @ApiProperty({
    description: 'Part name',
    example: 'Aluminum Bracket Assembly',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Part description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Part type',
    enum: PartType,
    default: PartType.MANUFACTURED,
  })
  @IsOptional()
  @IsEnum(PartType)
  partType?: PartType;

  @ApiPropertyOptional({
    description: 'Part status',
    enum: PartStatus,
    default: PartStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(PartStatus)
  status?: PartStatus;

  @ApiPropertyOptional({
    description: 'Primary process type',
    enum: ProcessType,
  })
  @IsOptional()
  @IsEnum(ProcessType)
  processType?: ProcessType;

  @ApiPropertyOptional({
    description: 'Customer ID (for customer-specific parts)',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Customer part number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerPartNumber?: string;

  @ApiPropertyOptional({
    description: 'Part owned by customer (customer-furnished)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isCustomerOwned?: boolean;

  @ApiPropertyOptional({
    description: 'Unit of measure',
    enum: UnitOfMeasure,
    default: UnitOfMeasure.EACH,
  })
  @IsOptional()
  @IsEnum(UnitOfMeasure)
  uom?: UnitOfMeasure;

  @ApiPropertyOptional({ description: 'Length dimension' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  length?: number;

  @ApiPropertyOptional({ description: 'Width dimension' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  width?: number;

  @ApiPropertyOptional({ description: 'Height dimension' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  height?: number;

  @ApiPropertyOptional({
    description: 'Dimension unit',
    example: 'in',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  dimensionUnit?: string;

  @ApiPropertyOptional({ description: 'Part weight' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({
    description: 'Weight unit',
    example: 'lb',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  weightUnit?: string;

  @ApiPropertyOptional({
    description: 'Material specification',
    example: '6061-T6 Aluminum',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  materialSpec?: string;

  @ApiPropertyOptional({
    description: 'Material grade',
    example: 'T6',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialGrade?: string;

  @ApiPropertyOptional({ description: 'Standard cost' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  standardCost?: number;

  @ApiPropertyOptional({ description: 'Target cost' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  targetCost?: number;

  @ApiPropertyOptional({ description: 'Base selling price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Minimum selling price' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumPrice?: number;

  @ApiPropertyOptional({ description: 'Standard lead time in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  standardLeadDays?: number;

  @ApiPropertyOptional({ description: 'Rush lead time in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  rushLeadDays?: number;

  @ApiPropertyOptional({ description: 'Minimum order quantity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minimumOrderQty?: number;

  @ApiPropertyOptional({ description: 'Order quantity multiple' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderMultiple?: number;

  @ApiPropertyOptional({ description: 'Setup time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  setupTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Cycle time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cycleTimeMinutes?: number;

  @ApiPropertyOptional({ description: 'Scrap factor (decimal)' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  scrapFactor?: number;

  @ApiPropertyOptional({
    description: 'Requires inspection',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Requires certification',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  certificationRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Track inventory',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({
    description: 'Track lot numbers',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trackLots?: boolean;

  @ApiPropertyOptional({
    description: 'Track serial numbers',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  trackSerials?: boolean;

  @ApiPropertyOptional({ description: 'Shelf life in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  shelfLifeDays?: number;

  @ApiPropertyOptional({ description: 'Safety stock quantity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  safetyStock?: number;

  @ApiPropertyOptional({ description: 'Reorder point' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderPoint?: number;

  @ApiPropertyOptional({ description: 'Reorder quantity' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderQty?: number;

  @ApiPropertyOptional({
    description: 'Is purchased part',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPurchased?: boolean;

  @ApiPropertyOptional({ description: 'Purchase lead time in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  purchaseLeadDays?: number;

  @ApiPropertyOptional({
    description: 'Product line',
    example: 'AEROSPACE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productLine?: string;

  @ApiPropertyOptional({
    description: 'Product family',
    example: 'BRACKETS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  productFamily?: string;

  @ApiPropertyOptional({
    description: 'Commodity code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  commodityCode?: string;

  @ApiPropertyOptional({
    description: 'Harmonized tariff code',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  harmonizedCode?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Manufacturing notes' })
  @IsOptional()
  @IsString()
  manufacturingNotes?: string;

  @ApiPropertyOptional({ description: 'Quality notes' })
  @IsOptional()
  @IsString()
  qualityNotes?: string;

  @ApiPropertyOptional({
    description: 'Tags',
    example: ['aerospace', 'critical'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
