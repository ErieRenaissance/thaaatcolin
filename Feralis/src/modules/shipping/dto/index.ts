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
  IsEmail,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// =============================================================================
// SHIPPING ENUMS
// =============================================================================

export enum ShipmentStatus {
  DRAFT = 'DRAFT',
  PENDING_PICKUP = 'PENDING_PICKUP',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  EXCEPTION = 'EXCEPTION',
  RETURNED = 'RETURNED',
  CANCELLED = 'CANCELLED',
}

export enum ShipmentType {
  STANDARD = 'STANDARD',
  EXPEDITED = 'EXPEDITED',
  OVERNIGHT = 'OVERNIGHT',
  FREIGHT = 'FREIGHT',
  LTL = 'LTL',
  WILL_CALL = 'WILL_CALL',
  COURIER = 'COURIER',
}

export enum CarrierType {
  PARCEL = 'PARCEL',
  LTL = 'LTL',
  FTL = 'FTL',
  COURIER = 'COURIER',
  WILL_CALL = 'WILL_CALL',
}

// =============================================================================
// CARRIER DTOs
// =============================================================================

export class CreateCarrierDto {
  @ApiProperty({ description: 'Carrier code' })
  @IsString()
  @MaxLength(20)
  code: string;

  @ApiProperty({ description: 'Carrier name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Carrier type', enum: CarrierType })
  @IsEnum(CarrierType)
  carrierType: CarrierType;

  @ApiPropertyOptional({ description: 'API enabled' })
  @IsOptional()
  @IsBoolean()
  apiEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Account number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'API key' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiKey?: string;

