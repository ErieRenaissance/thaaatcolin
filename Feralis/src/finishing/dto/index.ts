import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsEnum,
  IsDateString,
  IsArray,
  IsObject,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// =============================================================================
// FINISHING ENUMS
// =============================================================================

export enum FinishType {
  ANODIZE = 'ANODIZE',
  POWDER_COAT = 'POWDER_COAT',
  PAINT = 'PAINT',
  PLATING = 'PLATING',
  PASSIVATION = 'PASSIVATION',
  HEAT_TREAT = 'HEAT_TREAT',
  TUMBLE = 'TUMBLE',
  BEAD_BLAST = 'BEAD_BLAST',
  CHEMICAL_FILM = 'CHEMICAL_FILM',
  NONE = 'NONE',
}

export enum FinishStatus {
  PENDING = 'PENDING',
  IN_QUEUE = 'IN_QUEUE',
  IN_PROCESS = 'IN_PROCESS',
  CURING = 'CURING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  ON_HOLD = 'ON_HOLD',
}

// =============================================================================
// FINISHING PROCESS DTOs
// =============================================================================

export class CreateFinishingProcessDto {
  @ApiProperty({ description: 'Process code' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Process name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Finish type', enum: FinishType })
  @IsEnum(FinishType)
  finishType: FinishType;

  @ApiPropertyOptional({ description: 'Is outsourced' })
  @IsOptional()
  @IsBoolean()
  isOutsourced?: boolean;

  @ApiPropertyOptional({ description: 'Vendor ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Lead time in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  leadTimeDays?: number;

  @ApiPropertyOptional({ description: 'Base price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  basePrice?: number;

  @ApiPropertyOptional({ description: 'Price per square foot' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerSqFt?: number;

  @ApiPropertyOptional({ description: 'Price per unit' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerUnit?: number;

  @ApiPropertyOptional({ description: 'Minimum charge' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumCharge?: number;

  @ApiPropertyOptional({ description: 'Specifications' })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Available color options' })
  @IsOptional()
  @IsArray()
  colorOptions?: string[];

  @ApiPropertyOptional({ description: 'Inspection required' })
  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;

  @ApiPropertyOptional({ description: 'Certification required' })
  @IsOptional()
  @IsBoolean()
  certificationRequired?: boolean;
}

export class UpdateFinishingProcessDto extends PartialType(CreateFinishingProcessDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FinishingProcessQueryDto {
  @ApiPropertyOptional({ description: 'Finish type', enum: FinishType })
  @IsOptional()
  @IsEnum(FinishType)
  finishType?: FinishType;

  @ApiPropertyOptional({ description: 'Is outsourced' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isOutsourced?: boolean;

  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// =============================================================================
// FINISHING JOB DTOs
// =============================================================================

export class CreateFinishingJobDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiPropertyOptional({ description: 'Work order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Order line ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderLineId?: string;

  @ApiProperty({ description: 'Part ID', format: 'uuid' })
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Finishing process ID', format: 'uuid' })
  @IsUUID()
  processId: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Color code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  colorCode?: string;

  @ApiPropertyOptional({ description: 'Color name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  colorName?: string;

  @ApiPropertyOptional({ description: 'Thickness' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  thickness?: string;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Priority (0 = normal)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Is outsourced' })
  @IsOptional()
  @IsBoolean()
  isOutsourced?: boolean;

  @ApiPropertyOptional({ description: 'Vendor ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  estimatedCost?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFinishingJobDto extends PartialType(CreateFinishingJobDto) {
  @ApiPropertyOptional({ description: 'Status', enum: FinishStatus })
  @IsOptional()
  @IsEnum(FinishStatus)
  status?: FinishStatus;

  @ApiPropertyOptional({ description: 'Quantity complete' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityComplete?: number;

  @ApiPropertyOptional({ description: 'Quantity rejected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRejected?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;
}

export class StartFinishingJobDto {
  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Batch number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchNumber?: string;
}

export class CompleteFinishingJobDto {
  @ApiProperty({ description: 'Quantity complete' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityComplete: number;

  @ApiPropertyOptional({ description: 'Quantity rejected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRejected?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  actualCost?: number;

  @ApiPropertyOptional({ description: 'Inspection passed' })
  @IsOptional()
  @IsBoolean()
  inspectionPassed?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ShipToVendorDto {
  @ApiProperty({ description: 'Vendor PO number' })
  @IsString()
  @MaxLength(100)
  vendorPONumber: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceiveFromVendorDto {
  @ApiProperty({ description: 'Quantity received' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityReceived: number;

  @ApiPropertyOptional({ description: 'Quantity rejected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRejected?: number;

  @ApiPropertyOptional({ description: 'Inspection passed' })
  @IsOptional()
  @IsBoolean()
  inspectionPassed?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinishingJobQueryDto {
  @ApiPropertyOptional({ description: 'Facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Work order ID' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Part ID' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Process ID' })
  @IsOptional()
  @IsUUID()
  processId?: string;

  @ApiPropertyOptional({ description: 'Status', enum: FinishStatus })
  @IsOptional()
  @IsEnum(FinishStatus)
  status?: FinishStatus;

  @ApiPropertyOptional({ description: 'Is outsourced' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isOutsourced?: boolean;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
