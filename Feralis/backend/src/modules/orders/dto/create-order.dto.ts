// =============================================================================
// FERALIS PLATFORM - CREATE ORDER DTO
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
import { OrderType, QuotePriority, PaymentTerms } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsNotEmpty({ message: 'Customer is required' })
  @IsUUID()
  customerId: string;

  @ApiPropertyOptional({ description: 'Facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Customer contact ID' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Customer PO number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  customerPO?: string;

  @ApiPropertyOptional({ enum: OrderType, default: OrderType.STANDARD })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @ApiPropertyOptional({ enum: QuotePriority, default: QuotePriority.NORMAL })
  @IsOptional()
  @IsEnum(QuotePriority)
  priority?: QuotePriority;

  @ApiPropertyOptional({ description: 'Requested delivery date' })
  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @ApiPropertyOptional({ description: 'Promised delivery date' })
  @IsOptional()
  @IsDateString()
  promisedDate?: string;

  @ApiPropertyOptional({ enum: PaymentTerms })
  @IsOptional()
  @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fobPoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shippingMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrierAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  shipToAddressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  billToAddressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesRepId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productionNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shippingNotes?: string;
}
