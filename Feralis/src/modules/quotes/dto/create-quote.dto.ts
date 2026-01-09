// =============================================================================
// FERALIS PLATFORM - CREATE QUOTE DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuotePriority, PaymentTerms } from '@prisma/client';

export class CreateQuoteDto {
  @ApiProperty({
    description: 'Customer ID',
  })
  @IsNotEmpty({ message: 'Customer is required' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({
    description: 'Facility ID',
  })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({
    description: 'Customer contact ID',
  })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({
    description: 'Priority',
    enum: QuotePriority,
    default: QuotePriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(QuotePriority)
  priority?: QuotePriority;

  @ApiPropertyOptional({
    description: 'RFQ number reference',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  rfqNumber?: string;

  @ApiPropertyOptional({
    description: 'RFQ date',
  })
  @IsOptional()
  @IsDateString()
  rfqDate?: string;

  @ApiPropertyOptional({
    description: 'Quote valid until date',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    description: 'Requested delivery date',
  })
  @IsOptional()
  @IsDateString()
  requestedDelivery?: string;

  @ApiPropertyOptional({
    description: 'Payment terms',
    enum: PaymentTerms,
  })
  @IsOptional()
  @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms;

  @ApiPropertyOptional({
    description: 'FOB point',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fobPoint?: string;

  @ApiPropertyOptional({
    description: 'Shipping method',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shippingMethod?: string;

  @ApiPropertyOptional({
    description: 'Ship to address ID',
  })
  @IsOptional()
  @IsUUID()
  shipToAddressId?: string;

  @ApiPropertyOptional({
    description: 'Bill to address ID',
  })
  @IsOptional()
  @IsUUID()
  billToAddressId?: string;

  @ApiPropertyOptional({
    description: 'Sales representative ID',
  })
  @IsOptional()
  @IsUUID()
  salesRepId?: string;

  @ApiPropertyOptional({
    description: 'Discount percentage',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Tax rate (decimal)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional({
    description: 'Shipping amount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @ApiPropertyOptional({
    description: 'Internal notes',
  })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({
    description: 'Customer-visible notes',
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({
    description: 'Terms and conditions',
  })
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}
