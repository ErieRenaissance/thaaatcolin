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
  ValidateNested,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

// =============================================================================
// WORK ORDER ENUMS
// =============================================================================

export enum WorkOrderStatus {
  CREATED = 'CREATED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  COMPLETE = 'COMPLETE',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum OperationStatus {
  PENDING = 'PENDING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETE = 'COMPLETE',
  CANCELLED = 'CANCELLED',
  SKIPPED = 'SKIPPED',
}

export enum PriorityLevel {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  CRITICAL = 'CRITICAL',
}

// =============================================================================
// WORK ORDER OPERATION DTOs
// =============================================================================

export class CreateWorkOrderOperationDto {
  @ApiProperty({ description: 'Sequence number' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  sequence: number;

  @ApiProperty({ description: 'Operation number' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  operationNumber: number;

  @ApiProperty({ description: 'Operation name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Work instructions' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiProperty({ description: 'Work center ID', format: 'uuid' })
  @IsUUID()
  workCenterId: string;

  @ApiPropertyOptional({ description: 'Preferred machine ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Standard setup time (minutes)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  setupTimeStandard?: number;

  @ApiPropertyOptional({ description: 'Standard run time per piece (minutes)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  runTimeStandard?: number;

  @ApiPropertyOptional({ description: 'Standard teardown time (minutes)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  teardownTimeStandard?: number;

  @ApiPropertyOptional({ description: 'NC program name', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  ncProgramName?: string;

  @ApiPropertyOptional({ description: 'NC program revision', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  ncProgramRevision?: string;

  @ApiPropertyOptional({ description: 'Tooling required (JSON)' })
  @IsOptional()
  @IsObject()
  toolingRequired?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Inspection required' })
  @IsOptional()
  @IsBoolean()
  inspectionRequired?: boolean;

  @ApiPropertyOptional({ description: 'First piece inspection required' })
  @IsOptional()
  @IsBoolean()
  firstPieceRequired?: boolean;

  @ApiPropertyOptional({ description: 'Setup notes' })
  @IsOptional()
  @IsString()
  setupNotes?: string;

  @ApiPropertyOptional({ description: 'Quality notes' })
  @IsOptional()
  @IsString()
  qualityNotes?: string;
}

export class UpdateWorkOrderOperationDto extends PartialType(CreateWorkOrderOperationDto) {
  @ApiPropertyOptional({ description: 'Operation status', enum: OperationStatus })
  @IsOptional()
  @IsEnum(OperationStatus)
  status?: OperationStatus;

  @ApiPropertyOptional({ description: 'Assigned operator ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedOperatorId?: string;

  @ApiPropertyOptional({ description: 'Actual setup time (minutes)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  setupTimeActual?: number;

  @ApiPropertyOptional({ description: 'Actual run time (minutes)' })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  runTimeActual?: number;

  @ApiPropertyOptional({ description: 'Quantity complete' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityComplete?: number;

  @ApiPropertyOptional({ description: 'Quantity scrapped' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityScrapped?: number;

  @ApiPropertyOptional({ description: 'Tooling verified' })
  @IsOptional()
  @IsBoolean()
  toolingVerified?: boolean;

  @ApiPropertyOptional({ description: 'First piece complete' })
  @IsOptional()
  @IsBoolean()
  firstPieceComplete?: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// =============================================================================
// WORK ORDER DTOs
// =============================================================================

export class CreateWorkOrderDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiPropertyOptional({ description: 'Order line ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderLineId?: string;

  @ApiProperty({ description: 'Part ID', format: 'uuid' })
  @IsUUID()
  partId: string;

  @ApiPropertyOptional({ description: 'Part revision ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partRevisionId?: string;

  @ApiPropertyOptional({ description: 'Priority', enum: PriorityLevel })
  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @ApiProperty({ description: 'Quantity to produce' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantityOrdered: number;

  @ApiProperty({ description: 'Due date' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Scheduled start date' })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({ description: 'Scheduled complete date' })
  @IsOptional()
  @IsDateString()
  scheduledComplete?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Production notes' })
  @IsOptional()
  @IsString()
  productionNotes?: string;

  @ApiPropertyOptional({ description: 'Operations to create', type: [CreateWorkOrderOperationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkOrderOperationDto)
  operations?: CreateWorkOrderOperationDto[];

  @ApiPropertyOptional({ description: 'Parent work order ID (for split orders)', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  parentWorkOrderId?: string;
}

export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ description: 'Priority', enum: PriorityLevel })
  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Scheduled start date' })
  @IsOptional()
  @IsDateString()
  scheduledStart?: string;

  @ApiPropertyOptional({ description: 'Scheduled complete date' })
  @IsOptional()
  @IsDateString()
  scheduledComplete?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Production notes' })
  @IsOptional()
  @IsString()
  productionNotes?: string;

  @ApiPropertyOptional({ description: 'Quality notes' })
  @IsOptional()
  @IsString()
  qualityNotes?: string;
}

export class ReleaseWorkOrderDto {
  @ApiPropertyOptional({ description: 'Force release even if material not available' })
  @IsOptional()
  @IsBoolean()
  forceRelease?: boolean;

  @ApiPropertyOptional({ description: 'Release notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class HoldWorkOrderDto {
  @ApiProperty({ description: 'Hold reason' })
  @IsString()
  reason: string;
}

export class CloseWorkOrderDto {
  @ApiPropertyOptional({ description: 'Closing notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Force close even if incomplete' })
  @IsOptional()
  @IsBoolean()
  forceClose?: boolean;
}

export class WorkOrderQueryDto {
  @ApiPropertyOptional({ description: 'Filter by facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by part ID' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Filter by order line ID' })
  @IsOptional()
  @IsUUID()
  orderLineId?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by multiple statuses', type: [String] })
  @IsOptional()
  @IsArray()
  @IsEnum(WorkOrderStatus, { each: true })
  statuses?: WorkOrderStatus[];

  @ApiPropertyOptional({ description: 'Filter by priority', enum: PriorityLevel })
  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @ApiPropertyOptional({ description: 'Due date from' })
  @IsOptional()
  @IsDateString()
  dueDateFrom?: string;

  @ApiPropertyOptional({ description: 'Due date to' })
  @IsOptional()
  @IsDateString()
  dueDateTo?: string;

  @ApiPropertyOptional({ description: 'Search by work order number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Include operations in response' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeOperations?: boolean;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

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
// SHOP FLOOR DTOs
// =============================================================================

export class StartOperationDto {
  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiPropertyOptional({ description: 'Machine ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Is this setup activity' })
  @IsOptional()
  @IsBoolean()
  isSetup?: boolean;

  @ApiPropertyOptional({ description: 'Starting notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordProductionDto {
  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiProperty({ description: 'Quantity good' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityGood: number;

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

  @ApiPropertyOptional({ description: 'Scrap reason code' })
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

export class CompleteOperationDto {
  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiPropertyOptional({ description: 'Final quantity good' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityGood?: number;

  @ApiPropertyOptional({ description: 'Final quantity scrap' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityScrap?: number;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FirstPieceApprovalDto {
  @ApiProperty({ description: 'Operation ID', format: 'uuid' })
  @IsUUID()
  operationId: string;

  @ApiProperty({ description: 'Approval result' })
  @IsBoolean()
  approved: boolean;

  @ApiPropertyOptional({ description: 'Inspection notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Measurement data (JSON)' })
  @IsOptional()
  @IsObject()
  measurementData?: Record<string, any>;
}

export class OperatorDispatchListQueryDto {
  @ApiPropertyOptional({ description: 'Filter by work center ID' })
  @IsOptional()
  @IsUUID()
  workCenterId?: string;

  @ApiPropertyOptional({ description: 'Filter by machine ID' })
  @IsOptional()
  @IsUUID()
  machineId?: string;

  @ApiPropertyOptional({ description: 'Show only ready operations' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  readyOnly?: boolean;
}

// =============================================================================
// RESPONSE DTOs
// =============================================================================

export class WorkOrderResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() organizationId: string;
  @ApiProperty() facilityId: string;
  @ApiProperty() workOrderNumber: string;
  @ApiPropertyOptional() orderLineId?: string;
  @ApiProperty() partId: string;
  @ApiPropertyOptional() partRevisionId?: string;
  @ApiProperty() status: WorkOrderStatus;
  @ApiProperty() priority: PriorityLevel;
  @ApiProperty() quantityOrdered: number;
  @ApiProperty() quantityComplete: number;
  @ApiProperty() quantityInProgress: number;
  @ApiProperty() quantityScrapped: number;
  @ApiProperty() quantityRemaining: number;
  @ApiProperty() dueDate: Date;
  @ApiPropertyOptional() scheduledStart?: Date;
  @ApiPropertyOptional() scheduledComplete?: Date;
  @ApiPropertyOptional() actualStart?: Date;
  @ApiPropertyOptional() actualComplete?: Date;
  @ApiProperty() operationCount: number;
  @ApiPropertyOptional() currentOperation?: number;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() operations?: WorkOrderOperationResponseDto[];
  @ApiPropertyOptional() part?: any;
}

export class WorkOrderOperationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() workOrderId: string;
  @ApiProperty() sequence: number;
  @ApiProperty() operationNumber: number;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description?: string;
  @ApiProperty() workCenterId: string;
  @ApiPropertyOptional() machineId?: string;
  @ApiProperty() status: OperationStatus;
  @ApiProperty() setupTimeStandard: number;
  @ApiProperty() runTimeStandard: number;
  @ApiPropertyOptional() setupTimeActual?: number;
  @ApiPropertyOptional() runTimeActual?: number;
  @ApiProperty() quantityRequired: number;
  @ApiProperty() quantityComplete: number;
  @ApiProperty() quantityScrapped: number;
  @ApiPropertyOptional() scheduledStart?: Date;
  @ApiPropertyOptional() scheduledEnd?: Date;
  @ApiPropertyOptional() actualStart?: Date;
  @ApiPropertyOptional() actualEnd?: Date;
  @ApiProperty() inspectionRequired: boolean;
  @ApiProperty() firstPieceRequired: boolean;
  @ApiProperty() firstPieceComplete: boolean;
  @ApiPropertyOptional() workCenter?: any;
  @ApiPropertyOptional() machine?: any;
}

export class DispatchListItemDto {
  @ApiProperty() operation: WorkOrderOperationResponseDto;
  @ApiProperty() workOrder: WorkOrderResponseDto;
  @ApiProperty() part: any;
  @ApiPropertyOptional() machine?: any;
  @ApiProperty() estimatedStart: Date;
  @ApiProperty() estimatedDuration: number;
  @ApiProperty() priority: number;
  @ApiProperty() isReady: boolean;
  @ApiPropertyOptional() blockedReason?: string;
}
