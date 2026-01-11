import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// =============================================================================
// WORK CENTER DTOs
// =============================================================================

export class CreateWorkCenterDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiProperty({ description: 'Work center code', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Work center name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Hourly rate', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  hourlyRate?: number;

  @ApiPropertyOptional({ description: 'Setup rate', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  setupRate?: number;

  @ApiPropertyOptional({ description: 'Overhead rate', minimum: 0 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  overheadRate?: number;

  @ApiPropertyOptional({ description: 'Capacity hours per day', minimum: 0, maximum: 24 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(24)
  @Type(() => Number)
  capacityHoursDay?: number;

  @ApiPropertyOptional({ description: 'Default efficiency percentage', minimum: 0, maximum: 200 })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(200)
  @Type(() => Number)
  defaultEfficiency?: number;

  @ApiPropertyOptional({ description: 'Maximum input queue size' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  inputQueueMax?: number;

  @ApiPropertyOptional({ description: 'Maximum output queue size' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  outputQueueMax?: number;
}

export class UpdateWorkCenterDto extends PartialType(CreateWorkCenterDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class WorkCenterQueryDto {
  @ApiPropertyOptional({ description: 'Filter by facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class WorkCenterResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() facilityId: string;
  @ApiProperty() code: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() hourlyRate?: number;
  @ApiPropertyOptional() setupRate?: number;
  @ApiPropertyOptional() overheadRate?: number;
  @ApiPropertyOptional() capacityHoursDay?: number;
  @ApiProperty() defaultEfficiency: number;
  @ApiPropertyOptional() inputQueueMax?: number;
  @ApiPropertyOptional() outputQueueMax?: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() machineCount?: number;
}