  @ApiPropertyOptional({ description: 'API secret' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiSecret?: string;

  @ApiPropertyOptional({ description: 'API endpoint' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  apiEndpoint?: string;

  @ApiPropertyOptional({ description: 'Tracking URL template' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  trackingUrlTemplate?: string;

  @ApiPropertyOptional({ description: 'Contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  contactName?: string;

  @ApiPropertyOptional({ description: 'Phone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Email' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UpdateCarrierDto extends PartialType(CreateCarrierDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CarrierQueryDto {
  @ApiPropertyOptional({ description: 'Carrier type', enum: CarrierType })
  @IsOptional()
  @IsEnum(CarrierType)
  carrierType?: CarrierType;

  @ApiPropertyOptional({ description: 'API enabled' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  apiEnabled?: boolean;

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
// CARRIER SERVICE DTOs
// =============================================================================

export class CreateCarrierServiceDto {
  @ApiProperty({ description: 'Service code' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Service name' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Service type', enum: ShipmentType })
  @IsEnum(ShipmentType)
  serviceType: ShipmentType;

  @ApiPropertyOptional({ description: 'Transit days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  transitDays?: number;

  @ApiPropertyOptional({ description: 'Max weight in lbs' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxWeightLbs?: number;

  @ApiPropertyOptional({ description: 'Max length in inches' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxLengthInches?: number;

  @ApiPropertyOptional({ description: 'Base rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  baseRate?: number;

  @ApiPropertyOptional({ description: 'Fuel surcharge percent' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  fuelSurchargePercent?: number;
}

export class UpdateCarrierServiceDto extends PartialType(CreateCarrierServiceDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// =============================================================================
// SHIPMENT DTOs
// =============================================================================

export class ShipToAddressDto {
  @ApiProperty({ description: 'Ship to name' })
  @IsString()
  @MaxLength(200)
  shipToName: string;

  @ApiPropertyOptional({ description: 'Ship to company' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  shipToCompany?: string;

  @ApiProperty({ description: 'Ship to address line 1' })
  @IsString()
  @MaxLength(255)
  shipToAddress1: string;

  @ApiPropertyOptional({ description: 'Ship to address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  shipToAddress2?: string;

  @ApiProperty({ description: 'Ship to city' })
  @IsString()
  @MaxLength(100)
  shipToCity: string;

  @ApiProperty({ description: 'Ship to state' })
  @IsString()
  @MaxLength(100)
  shipToState: string;

  @ApiProperty({ description: 'Ship to postal code' })
  @IsString()
  @MaxLength(20)
  shipToPostalCode: string;

  @ApiPropertyOptional({ description: 'Ship to country', default: 'USA' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  shipToCountry?: string;

  @ApiPropertyOptional({ description: 'Ship to phone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shipToPhone?: string;

  @ApiPropertyOptional({ description: 'Ship to email' })
  @IsOptional()
  @IsEmail()
  shipToEmail?: string;
}

export class CreateShipmentDto extends ShipToAddressDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiPropertyOptional({ description: 'Order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ description: 'Customer ID', format: 'uuid' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ description: 'Carrier ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  carrierId?: string;

  @ApiPropertyOptional({ description: 'Service ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Shipment type', enum: ShipmentType })
  @IsOptional()
  @IsEnum(ShipmentType)
  shipmentType?: ShipmentType;

  @ApiPropertyOptional({ description: 'Requested ship date' })
  @IsOptional()
  @IsDateString()
  requestedShipDate?: string;

  @ApiPropertyOptional({ description: 'Bill to (SHIPPER, RECEIVER, THIRD_PARTY)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  billTo?: string;

  @ApiPropertyOptional({ description: 'Third party account' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  thirdPartyAccount?: string;

  @ApiPropertyOptional({ description: 'Signature required' })
  @IsOptional()
  @IsBoolean()
  signatureRequired?: boolean;

  @ApiPropertyOptional({ description: 'Insurance amount' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  insuranceAmount?: number;

  @ApiPropertyOptional({ description: 'Saturday delivery' })
  @IsOptional()
  @IsBoolean()
  saturdayDelivery?: boolean;

  @ApiPropertyOptional({ description: 'Hold for pickup' })
  @IsOptional()
  @IsBoolean()
  holdForPickup?: boolean;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Package IDs to include' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  packageIds?: string[];
}

export class UpdateShipmentDto extends PartialType(CreateShipmentDto) {
  @ApiPropertyOptional({ description: 'Status', enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Tracking number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Master tracking number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  masterTrackingNumber?: string;

  @ApiPropertyOptional({ description: 'PRO number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  proNumber?: string;

  @ApiPropertyOptional({ description: 'Freight cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  freightCost?: number;

  @ApiPropertyOptional({ description: 'Insurance cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  insuranceCost?: number;

  @ApiPropertyOptional({ description: 'Packaging cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  packagingCost?: number;

  @ApiPropertyOptional({ description: 'Handling cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  handlingCost?: number;

  @ApiPropertyOptional({ description: 'Estimated delivery date' })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}

export class ShipShipmentDto {
  @ApiPropertyOptional({ description: 'Carrier ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  carrierId?: string;

  @ApiPropertyOptional({ description: 'Service ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Tracking number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional({ description: 'Freight cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  freightCost?: number;

  @ApiPropertyOptional({ description: 'Estimated delivery date' })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AddPackagesToShipmentDto {
  @ApiProperty({ description: 'Package IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  packageIds: string[];
}

export class GetRatesDto {
  @ApiProperty({ description: 'Ship to postal code' })
  @IsString()
  @MaxLength(20)
  shipToPostalCode: string;

  @ApiPropertyOptional({ description: 'Ship to country', default: 'USA' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  shipToCountry?: string;

  @ApiProperty({ description: 'Total weight in lbs' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  totalWeightLbs: number;

  @ApiPropertyOptional({ description: 'Package dimensions (for DIM weight)' })
  @IsOptional()
  @IsArray()
  packageDimensions?: { length: number; width: number; height: number }[];
}

export class RecordTrackingEventDto {
  @ApiProperty({ description: 'Event code' })
  @IsString()
  @MaxLength(50)
  eventCode: string;

  @ApiProperty({ description: 'Event description' })
  @IsString()
  @MaxLength(500)
  eventDescription: string;

  @ApiProperty({ description: 'Event timestamp' })
  @IsDateString()
  eventTimestamp: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'State' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ description: 'Postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ description: 'Country' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({ description: 'Signed by' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  signedBy?: string;

  @ApiPropertyOptional({ description: 'Is exception' })
  @IsOptional()
  @IsBoolean()
  isException?: boolean;

  @ApiPropertyOptional({ description: 'Exception code' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  exceptionCode?: string;
}

export class ShipmentQueryDto {
  @ApiPropertyOptional({ description: 'Facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Order ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Carrier ID' })
  @IsOptional()
  @IsUUID()
  carrierId?: string;

  @ApiPropertyOptional({ description: 'Status', enum: ShipmentStatus })
  @IsOptional()
  @IsEnum(ShipmentStatus)
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Shipment type', enum: ShipmentType })
  @IsOptional()
  @IsEnum(ShipmentType)
  shipmentType?: ShipmentType;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Search (shipment number, tracking, PO)' })
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
