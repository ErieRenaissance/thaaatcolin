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
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// =============================================================================
// LABOR ENUMS
// =============================================================================

export enum LaborActivityType {
  SETUP = 'SETUP',
  RUN = 'RUN',
  REWORK = 'REWORK',
  INSPECTION = 'INSPECTION',
  WAIT = 'WAIT',
  TEARDOWN = 'TEARDOWN',
}

// =============================================================================
// LABOR ENTRY DTOs
// =============================================================================

export class StartLaborEntryDto {
  @ApiProperty({ description: 'Work order ID', format: 'uuid' })
  @IsUUID()
  workOrderId: string;

  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiPropertyOptional({ description: 'Machine ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiProperty({ description: 'Activity type', enum: LaborActivityType })
  @IsEnum(LaborActivityType)
  activityType: LaborActivityType;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class EndLaborEntryDto {
  @ApiPropertyOptional({ description: 'Break time in minutes' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  breakMinutes?: number;

  @ApiPropertyOptional({ description: 'Quantity good' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityGood?: number;

  @ApiPropertyOptional({ description: 'Quantity scrap' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityScrap?: number;

  @ApiPropertyOptional({ description: 'Quantity rework' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRework?: number;

  @ApiPropertyOptional({ description: 'Scrap reason code', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  scrapReasonCode?: string;

  @ApiPropertyOptional({ description: 'Scrap notes' })
  @IsOptional()
  @IsString()
  scrapNotes?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateManualLaborEntryDto {
  @ApiProperty({ description: 'Work order ID', format: 'uuid' })
  @IsUUID()
  workOrderId: string;

  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiPropertyOptional({ description: 'Machine ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiProperty({ description: 'Operator ID', format: 'uuid' })
  @IsUUID()
  operatorId: string;

  @ApiProperty({ description: 'Activity type', enum: LaborActivityType })
  @IsEnum(LaborActivityType)
  activityType: LaborActivityType;

  @ApiProperty({ description: 'Start time' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ description: 'End time' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ description: 'Break time in minutes' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  breakMinutes?: number;

  @ApiPropertyOptional({ description: 'Quantity good' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityGood?: number;

  @ApiPropertyOptional({ description: 'Quantity scrap' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityScrap?: number;

  @ApiPropertyOptional({ description: 'Quantity rework' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRework?: number;

  @ApiPropertyOptional({ description: 'Scrap reason code', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  scrapReasonCode?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateLaborEntryDto {
  @ApiPropertyOptional({ description: 'Start time' })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time' })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Break time in minutes' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  breakMinutes?: number;

  @ApiPropertyOptional({ description: 'Quantity good' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityGood?: number;

  @ApiPropertyOptional({ description: 'Quantity scrap' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityScrap?: number;

  @ApiPropertyOptional({ description: 'Quantity rework' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRework?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class LaborEntryQueryDto {
  @ApiPropertyOptional({ description: 'Filter by work order ID' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Filter by operation ID' })
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Filter by operator ID' })
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional({ description: 'Filter by activity type', enum: LaborActivityType })
  @IsOptional()
  @IsEnum(LaborActivityType)
  activityType?: LaborActivityType;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

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

// =============================================================================
// SCRAP RECORD DTOs
// =============================================================================

export class CreateScrapRecordDto {
  @ApiProperty({ description: 'Work order ID', format: 'uuid' })
  @IsUUID()
  workOrderId: string;

  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiPropertyOptional({ description: 'Labor entry ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  laborEntryId?: string;

  @ApiProperty({ description: 'Quantity scrapped' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Reason code', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  reasonCode: string;

  @ApiPropertyOptional({ description: 'Reason description' })
  @IsOptional()
  @IsString()
  reasonDescription?: string;

  @ApiPropertyOptional({ description: 'Root cause analysis' })
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Corrective action' })
  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @ApiPropertyOptional({ description: 'Preventive action' })
  @IsOptional()
  @IsString()
  preventiveAction?: string;

  @ApiPropertyOptional({ description: 'Material cost' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  materialCost?: number;

  @ApiPropertyOptional({ description: 'Labor cost' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}

export class UpdateScrapRecordDto {
  @ApiPropertyOptional({ description: 'Root cause analysis' })
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Corrective action' })
  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @ApiPropertyOptional({ description: 'Preventive action' })
  @IsOptional()
  @IsString()
  preventiveAction?: string;

  @ApiPropertyOptional({ description: 'NCR number', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ncrNumber?: string;
}

export class ScrapRecordQueryDto {
  @ApiPropertyOptional({ description: 'Filter by work order ID' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Filter by operation ID' })
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional({ description: 'Filter by reason code' })
  @IsOptional()
  @IsString()
  reasonCode?: string;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

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

// =============================================================================
// PRODUCTION SCHEDULE DTOs
// =============================================================================

export class CreateScheduleSlotDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiProperty({ description: 'Machine ID', format: 'uuid' })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiProperty({ description: 'Work order ID', format: 'uuid' })
  @IsUUID()
  workOrderId: string;

  @ApiProperty({ description: 'Scheduled start time' })
  @IsDateString()
  scheduledStart: string;

  @ApiProperty({ description: 'Scheduled end time' })
  @IsDateString()
  scheduledEnd: string;

  @ApiPropertyOptional({ description: 'Setup time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  setupMinutes?: number;

  @ApiPropertyOptional({ description: 'Run time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  runMinutes?: number;

  @ApiPropertyOptional({ description: 'Teardown time in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  teardownMinutes?: number;

  @ApiPropertyOptional({ description: 'Priority (lower = higher priority)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: 'Sequence number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sequenceNumber?: number;
}

export class UpdateScheduleSlotDto {
  @ApiPropertyOptional({ description: 'Machine ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Scheduled start time' })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({ description: 'Scheduled end time' })
  @IsOptional()
  @IsDateString()
  scheduledEnd?: string;

  @ApiPropertyOptional({ description: 'Priority' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;

  @ApiPropertyOptional({ description: 'Sequence number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sequenceNumber?: number;
}

export class LockScheduleSlotDto {
  @ApiProperty({ description: 'Lock reason', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  reason: string;
}

export class BulkScheduleDto {
  @ApiProperty({ description: 'Operations to schedule', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  operationIds: string[];

  @ApiProperty({ description: 'Machine ID', format: 'uuid' })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: 'Start date/time' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Scheduling mode' })
  @IsOptional()
  @IsString()
  mode?: 'forward' | 'backward';
}

export class AutoScheduleDto {
  @ApiPropertyOptional({ description: 'Facility ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Work order IDs to schedule', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  workOrderIds?: string[];

  @ApiProperty({ description: 'Horizon date (schedule up to this date)' })
  @IsDateString()
  horizonDate: string;

  @ApiPropertyOptional({ description: 'Scheduling strategy' })
  @IsOptional()
  @IsString()
  strategy?: 'earliest_due_date' | 'shortest_job_first' | 'critical_ratio' | 'priority';

  @ApiPropertyOptional({ description: 'Consider machine capabilities' })
  @IsOptional()
  @IsBoolean()
  considerCapabilities?: boolean;

  @ApiPropertyOptional({ description: 'Allow overtime' })
  @IsOptional()
  @IsBoolean()
  allowOvertime?: boolean;
}

export class ScheduleQueryDto {
  @ApiPropertyOptional({ description: 'Filter by facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Filter by work order ID' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Filter by locked status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({ description: 'Filter by completed status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isCompleted?: boolean;

  @ApiPropertyOptional({ description: 'Filter by conflict status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  hasConflict?: boolean;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

// =============================================================================
// RESPONSE DTOs
// =============================================================================

export class LaborEntryResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workOrderId: string;
  @ApiProperty() operationId: string;
  @ApiPropertyOptional() machineId?: string;
  @ApiProperty() operatorId: string;
  @ApiProperty() activityType: LaborActivityType;
  @ApiProperty() startTime: Date;
  @ApiPropertyOptional() endTime?: Date;
  @ApiPropertyOptional() durationMinutes?: number;
  @ApiProperty() breakMinutes: number;
  @ApiProperty() quantityGood: number;
  @ApiProperty() quantityScrap: number;
  @ApiProperty() quantityRework: number;
  @ApiPropertyOptional() scrapReasonCode?: string;
  @ApiPropertyOptional() laborCost?: number;
  @ApiProperty() isActive: boolean;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional() operator?: any;
  @ApiPropertyOptional() workOrder?: any;
  @ApiPropertyOptional() operation?: any;
  @ApiPropertyOptional() machine?: any;
}

export class ScrapRecordResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() workOrderId: string;
  @ApiProperty() operationId: string;
  @ApiPropertyOptional() laborEntryId?: string;
  @ApiProperty() quantity: number;
  @ApiProperty() reasonCode: string;
  @ApiPropertyOptional() reasonDescription?: string;
  @ApiPropertyOptional() rootCause?: string;
  @ApiPropertyOptional() correctiveAction?: string;
  @ApiPropertyOptional() preventiveAction?: string;
  @ApiPropertyOptional() materialCost?: number;
  @ApiPropertyOptional() laborCost?: number;
  @ApiPropertyOptional() totalCost?: number;
  @ApiPropertyOptional() ncrNumber?: string;
  @ApiProperty() photoUrls: string[];
  @ApiProperty() reportedBy: string;
  @ApiProperty() reportedAt: Date;
  @ApiPropertyOptional() reviewedBy?: string;
  @ApiPropertyOptional() reviewedAt?: Date;
  @ApiProperty() createdAt: Date;
}

export class ProductionScheduleResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() facilityId: string;
  @ApiProperty() machineId: string;
  @ApiProperty() operationId: string;
  @ApiProperty() workOrderId: string;
  @ApiProperty() scheduledStart: Date;
  @ApiProperty() scheduledEnd: Date;
  @ApiPropertyOptional() setupMinutes?: number;
  @ApiPropertyOptional() runMinutes?: number;
  @ApiPropertyOptional() teardownMinutes?: number;
  @ApiProperty() priority: number;
  @ApiPropertyOptional() sequenceNumber?: number;
  @ApiProperty() isLocked: boolean;
  @ApiPropertyOptional() lockedBy?: string;
  @ApiPropertyOptional() lockedAt?: Date;
  @ApiPropertyOptional() lockReason?: string;
  @ApiProperty() isStarted: boolean;
  @ApiProperty() isCompleted: boolean;
  @ApiPropertyOptional() actualStart?: Date;
  @ApiPropertyOptional() actualEnd?: Date;
  @ApiProperty() hasConflict: boolean;
  @ApiPropertyOptional() conflictReason?: string;
  @ApiProperty() createdAt: Date;
  @ApiPropertyOptional() machine?: any;
  @ApiPropertyOptional() operation?: any;
  @ApiPropertyOptional() workOrder?: any;
}

export class MachineCapacityDto {
  @ApiProperty() machineId: string;
  @ApiProperty() machineName: string;
  @ApiProperty() date: string;
  @ApiProperty() availableMinutes: number;
  @ApiProperty() scheduledMinutes: number;
  @ApiProperty() utilizationPercent: number;
  @ApiProperty() slots: ProductionScheduleResponseDto[];
}

export class SchedulingConflictDto {
  @ApiProperty() slotId: string;
  @ApiProperty() conflictType: string;
  @ApiProperty() conflictingSlotId: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional() suggestedResolution?: string;
}
