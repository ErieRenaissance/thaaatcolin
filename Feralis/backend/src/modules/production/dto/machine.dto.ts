import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsEnum,
  IsDateString,
  IsObject,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// =============================================================================
// MACHINE ENUMS
// =============================================================================

export enum MachineType {
  CNC_MILL = 'CNC_MILL',
  CNC_LATHE = 'CNC_LATHE',
  CNC_ROUTER = 'CNC_ROUTER',
  LASER_CUTTER = 'LASER_CUTTER',
  PLASMA_CUTTER = 'PLASMA_CUTTER',
  WATERJET = 'WATERJET',
  PRESS_BRAKE = 'PRESS_BRAKE',
  PUNCH_PRESS = 'PUNCH_PRESS',
  WELDING = 'WELDING',
  GRINDING = 'GRINDING',
  EDM = 'EDM',
  INSPECTION = 'INSPECTION',
  OTHER = 'OTHER',
}

export enum MachineStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  SETUP = 'SETUP',
  BREAKDOWN = 'BREAKDOWN',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

export enum DowntimeType {
  PLANNED = 'PLANNED',
  UNPLANNED = 'UNPLANNED',
  CHANGEOVER = 'CHANGEOVER',
  BREAK = 'BREAK',
  NO_WORK = 'NO_WORK',
  MATERIAL_SHORTAGE = 'MATERIAL_SHORTAGE',
  QUALITY_HOLD = 'QUALITY_HOLD',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  PREDICTIVE = 'PREDICTIVE',
  EMERGENCY = 'EMERGENCY',
  CALIBRATION = 'CALIBRATION',
  INSPECTION = 'INSPECTION',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum AlarmSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  FAULT = 'FAULT',
  CRITICAL = 'CRITICAL',
}

export enum AlarmState {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  CLEARED = 'CLEARED',
}

// =============================================================================
// MACHINE DTOs
// =============================================================================

