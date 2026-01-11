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
// PACKAGING ENUMS
// =============================================================================

export enum PackageType {
  BOX = 'BOX',
  CRATE = 'CRATE',
  PALLET = 'PALLET',
  ENVELOPE = 'ENVELOPE',
  TUBE = 'TUBE',
  CUSTOM = 'CUSTOM',
  BULK = 'BULK',
}

export enum PackageStatus {
  OPEN = 'OPEN',
  SEALED = 'SEALED',
  LABELED = 'LABELED',
  STAGED = 'STAGED',
  SHIPPED = 'SHIPPED',
}

// =============================================================================
// PACKAGE SPECIFICATION DTOs
// =============================================================================

export class CreatePackageSpecDto {
  @ApiProperty({ description: 'Package spec code' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Package spec name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Package type', enum: PackageType })
  @IsEnum(PackageType)
  packageType: PackageType;

  @ApiPropertyOptional({ description: 'Length in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lengthInches?: number;

  @ApiPropertyOptional({ description: 'Width in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  widthInches?: number;

  @ApiPropertyOptional({ description: 'Height in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  heightInches?: number;

  @ApiPropertyOptional({ description: 'Max weight in lbs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxWeightLbs?: number;

  @ApiPropertyOptional({ description: 'Tare weight in lbs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  tareWeightLbs?: number;

  @ApiPropertyOptional({ description: 'Unit cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  unitCost?: number;

  @ApiPropertyOptional({ description: 'Material type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  materialType?: string;

  @ApiPropertyOptional({ description: 'Requires dunnage' })
  @IsOptional()
  @IsBoolean()
  requiresDunnage?: boolean;

  @ApiPropertyOptional({ description: 'Dunnage type' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  dunnageType?: string;

  @ApiPropertyOptional({ description: 'Is returnable' })
  @IsOptional()
  @IsBoolean()
  isReturnable?: boolean;

  @ApiPropertyOptional({ description: 'Additional specifications' })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;
}

export class UpdatePackageSpecDto extends PartialType(CreatePackageSpecDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class PackageSpecQueryDto {
  @ApiPropertyOptional({ description: 'Package type', enum: PackageType })
  @IsOptional()
  @IsEnum(PackageType)
  packageType?: PackageType;

  @ApiPropertyOptional({ description: 'Is returnable' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isReturnable?: boolean;

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
// PART PACKAGING DTOs
// =============================================================================

export class CreatePartPackagingDto {
  @ApiProperty({ description: 'Part ID', format: 'uuid' })
  @IsUUID()
  partId: string;

  @ApiPropertyOptional({ description: 'Customer ID (for customer-specific packaging)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty({ description: 'Package spec ID', format: 'uuid' })
  @IsUUID()
  packageSpecId: string;

  @ApiProperty({ description: 'Quantity per package' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantityPerPackage: number;

  @ApiPropertyOptional({ description: 'Is default for this part' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Packing instructions' })
  @IsOptional()
  @IsString()
  packingInstructions?: string;

  @ApiPropertyOptional({ description: 'Labeling requirements' })
  @IsOptional()
  @IsObject()
  labelingRequired?: Record<string, any>;
}

export class UpdatePartPackagingDto extends PartialType(CreatePartPackagingDto) {}

// =============================================================================
// PACKAGE DTOs
// =============================================================================

export class CreatePackageDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiPropertyOptional({ description: 'Order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Package spec ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  packageSpecId?: string;

  @ApiPropertyOptional({ description: 'Length in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lengthInches?: number;

  @ApiPropertyOptional({ description: 'Width in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  widthInches?: number;

  @ApiPropertyOptional({ description: 'Height in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  heightInches?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePackageDto extends PartialType(CreatePackageDto) {
  @ApiPropertyOptional({ description: 'Status', enum: PackageStatus })
  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @ApiPropertyOptional({ description: 'Weight in lbs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weightLbs?: number;

  @ApiPropertyOptional({ description: 'Barcode' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  barcode?: string;
}

export class SealPackageDto {
  @ApiProperty({ description: 'Weight in lbs' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  weightLbs: number;

  @ApiPropertyOptional({ description: 'Length in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  lengthInches?: number;

  @ApiPropertyOptional({ description: 'Width in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  widthInches?: number;

  @ApiPropertyOptional({ description: 'Height in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  heightInches?: number;
}

export class AddPackageContentDto {
  @ApiProperty({ description: 'Part ID', format: 'uuid' })
  @IsUUID()
  partId: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'Order line ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderLineId?: string;

  @ApiPropertyOptional({ description: 'Work order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Serial numbers' })
  @IsOptional()
  @IsArray()
  serialNumbers?: string[];
}

export class PackageQueryDto {
  @ApiPropertyOptional({ description: 'Facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Order ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Shipment ID' })
  @IsOptional()
  @IsUUID()
  shipmentId?: string;

  @ApiPropertyOptional({ description: 'Status', enum: PackageStatus })
  @IsOptional()
  @IsEnum(PackageStatus)
  status?: PackageStatus;

  @ApiPropertyOptional({ description: 'Search (package number, barcode)' })
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
