// =============================================================================
// FERALIS PLATFORM - CREATE CUSTOMER DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsEnum,
  IsUUID,
  IsBoolean,
  IsNumber,
  IsArray,
  MaxLength,
  Min,
  Matches,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CustomerType, CustomerStatus, PaymentTerms } from '@prisma/client';

export class CreateCustomerDto {
  @ApiProperty({
    description: 'Customer name',
    example: 'Acme Manufacturing',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Unique customer code',
    example: 'ACME001',
  })
  @IsNotEmpty({ message: 'Code is required' })
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/i, {
    message: 'Code must contain only letters, numbers, underscores, and hyphens',
  })
  code: string;

  @ApiPropertyOptional({
    description: 'Legal name',
    example: 'Acme Manufacturing Inc.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({
    description: 'DBA (Doing Business As) name',
    example: 'Acme MFG',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  dbaName?: string;

  @ApiPropertyOptional({
    description: 'Customer type',
    enum: CustomerType,
    default: CustomerType.COMMERCIAL,
  })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional({
    description: 'Customer status',
    enum: CustomerStatus,
    default: CustomerStatus.PROSPECT,
  })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({
    description: 'Industry',
    example: 'Aerospace',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: 'NAICS code',
    example: '332710',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  naicsCode?: string;

  @ApiPropertyOptional({
    description: 'Tax ID / EIN',
    example: '12-3456789',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({
    description: 'Tax exempt status',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  taxExempt?: boolean;

  @ApiPropertyOptional({
    description: 'Tax exempt certificate number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxExemptNumber?: string;

  @ApiPropertyOptional({
    description: 'Website URL',
    example: 'https://acme-mfg.com',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @ApiPropertyOptional({
    description: 'Primary email address',
    example: 'info@acme-mfg.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  primaryEmail?: string;

  @ApiPropertyOptional({
    description: 'Primary phone number',
    example: '+1-555-123-4567',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  primaryPhone?: string;

  @ApiPropertyOptional({
    description: 'Fax number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fax?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    enum: PaymentTerms,
    default: PaymentTerms.NET_30,
  })
  @IsOptional()
  @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms;

  @ApiPropertyOptional({
    description: 'Custom payment days (if paymentTerms is CUSTOM)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  customPaymentDays?: number;

  @ApiPropertyOptional({
    description: 'Credit limit',
    example: 50000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional({
    description: 'Credit hold threshold',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditHoldThreshold?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    default: 'USD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Price level',
    example: 'STANDARD',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  priceLevel?: string;

  @ApiPropertyOptional({
    description: 'Discount percentage',
    example: 5.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Enable customer portal access',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  portalEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'Sales representative user ID',
  })
  @IsOptional()
  @IsUUID()
  salesRepId?: string;

  @ApiPropertyOptional({
    description: 'Territory code',
    example: 'EAST',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  territoryCode?: string;

  @ApiPropertyOptional({
    description: 'Lead source',
    example: 'Trade Show',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  leadSource?: string;

  @ApiPropertyOptional({
    description: 'Quality level',
    example: 'AS9100',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  qualityLevel?: string;

  @ApiPropertyOptional({
    description: 'Required certifications',
    example: ['ISO 9001', 'AS9100'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Export controlled flag',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  exportControlled?: boolean;

  @ApiPropertyOptional({
    description: 'ITAR restricted flag',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  itarRestricted?: boolean;

  @ApiPropertyOptional({
    description: 'Internal notes',
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['preferred', 'aerospace'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