export class CreateMachineDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiPropertyOptional({ description: 'Work center ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @ApiProperty({ description: 'Machine code', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  machineCode: string;

  @ApiProperty({ description: 'Machine name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Manufacturer', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  manufacturer?: string;

  @ApiPropertyOptional({ description: 'Model', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ description: 'Serial number', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiProperty({ description: 'Machine type', enum: MachineType })
  @IsEnum(MachineType)
  machineType: MachineType;

  @ApiPropertyOptional({ description: 'Control type', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  controlType?: string;

  @ApiPropertyOptional({ description: 'Purchase date' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @ApiPropertyOptional({ description: 'Install date' })
  @IsOptional()
  @IsDateString()
  installDate?: string;

  @ApiPropertyOptional({ description: 'Warranty expiry date' })
  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

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

  @ApiPropertyOptional({ description: 'Floor position X coordinate' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  locationX?: number;

  @ApiPropertyOptional({ description: 'Floor position Y coordinate' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  locationY?: number;

  @ApiPropertyOptional({ description: 'Floor section', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  floorSection?: string;

  @ApiPropertyOptional({ description: 'Enable telemetry' })
  @IsOptional()
  @IsBoolean()
  telemetryEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Telemetry endpoint URL', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  telemetryEndpoint?: string;

  @ApiPropertyOptional({ description: 'Telemetry protocol', maxLength: 50 })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  telemetryProtocol?: string;

  @ApiPropertyOptional({ description: 'Maintenance interval in days' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maintenanceIntervalDays?: number;

  @ApiPropertyOptional({ description: 'Machine specifications (JSON)' })
  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Machine capabilities (JSON)' })
  @IsOptional()
  @IsObject()
  capabilities?: Record<string, any>;
}

export class UpdateMachineDto extends PartialType(CreateMachineDto) {
  @ApiPropertyOptional({ description: 'Is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMachineStatusDto {
  @ApiProperty({ description: 'New machine status', enum: MachineStatus })
  @IsEnum(MachineStatus)
  status: MachineStatus;

  @ApiPropertyOptional({ description: 'Current operator ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @ApiPropertyOptional({ description: 'Current work order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Current operation ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  operationId?: string;
}

export class MachineQueryDto {
  @ApiPropertyOptional({ description: 'Filter by facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by work center ID' })
  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @ApiPropertyOptional({ description: 'Filter by machine type', enum: MachineType })
  @IsOptional()
  @IsEnum(MachineType)
  machineType?: MachineType;

  @ApiPropertyOptional({ description: 'Filter by status', enum: MachineStatus })
  @IsOptional()
  @IsEnum(MachineStatus)
  status?: MachineStatus;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Filter by telemetry enabled' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  telemetryEnabled?: boolean;

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
  limit?: number = 20;
}

// =============================================================================
// MACHINE ALARM DTOs
// =============================================================================

export class CreateMachineAlarmDto {
  @ApiProperty({ description: 'Machine ID', format: 'uuid' })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: 'Alarm code', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  alarmCode: string;

  @ApiProperty({ description: 'Alarm text', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  alarmText: string;

  @ApiProperty({ description: 'Severity', enum: AlarmSeverity })
  @IsEnum(AlarmSeverity)
  severity: AlarmSeverity;

  @ApiPropertyOptional({ description: 'Work order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Operation ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class AcknowledgeAlarmDto {
  @ApiPropertyOptional({ description: 'Notes about acknowledgement' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class MachineAlarmQueryDto {
  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Filter by severity', enum: AlarmSeverity })
  @IsOptional()
  @IsEnum(AlarmSeverity)
  severity?: AlarmSeverity;

  @ApiPropertyOptional({ description: 'Filter by state', enum: AlarmState })
  @IsOptional()
  @IsEnum(AlarmState)
  state?: AlarmState;

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
  limit?: number = 20;
}

// =============================================================================
// MACHINE MAINTENANCE DTOs
// =============================================================================

export class CreateMaintenanceDto {
  @ApiProperty({ description: 'Machine ID', format: 'uuid' })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: 'Maintenance type', enum: MaintenanceType })
  @IsEnum(MaintenanceType)
  maintenanceType: MaintenanceType;

  @ApiProperty({ description: 'Title', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Estimated duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  estimatedDuration?: number;
}

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {
  @ApiPropertyOptional({ description: 'Maintenance status', enum: MaintenanceStatus })
  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @ApiPropertyOptional({ description: 'Performed by user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  performedBy?: string;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Labor cost' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Parts cost' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  partsCost?: number;

  @ApiPropertyOptional({ description: 'Parts replaced (JSON)' })
  @IsOptional()
  @IsObject()
  partsReplaced?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Work performed' })
  @IsOptional()
  @IsString()
  workPerformed?: string;

  @ApiPropertyOptional({ description: 'Findings' })
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional({ description: 'Requires follow-up' })
  @IsOptional()
  @IsBoolean()
  requiresFollowUp?: boolean;

  @ApiPropertyOptional({ description: 'Follow-up notes' })
  @IsOptional()
  @IsString()
  followUpNotes?: string;

  @ApiPropertyOptional({ description: 'Next maintenance date' })
  @IsOptional()
  @IsDateString()
  nextMaintenanceDate?: string;

  @ApiPropertyOptional({ description: 'Meter reading before' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  meterReadingBefore?: number;

  @ApiPropertyOptional({ description: 'Meter reading after' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  meterReadingAfter?: number;
}

export class CompleteMaintenanceDto {
  @ApiProperty({ description: 'Work performed' })
  @IsString()
  workPerformed: string;

  @ApiPropertyOptional({ description: 'Actual duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  durationMinutes?: number;

  @ApiPropertyOptional({ description: 'Labor cost' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Parts cost' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  partsCost?: number;

  @ApiPropertyOptional({ description: 'Parts replaced (JSON)' })
  @IsOptional()
  @IsObject()
  partsReplaced?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Findings' })
  @IsOptional()
  @IsString()
  findings?: string;

  @ApiPropertyOptional({ description: 'Requires follow-up' })
  @IsOptional()
  @IsBoolean()
  requiresFollowUp?: boolean;

  @ApiPropertyOptional({ description: 'Follow-up notes' })
  @IsOptional()
  @IsString()
  followUpNotes?: string;

  @ApiPropertyOptional({ description: 'Meter reading after' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  meterReadingAfter?: number;
}

// =============================================================================
// MACHINE DOWNTIME DTOs
// =============================================================================

export class CreateDowntimeDto {
  @ApiProperty({ description: 'Machine ID', format: 'uuid' })
  @IsUUID()
  machineId: string;

  @ApiProperty({ description: 'Downtime type', enum: DowntimeType })
  @IsEnum(DowntimeType)
  downtimeType: DowntimeType;

  @ApiProperty({ description: 'Reason code', maxLength: 50 })
  @IsString()
  @MaxLength(50)
  reasonCode: string;

  @ApiPropertyOptional({ description: 'Reason description' })
  @IsOptional()
  @IsString()
  reasonDescription?: string;

  @ApiPropertyOptional({ description: 'Work order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Operation ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional({ description: 'Parts affected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  partsAffected?: number;
}

export class EndDowntimeDto {
  @ApiPropertyOptional({ description: 'Root cause' })
  @IsOptional()
  @IsString()
  rootCause?: string;

  @ApiPropertyOptional({ description: 'Resolution' })
  @IsOptional()
  @IsString()
  resolution?: string;

  @ApiPropertyOptional({ description: 'Preventive action' })
  @IsOptional()
  @IsString()
  preventiveAction?: string;
}
