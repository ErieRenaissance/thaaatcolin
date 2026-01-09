/**
 * FERALIS MANUFACTURING PLATFORM
 * Phase 7: Analytics & Customer Portal
 * 
 * Analytics Module - Entity Definitions
 */

// ============================================================================
// ENUMERATIONS
// ============================================================================

export enum ReportStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DISABLED = 'DISABLED'
}

export enum ReportType {
  DASHBOARD = 'DASHBOARD',
  SCHEDULED = 'SCHEDULED',
  AD_HOC = 'AD_HOC',
  SYSTEM = 'SYSTEM',
  CUSTOM = 'CUSTOM'
}

export enum KPICategory {
  FINANCIAL = 'FINANCIAL',
  OPERATIONAL = 'OPERATIONAL',
  QUALITY = 'QUALITY',
  DELIVERY = 'DELIVERY',
  CUSTOMER = 'CUSTOMER',
  INVENTORY = 'INVENTORY',
  PRODUCTION = 'PRODUCTION',
  EFFICIENCY = 'EFFICIENCY'
}

export enum TrendDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE',
  VOLATILE = 'VOLATILE'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export enum ChartType {
  LINE = 'LINE',
  BAR = 'BAR',
  PIE = 'PIE',
  DONUT = 'DONUT',
  AREA = 'AREA',
  SCATTER = 'SCATTER',
  GAUGE = 'GAUGE',
  HEATMAP = 'HEATMAP',
  TREEMAP = 'TREEMAP',
  FUNNEL = 'FUNNEL',
  TABLE = 'TABLE',
  KPI_CARD = 'KPI_CARD'
}

export enum WidgetType {
  KPI = 'KPI',
  CHART = 'CHART',
  TABLE = 'TABLE',
  MAP = 'MAP',
  GAUGE = 'GAUGE',
  TIMELINE = 'TIMELINE',
  LIST = 'LIST',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  EMBED = 'EMBED'
}

export enum DataSourceType {
  KPI = 'KPI',
  REPORT = 'REPORT',
  QUERY = 'QUERY',
  API = 'API'
}

export enum ValueFormat {
  NUMBER = 'NUMBER',
  CURRENCY = 'CURRENCY',
  PERCENT = 'PERCENT',
  TIME = 'TIME',
  DATE = 'DATE',
  TEXT = 'TEXT'
}

export enum PeriodType {
  HOUR = 'HOUR',
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  QUARTER = 'QUARTER',
  YEAR = 'YEAR'
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface AuditFields {
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
  updatedBy?: string;
  deletedAt?: Date;
  deletedBy?: string;
}

export interface OrgScopedEntity {
  organizationId: string;
  facilityId?: string;
}

// ============================================================================
// REPORT ENTITIES
// ============================================================================

export interface QueryDefinition {
  baseTable: string;
  joins?: JoinDefinition[];
  selectFields: SelectField[];
  whereConditions?: WhereCondition[];
  groupBy?: string[];
  having?: string;
  orderBy?: OrderByField[];
  limit?: number;
}

export interface JoinDefinition {
  table: string;
  type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL';
  on: string;
  alias?: string;
}

export interface SelectField {
  field: string;
  alias?: string;
  aggregate?: 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';
  formula?: string;
}

export interface WhereCondition {
  field: string;
  operator: 'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN' | 'NOT_IN' | 'LIKE' | 'BETWEEN' | 'IS_NULL' | 'IS_NOT_NULL';
  value?: any;
  parameterName?: string;
}

export interface OrderByField {
  field: string;
  direction: 'ASC' | 'DESC';
}

export interface ReportParameter {
  name: string;
  type: 'STRING' | 'NUMBER' | 'DATE' | 'DATE_RANGE' | 'SELECT' | 'MULTI_SELECT' | 'BOOLEAN';
  label: string;
  required: boolean;
  defaultValue?: any;
  options?: SelectOption[];
  validation?: ParameterValidation;
}

export interface SelectOption {
  value: any;
  label: string;
}

export interface ParameterValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface ReportFilter {
  field: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'MULTI_SELECT';
  options?: SelectOption[];
  allowCustom?: boolean;
}

export interface ReportColumn {
  field: string;
  label: string;
  type: ValueFormat;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  visible?: boolean;
  format?: ColumnFormat;
}

export interface ColumnFormat {
  decimalPlaces?: number;
  prefix?: string;
  suffix?: string;
  dateFormat?: string;
  nullDisplay?: string;
}

export interface ChartConfig {
  type: ChartType;
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;
  series?: SeriesConfig[];
  legend?: LegendConfig;
  tooltip?: TooltipConfig;
  colors?: string[];
  stacked?: boolean;
  showDataLabels?: boolean;
  animation?: boolean;
}

export interface AxisConfig {
  field: string;
  label?: string;
  type?: 'category' | 'value' | 'time';
  format?: string;
  min?: number;
  max?: number;
}

export interface SeriesConfig {
  name: string;
  field: string;
  type?: ChartType;
  color?: string;
  yAxisIndex?: number;
}

export interface LegendConfig {
  show: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export interface TooltipConfig {
  show: boolean;
  format?: string;
}

export interface DisplayOptions {
  showTitle?: boolean;
  showFilters?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  compactMode?: boolean;
  pagination?: PaginationOptions;
}

export interface PaginationOptions {
  enabled: boolean;
  pageSize: number;
  pageSizeOptions: number[];
}

export interface ReportDefinition extends AuditFields, OrgScopedEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  reportType: ReportType;
  category?: string;
  
