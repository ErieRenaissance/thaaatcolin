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
// QUALITY ENUMS
// =============================================================================

export enum InspectionType {
  RECEIVING = 'RECEIVING',
  IN_PROCESS = 'IN_PROCESS',
  FINAL = 'FINAL',
  FIRST_PIECE = 'FIRST_PIECE',
  PERIODIC = 'PERIODIC',
  CUSTOMER_RETURN = 'CUSTOMER_RETURN',
}

export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  CONDITIONALLY_PASSED = 'CONDITIONALLY_PASSED',
  CANCELLED = 'CANCELLED',
}

export enum InspectionMethod {
  VISUAL = 'VISUAL',
  DIMENSIONAL = 'DIMENSIONAL',
  FUNCTIONAL = 'FUNCTIONAL',
  DESTRUCTIVE = 'DESTRUCTIVE',
  NON_DESTRUCTIVE = 'NON_DESTRUCTIVE',
  STATISTICAL = 'STATISTICAL',
}

export enum NCRStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DISPOSITION_PENDING = 'DISPOSITION_PENDING',
  IN_REWORK = 'IN_REWORK',
  AWAITING_MRB = 'AWAITING_MRB',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum NCRDisposition {
  USE_AS_IS = 'USE_AS_IS',
  REWORK = 'REWORK',
  REPAIR = 'REPAIR',
  SCRAP = 'SCRAP',
  RETURN_TO_VENDOR = 'RETURN_TO_VENDOR',
  DEVIATE = 'DEVIATE',
}

export enum NCRSeverity {
  MINOR = 'MINOR',
  MAJOR = 'MAJOR',
  CRITICAL = 'CRITICAL',
}

export enum CAPAType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE',
  BOTH = 'BOTH',
}

export enum CAPAStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  VERIFICATION = 'VERIFICATION',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// =============================================================================
// INSPECTION DTOs
// =============================================================================

