// =============================================================================
// FERALIS PLATFORM - CREATE REQUIREMENT DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class CreateRequirementDto {
  @ApiProperty({
    description: 'Requirement category',
    example: 'QUALITY',
  })
  @IsNotEmpty({ message: 'Category is required' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiProperty({
    description: 'Requirement name',
    example: 'Certificate of Conformance Required',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Brief description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Full requirement text',
    example: 'All shipments must include a Certificate of Conformance signed by quality manager.',
  })
  @IsNotEmpty({ message: 'Requirement text is required' })
  @IsString()
  requirement: string;

  @ApiPropertyOptional({
    description: 'Is this a mandatory requirement',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({
    description: 'Applies to quotes',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  appliesToQuotes?: boolean;

  @ApiPropertyOptional({
    description: 'Applies to orders',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  appliesToOrders?: boolean;

  @ApiPropertyOptional({
    description: 'Applies to parts',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  appliesToParts?: boolean;

  @ApiPropertyOptional({
    description: 'Effective date',
  })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: 'Expiration date',
  })
  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}