  queryDefinition: QueryDefinition;
  parameters: ReportParameter[];
  filters: ReportFilter[];
  columns: ReportColumn[];
  sorting: OrderByField[];
  grouping: string[];
  
  chartType?: ChartType;
  chartConfig?: ChartConfig;
  displayOptions: DisplayOptions;
  
  isPublic: boolean;
  ownerId?: string;
  sharedWithRoles: string[];
  sharedWithUsers: string[];
  
  status: ReportStatus;
  isSystem: boolean;
  
  scheduleCron?: string;
  scheduleTimezone: string;
  nextRunAt?: Date;
  lastRunAt?: Date;
  
  emailRecipients: string[];
  exportFormat: 'PDF' | 'EXCEL' | 'CSV';
}

export interface ReportExecution {
  id: string;
  reportId: string;
  organizationId: string;
  executedBy?: string;
  executionType: 'MANUAL' | 'SCHEDULED' | 'API';
  parametersUsed: Record<string, any>;
  filtersApplied: WhereCondition[];
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  rowCount: number;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  errorMessage?: string;
  outputFormat?: string;
  outputFilePath?: string;
  outputFileSize?: number;
  distributedTo: string[];
  distributionStatus?: string;
}

// ============================================================================
// KPI ENTITIES
// ============================================================================

export interface KPIDefinition extends AuditFields, OrgScopedEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: KPICategory;
  
  calculationQuery: string;
  calculationType: 'SQL' | 'FORMULA' | 'AGGREGATE';
  formula?: FormulaDefinition;
  
  unit?: string;
  format: ValueFormat;
  decimalPlaces: number;
  prefix?: string;
  suffix?: string;
  
  targetValue?: number;
  targetType: 'FIXED' | 'ROLLING' | 'CALCULATED';
  warningThreshold?: number;
  criticalThreshold?: number;
  thresholdDirection: 'ABOVE' | 'BELOW';
  
  trendPeriod: PeriodType;
  trendComparison: 'PREVIOUS_PERIOD' | 'SAME_LAST_YEAR' | 'BASELINE';
  
  displayOrder: number;
  isFeatured: boolean;
  icon?: string;
  color?: string;
  
  isActive: boolean;
  isSystem: boolean;
}

export interface FormulaDefinition {
  expression: string;
  variables: FormulaVariable[];
}

export interface FormulaVariable {
  name: string;
  kpiCode?: string;
  query?: string;
}

export interface KPIValue {
  id: string;
  kpiId: string;
  organizationId: string;
  facilityId?: string;
  
  periodStart: Date;
  periodEnd: Date;
  periodType: PeriodType;
  
  value: number;
  targetValue?: number;
  previousValue?: number;
  
  variance?: number;
  variancePercent?: number;
  trendDirection?: TrendDirection;
  
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  
  calculatedAt: Date;
  dataPointsCount?: number;
}

export interface KPISnapshot {
  kpi: KPIDefinition;
  currentValue: KPIValue;
  previousValue?: KPIValue;
  trend: KPITrend;
  sparklineData: SparklinePoint[];
}

export interface KPITrend {
  direction: TrendDirection;
  changeValue: number;
  changePercent: number;
  periodComparison: string;
}