export class CreateInspectionDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiProperty({ description: 'Inspection type', enum: InspectionType })
  @IsEnum(InspectionType)
  inspectionType: InspectionType;

  @ApiPropertyOptional({ description: 'Part ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Part revision ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partRevisionId?: string;

  @ApiPropertyOptional({ description: 'Work order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Operation ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiProperty({ description: 'Quantity to inspect' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantityInspected: number;

  @ApiPropertyOptional({ description: 'Sample size' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  sampleSize?: number;

  @ApiPropertyOptional({ description: 'Inspection method', enum: InspectionMethod })
  @IsOptional()
  @IsEnum(InspectionMethod)
  method?: InspectionMethod;

  @ApiPropertyOptional({ description: 'Scheduled date' })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInspectionDto extends PartialType(CreateInspectionDto) {
  @ApiPropertyOptional({ description: 'Status', enum: InspectionStatus })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

  @ApiPropertyOptional({ description: 'Quantity accepted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityAccepted?: number;

  @ApiPropertyOptional({ description: 'Quantity rejected' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRejected?: number;

  @ApiPropertyOptional({ description: 'Overall result' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  overallResult?: string;
}

export class StartInspectionDto {
  @ApiPropertyOptional({ description: 'Equipment used' })
  @IsOptional()
  @IsArray()
  equipmentUsed?: string[];
}

export class CompleteInspectionDto {
  @ApiProperty({ description: 'Quantity accepted' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityAccepted: number;

  @ApiProperty({ description: 'Quantity rejected' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantityRejected: number;

  @ApiPropertyOptional({ description: 'Overall result' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  overallResult?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Defect summary' })
  @IsOptional()
  @IsObject()
  defectSummary?: Record<string, any>;
}

export class RecordInspectionResultDto {
  @ApiProperty({ description: 'Characteristic name' })
  @IsString()
  @MaxLength(200)
  characteristicName: string;

  @ApiPropertyOptional({ description: 'Characteristic type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  characteristicType?: string;

  @ApiPropertyOptional({ description: 'Specification' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  specification?: string;

  @ApiPropertyOptional({ description: 'Nominal value' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  nominal?: number;

  @ApiPropertyOptional({ description: 'Upper limit' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  upperLimit?: number;

  @ApiPropertyOptional({ description: 'Lower limit' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lowerLimit?: number;

  @ApiPropertyOptional({ description: 'Measured value' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  measuredValue?: number;

  @ApiPropertyOptional({ description: 'Measured text (for non-numeric)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  measuredText?: string;

  @ApiPropertyOptional({ description: 'Unit of measure' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  unit?: string;

  @ApiProperty({ description: 'Pass/Fail' })
  @IsBoolean()
  isPass: boolean;

  @ApiPropertyOptional({ description: 'Sample number' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sampleNumber?: number;

  @ApiPropertyOptional({ description: 'Serial number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class InspectionQueryDto {
  @ApiPropertyOptional({ description: 'Facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Part ID' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Work order ID' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Inspection type', enum: InspectionType })
  @IsOptional()
  @IsEnum(InspectionType)
  inspectionType?: InspectionType;

  @ApiPropertyOptional({ description: 'Status', enum: InspectionStatus })
  @IsOptional()
  @IsEnum(InspectionStatus)
  status?: InspectionStatus;

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
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// =============================================================================
// NCR DTOs
// =============================================================================

export class CreateNCRDto {
  @ApiProperty({ description: 'Facility ID', format: 'uuid' })
  @IsUUID()
  facilityId: string;

  @ApiProperty({ description: 'Title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'Severity', enum: NCRSeverity })
  @IsEnum(NCRSeverity)
  severity: NCRSeverity;

  @ApiPropertyOptional({ description: 'Source type' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  @ApiPropertyOptional({ description: 'Inspection ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  inspectionId?: string;

  @ApiPropertyOptional({ description: 'Work order ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Operation ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  operationId?: string;

  @ApiPropertyOptional({ description: 'Customer ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Part ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Part revision ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  partRevisionId?: string;

  @ApiPropertyOptional({ description: 'Lot number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Serial numbers' })
  @IsOptional()
  @IsArray()
  serialNumbers?: string[];

  @ApiProperty({ description: 'Quantity affected' })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantityAffected: number;

  @ApiProperty({ description: 'Description of non-conformance' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ description: 'Containment action' })
  @IsOptional()
  @IsString()
  containmentAction?: string;

  @ApiPropertyOptional({ description: 'Requires MRB' })
  @IsOptional()
  @IsBoolean()
  requiresMRB?: boolean;

  @ApiPropertyOptional({ description: 'Target close date' })
  @IsOptional()
  @IsDateString()
  targetCloseDate?: string;

  @ApiPropertyOptional({ description: 'Photo URLs' })
  @IsOptional()
  @IsArray()
  photoUrls?: string[];

  @ApiPropertyOptional({ description: 'Assigned to user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class UpdateNCRDto extends PartialType(CreateNCRDto) {
  @ApiPropertyOptional({ description: 'Status', enum: NCRStatus })
  @IsOptional()
  @IsEnum(NCRStatus)
  status?: NCRStatus;

  @ApiPropertyOptional({ description: 'Root cause' })
  @IsOptional()
  @IsString()
  rootCause?: string;
}

export class DispositionNCRDto {
  @ApiProperty({ description: 'Disposition', enum: NCRDisposition })
  @IsEnum(NCRDisposition)
  disposition: NCRDisposition;

  @ApiPropertyOptional({ description: 'Disposition notes' })
  @IsOptional()
  @IsString()
  dispositionNotes?: string;

  @ApiPropertyOptional({ description: 'Labor cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  laborCost?: number;

  @ApiPropertyOptional({ description: 'Material cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  materialCost?: number;

  @ApiPropertyOptional({ description: 'Scrap cost' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  scrapCost?: number;
}

export class RecordMRBDto {
  @ApiProperty({ description: 'MRB date' })
  @IsDateString()
  mrbDate: string;

  @ApiProperty({ description: 'MRB decision' })
  @IsString()
  mrbDecision: string;

  @ApiPropertyOptional({ description: 'MRB attendees' })
  @IsOptional()
  @IsArray()
  mrbAttendees?: string[];
}

export class NCRQueryDto {
  @ApiPropertyOptional({ description: 'Facility ID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Part ID' })
  @IsOptional()
  @IsUUID()
  partId?: string;

  @ApiPropertyOptional({ description: 'Work order ID' })
  @IsOptional()
  @IsUUID()
  workOrderId?: string;

  @ApiPropertyOptional({ description: 'Customer ID' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Status', enum: NCRStatus })
  @IsOptional()
  @IsEnum(NCRStatus)
  status?: NCRStatus;

  @ApiPropertyOptional({ description: 'Severity', enum: NCRSeverity })
  @IsOptional()
  @IsEnum(NCRSeverity)
  severity?: NCRSeverity;

  @ApiPropertyOptional({ description: 'Assigned to ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'From date' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'To date' })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional({ description: 'Search term' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

// =============================================================================
// CAPA DTOs
// =============================================================================

export class CreateCAPADto {
  @ApiProperty({ description: 'Title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: 'CAPA type', enum: CAPAType })
  @IsEnum(CAPAType)
  type: CAPAType;

  @ApiPropertyOptional({ description: 'NCR ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  ncrId?: string;

  @ApiPropertyOptional({ description: 'Source reference' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceReference?: string;

  @ApiProperty({ description: 'Problem description' })
  @IsString()
  problemDescription: string;

  @ApiPropertyOptional({ description: 'Immediate action' })
  @IsOptional()
  @IsString()
  immediateAction?: string;

  @ApiPropertyOptional({ description: 'Target date' })
  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @ApiPropertyOptional({ description: 'Assigned to user ID', format: 'uuid' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;
}

export class UpdateCAPADto extends PartialType(CreateCAPADto) {
  @ApiPropertyOptional({ description: 'Status', enum: CAPAStatus })
  @IsOptional()
  @IsEnum(CAPAStatus)
  status?: CAPAStatus;

  @ApiPropertyOptional({ description: 'Root cause analysis' })
  @IsOptional()
  @IsString()
  rootCauseAnalysis?: string;

  @ApiPropertyOptional({ description: 'Corrective action' })
  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @ApiPropertyOptional({ description: 'Preventive action' })
  @IsOptional()
  @IsString()
  preventiveAction?: string;
}

export class VerifyCAPADto {
  @ApiProperty({ description: 'Verification method' })
  @IsString()
  verificationMethod: string;

  @ApiProperty({ description: 'Verification result' })
  @IsString()
  verificationResult: string;

  @ApiProperty({ description: 'Is effective' })
  @IsBoolean()
  isEffective: boolean;

  @ApiPropertyOptional({ description: 'Effectiveness review notes' })
  @IsOptional()
  @IsString()
  effectivenessReview?: string;
}

export class CAPAQueryDto {
  @ApiPropertyOptional({ description: 'NCR ID' })
  @IsOptional()
  @IsUUID()
  ncrId?: string;

  @ApiPropertyOptional({ description: 'Type', enum: CAPAType })
  @IsOptional()
  @IsEnum(CAPAType)
  type?: CAPAType;

  @ApiPropertyOptional({ description: 'Status', enum: CAPAStatus })
  @IsOptional()
  @IsEnum(CAPAStatus)
  status?: CAPAStatus;

  @ApiPropertyOptional({ description: 'Assigned to ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

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
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}
