// =============================================================================
// FERALIS PLATFORM - CREATE OPERATION DTO
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  IsNumber,
  IsBoolean,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOperationDto {
  @ApiProperty({
    description: 'Operation sequence number',
    example: 10,
  })
  @IsNotEmpty({ message: 'Operation number is required' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  operationNumber: number;

  @ApiProperty({
    description: 'Operation name',
    example: 'CNC Milling - Rough',
  })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Operation description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Work center ID',
  })
  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @ApiPropertyOptional({
    description: 'Work center code',
    example: 'CNC-01',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  workCenterCode?: string;

  @ApiPropertyOptional({
    description: 'Setup time in minutes',
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  setupTime?: number;

  @ApiPropertyOptional({
    description: 'Run time per unit in minutes',
    example: 5.5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  runTimePerUnit?: number;

  @ApiPropertyOptional({
    description: 'Run time per batch in minutes',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  runTimePerBatch?: number;

  @ApiPropertyOptional({
    description: 'Move time in minutes',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  moveTime?: number;

  @ApiPropertyOptional({
    description: 'Queue time in minutes',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  queueTime?: number;

  @ApiPropertyOptional({
    description: 'Batch size for batch operations',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  batchSize?: number;

  @ApiPropertyOptional({
    description: 'Number of laborers',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  laborCount?: number;

  @ApiPropertyOptional({
    description: 'Labor rate per hour',
    example: 50.00,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  laborRate?: number;

  @ApiPropertyOptional({
    description: 'Machine ID',
  })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({
    description: 'Machine code',
    example: 'HAAS-VF2',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  machineCode?: string;

  @ApiPropertyOptional({
    description: 'Machine rate per hour',
    example: 75.00,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  machineRate?: number;

  @ApiPropertyOptional({
    description: 'NC program ID',
  })
  @IsOptional()
  @IsUUID()
  ncProgramId?: string;

  @ApiPropertyOptional({
    description: 'NC program name',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ncProgramName?: string;

  @ApiPropertyOptional({
    description: 'Tooling required',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  toolingRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Fixture required',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  fixtureRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Fixture ID',
  })
  @IsOptional()
  @IsUUID()
  fixtureId?: string;

  @ApiPropertyOptional({
    description: 'Inspection required',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Inspection type',
    example: 'FIRST_ARTICLE',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  inspectionType?: string;

  @ApiPropertyOptional({
    description: 'Is outside process',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isOutsideProcess?: boolean;

  @ApiPropertyOptional({
    description: 'Outside supplier ID',
  })
  @IsOptional()
  @IsUUID()
  outsideSupplierId?: string;

  @ApiPropertyOptional({
    description: 'Outside process cost',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  outsideCost?: number;

  @ApiPropertyOptional({
    description: 'Outside process lead days',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  outsideLeadDays?: number;

  @ApiPropertyOptional({
    description: 'Work instructions',
  })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({
    description: 'Safety notes',
  })
  @IsOptional()
  @IsString()
  safetyNotes?: string;

  @ApiPropertyOptional({
    description: 'Quality notes',
  })
  @IsOptional()
  @IsString()
  qualityNotes?: string;
}