export interface SparklinePoint {
  date: Date;
  value: number;
}

// ============================================================================
// DASHBOARD ENTITIES
// ============================================================================

export interface Dashboard extends AuditFields, OrgScopedEntity {
  id: string;
  code: string;
  name: string;
  description?: string;
  
  layoutType: 'GRID' | 'FLEX' | 'MASONRY';
  layoutConfig: LayoutConfig;
  
  widgets: DashboardWidgetConfig[];
  
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  customStyles?: Record<string, string>;
  
  isPublic: boolean;
  isDefault: boolean;
  ownerId?: string;
  sharedWithRoles: string[];
  defaultForRoles: string[];
  
  isActive: boolean;
  isSystem: boolean;
  
  refreshIntervalSeconds: number;
}

export interface LayoutConfig {
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  compactType: 'vertical' | 'horizontal' | null;
  preventCollision: boolean;
}

export interface DashboardWidget extends AuditFields {
  id: string;
  dashboardId: string;
  
  widgetType: WidgetType;
  title?: string;
  
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  
  dataSourceType: DataSourceType;
  dataSourceId?: string;
  dataQuery?: QueryDefinition;
  
  config: WidgetConfig;
  
  chartType?: ChartType;
  chartConfig?: ChartConfig;
  displayOptions?: DisplayOptions;
  
  drillDownConfig?: DrillDownConfig;
  clickAction?: ClickAction;
  
  isVisible: boolean;
}

export interface DashboardWidgetConfig {
  id: string;
  widgetType: WidgetType;
  title?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  dataSource: DataSourceConfig;
  visualization: VisualizationConfig;
  interactivity?: InteractivityConfig;
}

export interface DataSourceConfig {
  type: DataSourceType;
  id?: string;
  query?: QueryDefinition;
  refreshInterval?: number;
}

export interface VisualizationConfig {
  chartType?: ChartType;
  chartConfig?: ChartConfig;
  displayOptions?: DisplayOptions;
  conditionalFormatting?: ConditionalFormat[];
}

export interface ConditionalFormat {
  condition: WhereCondition;
  style: Record<string, string>;
}

export interface InteractivityConfig {
  drillDown?: DrillDownConfig;
  clickAction?: ClickAction;
  filters?: FilterInteraction[];
}

export interface DrillDownConfig {
  enabled: boolean;
  targetDashboard?: string;
  targetReport?: string;
  parameters?: Record<string, string>;
}

export interface ClickAction {
  type: 'NAVIGATE' | 'OPEN_MODAL' | 'FILTER' | 'CUSTOM';
  target?: string;
  parameters?: Record<string, any>;
}

export interface FilterInteraction {
  sourceField: string;
  targetWidgets: string[];
  targetField: string;
}

export interface WidgetConfig {
  title?: string;
  subtitle?: string;
  showBorder?: boolean;
  backgroundColor?: string;
  headerColor?: string;
  padding?: number;
  [key: string]: any;
}

// ============================================================================
// ALERT ENTITIES
// ============================================================================

export interface AnalyticsAlert extends AuditFields, OrgScopedEntity {
  id: string;
  name: string;
  description?: string;
  
  kpiId?: string;
  conditionType: 'THRESHOLD' | 'TREND' | 'ANOMALY';
  conditionConfig: AlertConditionConfig;
  
  severity: AlertSeverity;
  isActive: boolean;
  
  notifyRoles: string[];
  notifyUsers: string[];
  notificationChannels: ('IN_APP' | 'EMAIL' | 'SMS' | 'SLACK')[];
  
  cooldownMinutes: number;
  lastTriggeredAt?: Date;
}

export interface AlertConditionConfig {
  threshold?: number;
  operator?: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE';
  trendDirection?: TrendDirection;
  trendPeriods?: number;
  anomalyStdDeviations?: number;
}

export interface AlertInstance {
  id: string;
  alertId: string;
  organizationId: string;
  
  triggeredAt: Date;
  triggerValue?: number;
  thresholdValue?: number;
  
  context: Record<string, any>;
  
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED';
  
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  
  notificationsSent: NotificationRecord[];
}

export interface NotificationRecord {
  channel: string;
  recipient: string;
  sentAt: Date;
  status: 'SENT' | 'DELIVERED' | 'FAILED';
  errorMessage?: string;
}

// ============================================================================
// SUMMARY ENTITIES
// ============================================================================

