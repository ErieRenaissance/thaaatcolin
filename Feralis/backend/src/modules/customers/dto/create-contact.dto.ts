// =============================================================================
// FERALIS PLATFORM - CREATE CONTACT DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEmail,
  IsBoolean,
  IsArray,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ContactType } from '@prisma/client';

export class CreateContactDto {
  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Smith',
  })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({
    description: 'Job title',
    example: 'Purchasing Manager',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({
    description: 'Department',
    example: 'Procurement',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({
    description: 'Email address',
    example: 'john.smith@acme.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional({
    description: 'Phone number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Mobile number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobile?: string;

  @ApiPropertyOptional({
    description: 'Fax number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  fax?: string;

  @ApiPropertyOptional({
    description: 'Contact types',
    enum: ContactType,
    isArray: true,
    default: [ContactType.PRIMARY],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ContactType, { each: true })
  contactTypes?: ContactType[];

  @ApiPropertyOptional({
    description: 'Is primary contact',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Enable portal access',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  portalAccess?: boolean;

  @ApiPropertyOptional({
    description: 'Preferred contact method',
    example: 'EMAIL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  preferredMethod?: string;

  @ApiPropertyOptional({
    description: 'Do not contact flag',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  doNotContact?: boolean;

  @ApiPropertyOptional({
    description: 'Email opt out',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  emailOptOut?: boolean;

  @ApiPropertyOptional({
    description: 'Notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
