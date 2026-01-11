/**
 * Feralis Manufacturing Platform
 * Analytics Module - Data Transfer Objects
 * 
 * Request/response DTOs with validation decorators for the Analytics API
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  IsDateString,
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ReportType,
  ReportStatus,
  KPICategory,
  TrendDirection,
  AlertSeverity,
  ChartType,
  WidgetType,
  PeriodType,
  ValueFormat,
} from '../entities/analytics.entity';

// ============================================================================
// REPORT DTOs
// ============================================================================

export class ReportFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ReportType })
  @IsOptional()
  @IsEnum(ReportType)
  type?: ReportType;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ReportParameterValueDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  value: any;
}

export class ExecuteReportDto {
  @ApiPropertyOptional({ type: [ReportParameterValueDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportParameterValueDto)
  parameters?: ReportParameterValueDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortDirection?: 'ASC' | 'DESC';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: 'json' | 'csv' | 'excel' | 'pdf';
}

export class QueryColumnDto {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alias?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  table?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aggregate?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX';
}

export class QueryJoinDto {
  @ApiProperty()
  @IsString()
  table: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alias?: string;

  @ApiProperty()
  @IsEnum(['INNER', 'LEFT', 'RIGHT', 'FULL'])
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';

  @ApiProperty()
  @IsString()
  on: string;
}

export class QueryConditionDto {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty()
  @IsString()
  operator: string;

  @ApiPropertyOptional()
  @IsOptional()
  value?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conjunction?: 'AND' | 'OR';
}

export class QueryDefinitionDto {
  @ApiProperty()
  @IsString()
  baseTable: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baseAlias?: string;

  @ApiProperty({ type: [QueryColumnDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryColumnDto)
  selects: QueryColumnDto[];

  @ApiPropertyOptional({ type: [QueryJoinDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryJoinDto)
  joins?: QueryJoinDto[];

  @ApiPropertyOptional({ type: [QueryConditionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QueryConditionDto)
  where?: QueryConditionDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  orderBy?: string[];
}

export class ReportColumnDto {
  @ApiProperty()
  @IsString()
  field: string;

  @ApiProperty()
  @IsString()
  header: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  width?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  sortable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  filterable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  alignment?: 'left' | 'center' | 'right';
}

export class ChartConfigDto {
  @ApiProperty({ enum: ChartType })
  @IsEnum(ChartType)
  type: ChartType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  xAxis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  yAxis?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  series?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class CreateReportDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ type: QueryDefinitionDto })
  @ValidateNested()
  @Type(() => QueryDefinitionDto)
  queryDefinition: QueryDefinitionDto;

  @ApiPropertyOptional({ type: [ReportColumnDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportColumnDto)
  columns?: ReportColumnDto[];

  @ApiPropertyOptional({ type: [ChartConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChartConfigDto)
  charts?: ChartConfigDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allowedRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allowedUsers?: string[];
}

export class UpdateReportDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ReportStatus })
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ type: QueryDefinitionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QueryDefinitionDto)
  queryDefinition?: QueryDefinitionDto;

  @ApiPropertyOptional({ type: [ReportColumnDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReportColumnDto)
  columns?: ReportColumnDto[];

  @ApiPropertyOptional({ type: [ChartConfigDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChartConfigDto)
  charts?: ChartConfigDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// ============================================================================
// KPI DTOs
// ============================================================================

export class KPIFilterDto {
  @ApiPropertyOptional({ enum: KPICategory })
  @IsOptional()
  @IsEnum(KPICategory)
  category?: KPICategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export class KPIDashboardRequestDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  kpiCodes?: string[];

  @ApiPropertyOptional({ enum: KPICategory })
  @IsOptional()
  @IsEnum(KPICategory)
  category?: KPICategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  featuredOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeSparkline?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  sparklinePoints?: number;
}

export class KPIThresholdDto {
  @ApiProperty()
  @IsNumber()
  warning: number;

  @ApiProperty()
  @IsNumber()
  critical: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  target?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  stretch?: number;
}

export class CreateKPIDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: KPICategory })
  @IsEnum(KPICategory)
  category: KPICategory;

  @ApiProperty()
  @IsString()
  calculationQuery: string;

  @ApiProperty({ enum: PeriodType })
  @IsEnum(PeriodType)
  periodType: PeriodType;

  @ApiPropertyOptional({ enum: ValueFormat })
  @IsOptional()
  @IsEnum(ValueFormat)
  valueFormat?: ValueFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  decimalPlaces?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ type: KPIThresholdDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => KPIThresholdDto)
  thresholds?: KPIThresholdDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  higherIsBetter?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

export class UpdateKPIDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  calculationQuery?: string;

  @ApiPropertyOptional({ type: KPIThresholdDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => KPIThresholdDto)
  thresholds?: KPIThresholdDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;
}

// ============================================================================
// DASHBOARD DTOs
// ============================================================================

export class WidgetDataSourceDto {
  @ApiProperty()
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reportId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  kpiCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  refreshInterval?: number;
}

export class WidgetPositionDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  x: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  y: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  width: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  height: number;
}

export class DashboardWidgetDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ enum: WidgetType })
  @IsEnum(WidgetType)
  type: WidgetType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ type: WidgetPositionDto })
  @ValidateNested()
  @Type(() => WidgetPositionDto)
  position: WidgetPositionDto;

  @ApiProperty({ type: WidgetDataSourceDto })
  @ValidateNested()
  @Type(() => WidgetDataSourceDto)
  dataSource: WidgetDataSourceDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  visualization?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  interactivity?: Record<string, any>;
}

export class CreateDashboardDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [DashboardWidgetDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardWidgetDto)
  widgets?: DashboardWidgetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  layout?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  allowedRoles?: string[];
}

export class UpdateDashboardDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [DashboardWidgetDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardWidgetDto)
  widgets?: DashboardWidgetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  layout?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// ============================================================================
// ANALYTICS SUMMARY DTOs
// ============================================================================

export class AnalyticsSummaryRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: PeriodType })
  @IsOptional()
  @IsEnum(PeriodType)
  periodType?: PeriodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metrics?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  includeTrends?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  trendDays?: number;
}

// ============================================================================
// ALERT DTOs
// ============================================================================

export class AlertFilterDto {
  @ApiPropertyOptional({ enum: AlertSeverity })
  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  acknowledged?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  since?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AcknowledgeAlertDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResolveAlertDto {
  @ApiProperty()
  @IsString()
  resolution: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAlertDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: AlertSeverity })
  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @ApiProperty()
  @IsObject()
  condition: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notificationChannels?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notifyUsers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notifyRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  cooldownMinutes?: number;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class ReportListResponseDto {
  @ApiProperty()
  reports: any[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;
}

export class ReportExecutionResponseDto {
  @ApiProperty()
  executionId: string;

  @ApiProperty()
  data: any[];

  @ApiProperty()
  columns: any[];

  @ApiProperty()
  totalRows: number;

  @ApiProperty()
  executionTimeMs: number;

  @ApiPropertyOptional()
  charts?: any[];
}

export class KPISnapshotResponseDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  category: KPICategory;

  @ApiProperty()
  currentValue: number;

  @ApiProperty()
  formattedValue: string;

  @ApiProperty()
  previousValue: number;

  @ApiProperty()
  variance: number;

  @ApiProperty()
  variancePercent: number;

  @ApiProperty({ enum: TrendDirection })
  trend: TrendDirection;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  sparkline?: number[];

  @ApiPropertyOptional()
  target?: number;

  @ApiProperty()
  periodStart: string;

  @ApiProperty()
  periodEnd: string;
}

export class DashboardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  widgets: any[];

  @ApiPropertyOptional()
  layout?: any;

  @ApiPropertyOptional()
  theme?: any;

  @ApiProperty()
  isOwner: boolean;

  @ApiProperty()
  canEdit: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class AnalyticsSummaryResponseDto {
  @ApiProperty()
  period: {
    start: string;
    end: string;
    type: PeriodType;
  };

  @ApiProperty()
  production: {
    ordersCompleted: number;
    partsProduced: number;
    machineHours: number;
    laborHours: number;
  };

  @ApiProperty()
  quality: {
    firstPassYield: number;
    scrapRate: number;
    reworkRate: number;
    ncrsOpened: number;
  };

  @ApiProperty()
  delivery: {
    onTimeRate: number;
    ordersShipped: number;
    ordersLate: number;
    averageLeadTime: number;
  };

  @ApiProperty()
  financial: {
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number;
  };

  @ApiProperty()
  efficiency: {
    oee: number;
    availability: number;
    performance: number;
    qualityRate: number;
  };

  @ApiPropertyOptional()
  trends?: {
    production: any[];
    quality: any[];
    delivery: any[];
    financial: any[];
  };
}

export class AlertListResponseDto {
  @ApiProperty()
  alerts: any[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  unacknowledged: number;

  @ApiProperty()
  critical: number;
}
