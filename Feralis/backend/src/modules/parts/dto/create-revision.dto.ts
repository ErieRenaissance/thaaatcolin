// =============================================================================
// FERALIS PLATFORM - CREATE REVISION DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsUUID,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { RevisionStatus } from '@prisma/client';

export class CreateRevisionDto {
  @ApiProperty({
    description: 'Revision identifier',
    example: 'A',
  })
  @IsNotEmpty({ message: 'Revision is required' })
  @IsString()
  @MaxLength(20)
  revision: string;

  @ApiPropertyOptional({
    description: 'Revision description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Reason for change',
  })
  @IsOptional()
  @IsString()
  changeReason?: string;

  @ApiPropertyOptional({
    description: 'Revision status',
    enum: RevisionStatus,
    default: RevisionStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(RevisionStatus)
  status?: RevisionStatus;

  @ApiPropertyOptional({
    description: 'ECO (Engineering Change Order) number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ecoNumber?: string;

  @ApiPropertyOptional({
    description: 'ECO date',
  })
  @IsOptional()
  @IsDateString()
  ecoDate?: string;

  @ApiPropertyOptional({
    description: 'Effective date',
  })
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: 'CAD file ID',
  })
  @IsOptional()
  @IsUUID()
  cadFileId?: string;

  @ApiPropertyOptional({
    description: 'Drawing file ID',
  })
  @IsOptional()
  @IsUUID()
  drawingFileId?: string;

  @ApiPropertyOptional({
    description: 'STEP file ID',
  })
  @IsOptional()
  @IsUUID()
  stepFileId?: string;
}
