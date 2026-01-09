// =============================================================================
// FERALIS PLATFORM - CREATE ADDRESS DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { AddressType } from '@prisma/client';

export class CreateAddressDto {
  @ApiPropertyOptional({
    description: 'Address type',
    enum: AddressType,
    default: AddressType.BOTH,
  })
  @IsOptional()
  @IsEnum(AddressType)
  addressType?: AddressType;

  @ApiPropertyOptional({
    description: 'Address name/label',
    example: 'Headquarters',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: 'Address line 1',
    example: '123 Industrial Blvd',
  })
  @IsNotEmpty({ message: 'Address line 1 is required' })
  @IsString()
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({
    description: 'Address line 2',
    example: 'Suite 200',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiPropertyOptional({
    description: 'Address line 3',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine3?: string;

  @ApiProperty({
    description: 'City',
    example: 'Pittsburgh',
  })
  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({
    description: 'State/Province',
    example: 'PA',
  })
  @IsNotEmpty({ message: 'State is required' })
  @IsString()
  @MaxLength(100)
  state: string;

  @ApiProperty({
    description: 'Postal code',
    example: '15201',
  })
  @IsNotEmpty({ message: 'Postal code is required' })
  @IsString()
  @MaxLength(20)
  postalCode: string;

  @ApiPropertyOptional({
    description: 'Country code (ISO 3166-1 alpha-3)',
    default: 'USA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  country?: string;

  @ApiPropertyOptional({
    description: 'Attention line',
    example: 'Receiving Dept.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  attention?: string;

  @ApiPropertyOptional({
    description: 'Phone number at this address',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Shipping notes',
  })
  @IsOptional()
  @IsString()
  shippingNotes?: string;

  @ApiPropertyOptional({
    description: 'Preferred carrier',
    example: 'UPS',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredCarrier?: string;

  @ApiPropertyOptional({
    description: 'Carrier account number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrierAccount?: string;

  @ApiPropertyOptional({
    description: 'Preferred shipping method',
    example: 'GROUND',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shippingMethod?: string;

  @ApiPropertyOptional({
    description: 'Set as default billing address',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefaultBilling?: boolean;

  @ApiPropertyOptional({
    description: 'Set as default shipping address',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefaultShipping?: boolean;
}