export interface DailyProductionSummary {
  id: string;
  organizationId: string;
  facilityId?: string;
  summaryDate: Date;
  
  totalOrdersReceived: number;
  totalOrdersCompleted: number;
  totalOrdersShipped: number;
  
  totalPartsProduced: number;
  totalPartsScrapped: number;
  totalPartsReworked: number;
  
  firstPassYield?: number;
  scrapRate?: number;
  reworkRate?: number;
  
  revenueRecognized: number;
  productionCost: number;
  marginPercent?: number;
  
  totalMachineHours: number;
  totalLaborHours: number;
  averageOee?: number;
  
  onTimeShipments: number;
  lateShipments: number;
  onTimeRate?: number;
  
  calculatedAt: Date;
}

export interface CustomerPerformanceSummary {
  id: string;
  organizationId: string;
  customerId: string;
  periodType: PeriodType;
  periodStart: Date;
  periodEnd: Date;
  
  totalOrders: number;
  totalOrderValue: number;
  averageOrderValue?: number;
  
  totalQuotes: number;
  quotesWon: number;
  quotesLost: number;
  winRate?: number;
  
  ordersOnTime: number;
  ordersLate: number;
  onTimeRate?: number;
  averageLeadTimeDays?: number;
  
  totalNcrs: number;
  totalReturns: number;
  qualityScore?: number;
  
  totalRevenue: number;
  totalCost: number;
  marginPercent?: number;
  
  calculatedAt: Date;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface ExecuteReportRequest {
  reportId: string;
  parameters?: Record<string, any>;
  filters?: WhereCondition[];
  format?: 'JSON' | 'PDF' | 'EXCEL' | 'CSV';
  page?: number;
  pageSize?: number;
}

export interface ExecuteReportResponse {
  executionId: string;
  reportId: string;
  data: any[];
  totalRows: number;
  page: number;
  pageSize: number;
  executionTime: number;
  columns: ReportColumn[];
}

export interface KPIDashboardRequest {
  category?: KPICategory;
  featured?: boolean;
  facilityId?: string;
  periodType?: PeriodType;
}

export interface KPIDashboardResponse {
  kpis: KPISnapshot[];
  lastUpdated: Date;
}

export interface CreateDashboardRequest {
  code: string;
  name: string;
  description?: string;
  layoutType: 'GRID' | 'FLEX' | 'MASONRY';
  layoutConfig?: Partial<LayoutConfig>;
  widgets?: DashboardWidgetConfig[];
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  isPublic?: boolean;
  isDefault?: boolean;
  defaultForRoles?: string[];
  refreshIntervalSeconds?: number;
}

export interface UpdateDashboardRequest {
  name?: string;
  description?: string;
  layoutConfig?: Partial<LayoutConfig>;
  widgets?: DashboardWidgetConfig[];
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  isPublic?: boolean;
  isDefault?: boolean;
  defaultForRoles?: string[];
  refreshIntervalSeconds?: number;
}

export interface AnalyticsSummaryRequest {
  startDate: Date;
  endDate: Date;
  facilityId?: string;
  granularity?: 'HOUR' | 'DAY' | 'WEEK' | 'MONTH';
}

export interface AnalyticsSummaryResponse {
  period: {
    start: Date;
    end: Date;
    granularity: string;
  };
  production: ProductionMetrics;
  quality: QualityMetrics;
  delivery: DeliveryMetrics;
  financial: FinancialMetrics;
  efficiency: EfficiencyMetrics;
  trends: TrendData[];
}

export interface ProductionMetrics {
  ordersReceived: number;
  ordersCompleted: number;
  partsProduced: number;
  partsScrapped: number;
  partsReworked: number;
}

export interface QualityMetrics {
  firstPassYield: number;
  scrapRate: number;
  reworkRate: number;
  ncrsOpened: number;
  ncrsClosed: number;
}

export interface DeliveryMetrics {
  ordersShipped: number;
  onTimeRate: number;
  lateOrders: number;
  averageLeadTime: number;
}

export interface FinancialMetrics {
  revenue: number;
  cost: number;
  margin: number;
  marginPercent: number;
}

export interface EfficiencyMetrics {
  machineUtilization: number;
  laborEfficiency: number;
  averageOee: number;
  throughputRate: number;
}

export interface TrendData {
  date: Date;
  metrics: Record<string, number>;
}
