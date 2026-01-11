import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductionHeartbeatService } from './production-heartbeat.service';
import { OeeCalculationService } from './oee-calculation.service';
import { BottleneckDetectionService } from './bottleneck-detection.service';
import { FinancialPerformanceService } from './financial-performance.service';
import { CapacityPlanningService } from './capacity-planning.service';
import { AlertManagementService, AlertSeverity, AlertCategory, AlertStatus } from './alert-management.service';

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export enum DashboardView {
  EXECUTIVE = 'EXECUTIVE',
  OPERATIONS = 'OPERATIONS',
  PRODUCTION = 'PRODUCTION',
  QUALITY = 'QUALITY',
  FINANCIAL = 'FINANCIAL',
  MAINTENANCE = 'MAINTENANCE',
}

export enum WidgetType {
  METRIC_CARD = 'METRIC_CARD',
  CHART = 'CHART',
  TABLE = 'TABLE',
  MAP = 'MAP',
  GAUGE = 'GAUGE',
  TIMELINE = 'TIMELINE',
  LIST = 'LIST',
  HEATMAP = 'HEATMAP',
}

export enum TimeRange {
  TODAY = 'TODAY',
  YESTERDAY = 'YESTERDAY',
  THIS_WEEK = 'THIS_WEEK',
  LAST_WEEK = 'LAST_WEEK',
  THIS_MONTH = 'THIS_MONTH',
  LAST_MONTH = 'LAST_MONTH',
  THIS_QUARTER = 'THIS_QUARTER',
  THIS_YEAR = 'THIS_YEAR',
  CUSTOM = 'CUSTOM',
}

export enum RefreshInterval {
  REALTIME = 5,      // 5 seconds
  FAST = 30,         // 30 seconds
  NORMAL = 60,       // 1 minute
  SLOW = 300,        // 5 minutes
  MANUAL = 0,        // No auto-refresh
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface DashboardConfig {
  id: string;
  name: string;
  view: DashboardView;
  layout: WidgetLayout[];
  refreshInterval: RefreshInterval;
  timeRange: TimeRange;
  customTimeRange?: { start: Date; end: Date };
  filters: DashboardFilter[];
  userId?: string;
  organizationId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetLayout {
  widgetId: string;
  widgetType: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  config: WidgetConfig;
}

export interface WidgetConfig {
  dataSource: string;
  refreshInterval?: RefreshInterval;
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'donut';
  metrics?: string[];
  groupBy?: string;
  sortBy?: string;
  limit?: number;
  thresholds?: { value: number; color: string; label: string }[];
  showLegend?: boolean;
  showTrend?: boolean;
  drillDownEnabled?: boolean;
}

export interface DashboardFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
  value: any;
}

export interface DashboardData {
  config: DashboardConfig;
  widgets: WidgetData[];
  lastUpdated: Date;
  nextRefresh: Date;
}

export interface WidgetData {
  widgetId: string;
  data: any;
  loading: boolean;
  error?: string;
  lastUpdated: Date;
}

// Executive Dashboard Types
export interface ExecutiveDashboard {
  summary: ExecutiveSummary;
  kpis: KpiCard[];
  revenue: RevenueOverview;
  production: ProductionOverview;
  quality: QualityOverview;
  delivery: DeliveryOverview;
  alerts: AlertOverview;
  trends: TrendChart[];
}

export interface ExecutiveSummary {
  overallHealth: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
  healthScore: number;
  topIssues: string[];
  recommendations: string[];
}

export interface KpiCard {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  achievementPercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercent: number;
  sparkline: number[];
  status: 'ON_TARGET' | 'WARNING' | 'CRITICAL';
}

export interface RevenueOverview {
  todayRevenue: number;
  monthToDate: number;
  monthTarget: number;
  achievementPercent: number;
  topCustomers: { name: string; revenue: number }[];
  revenueByProduct: { product: string; revenue: number }[];
  forecast: { date: Date; projected: number; actual?: number }[];
}

export interface ProductionOverview {
  machinesRunning: number;
  totalMachines: number;
  utilizationPercent: number;
  partsProducedToday: number;
  oeeOverall: number;
  activeWorkOrders: number;
  completedToday: number;
  behindSchedule: number;
}

export interface QualityOverview {
  firstPassYield: number;
  scrapRate: number;
  reworkRate: number;
  openNcrs: number;
  openCapas: number;
  customerComplaints: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
}

export interface DeliveryOverview {
  onTimeDelivery: number;
  ordersShippedToday: number;
  ordersAtRisk: number;
  ordersLate: number;
  avgLeadTimeDays: number;
  upcomingDeliveries: { orderNumber: string; customer: string; dueDate: Date; status: string }[];
}

export interface AlertOverview {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unacknowledged: number;
  recentAlerts: { title: string; severity: string; time: Date }[];
}

export interface TrendChart {
  id: string;
  title: string;
  metric: string;
  data: { timestamp: Date; value: number }[];
  target?: number;
  unit: string;
}

// Operations Dashboard Types
export interface OperationsDashboard {
  floorStatus: FloorStatusSummary;
  workOrderQueue: WorkOrderQueueSummary;
  bottlenecks: BottleneckSummary;
  capacity: CapacitySummary;
  inventory: InventorySummary;
  laborSummary: LaborSummary;
  maintenanceSchedule: MaintenanceItem[];
  shiftComparison: ShiftComparison;
}

export interface FloorStatusSummary {
  totalMachines: number;
  byStatus: Record<string, number>;
  utilizationPercent: number;
  alarmsActive: number;
  machineList: { id: string; name: string; status: string; currentJob?: string; operator?: string }[];
}

export interface WorkOrderQueueSummary {
  total: number;
  inProgress: number;
  queued: number;
  completedToday: number;
  onTime: number;
  atRisk: number;
  late: number;
  priorityBreakdown: Record<string, number>;
}

export interface BottleneckSummary {
  activeBottlenecks: number;
  criticalBottlenecks: number;
  topBottlenecks: { resource: string; queueHours: number; severity: string }[];
  impactedOrders: number;
  mitigationsAvailable: number;
}

export interface CapacitySummary {
  overallUtilization: number;
  availableHours: number;
  scheduledHours: number;
  overtimeScheduled: number;
  byWorkCenter: { name: string; utilization: number; available: number }[];
}

export interface InventorySummary {
  lowStockItems: number;
  outOfStock: number;
  expiringItems: number;
  pendingReceipts: number;
  criticalShortages: { partNumber: string; name: string; needed: number; available: number }[];
}

export interface LaborSummary {
  operatorsOnShift: number;
  operatorsAvailable: number;
  avgEfficiency: number;
  overtimeHours: number;
  absentToday: number;
}

export interface MaintenanceItem {
  machineId: string;
  machineName: string;
  maintenanceType: string;
  dueDate: Date;
  status: 'UPCOMING' | 'DUE' | 'OVERDUE';
  estimatedDuration: number;
}

export interface ShiftComparison {
  currentShift: ShiftMetrics;
  previousShift?: ShiftMetrics;
  dayAgoShift?: ShiftMetrics;
  weekAgoShift?: ShiftMetrics;
}

export interface ShiftMetrics {
  shiftName: string;
  startTime: Date;
  endTime: Date;
  partsProduced: number;
  oee: number;
  scrapRate: number;
  efficiency: number;
  downtime: number;
}

// Production Dashboard Types
export interface ProductionDashboard {
  realTimeStatus: RealTimeProductionStatus;
  machineGrid: MachineGridItem[];
  oeeMetrics: OeeMetrics;
  workOrderProgress: WorkOrderProgressItem[];
  cycleTimeAnalysis: CycleTimeAnalysis;
  downtimeAnalysis: DowntimeAnalysis;
  qualityMetrics: ProductionQualityMetrics;
  operatorPerformance: OperatorPerformanceItem[];
}

export interface RealTimeProductionStatus {
  partsInLastHour: number;
  partsTarget: number;
  cyclesCompleted: number;
  avgCycleTime: number;
  targetCycleTime: number;
  efficiency: number;
}

export interface MachineGridItem {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  currentOee: number;
  currentJob?: string;
  operator?: string;
  partsProduced: number;
  partsTarget: number;
  cycleTime: number;
  targetCycleTime: number;
  utilization: number;
  lastUpdate: Date;
}

export interface OeeMetrics {
  overall: number;
  availability: number;
  performance: number;
  quality: number;
  target: number;
  trend: TrendData;
  byMachine: { machineId: string; name: string; oee: number }[];
  byShift: { shift: string; oee: number }[];
}

export interface TrendData {
  direction: 'UP' | 'DOWN' | 'STABLE';
  changePercent: number;
  dataPoints: { timestamp: Date; value: number }[];
}

export interface WorkOrderProgressItem {
  id: string;
  workOrderNumber: string;
  partNumber: string;
  partName: string;
  quantityOrdered: number;
  quantityCompleted: number;
  quantityInProgress: number;
  completionPercent: number;
  status: string;
  dueDate: Date;
  estimatedCompletion: Date;
  currentOperation: string;
  currentMachine?: string;
  isOnTime: boolean;
}

export interface CycleTimeAnalysis {
  avgActual: number;
  avgTarget: number;
  variance: number;
  variancePercent: number;
  byPart: { partNumber: string; actual: number; target: number }[];
  byMachine: { machineId: string; name: string; avgCycleTime: number }[];
  histogram: { range: string; count: number }[];
}

export interface DowntimeAnalysis {
  totalMinutes: number;
  plannedMinutes: number;
  unplannedMinutes: number;
  byReason: { reason: string; minutes: number; percent: number }[];
  byMachine: { machineId: string; name: string; minutes: number }[];
  trend: { date: Date; planned: number; unplanned: number }[];
}

export interface ProductionQualityMetrics {
  firstPassYield: number;
  scrapCount: number;
  scrapCost: number;
  reworkCount: number;
  reworkCost: number;
  defectsByType: { type: string; count: number }[];
  defectsByPart: { partNumber: string; count: number }[];
}

export interface OperatorPerformanceItem {
  operatorId: string;
  operatorName: string;
  partsProduced: number;
  efficiency: number;
  qualityRate: number;
  machinesOperated: number;
  hoursWorked: number;
  ranking: number;
}

// ============================================================================
// DASHBOARD AGGREGATOR SERVICE
// ============================================================================

@Injectable()
export class DashboardAggregatorService {
  private readonly logger = new Logger(DashboardAggregatorService.name);
  
  // Dashboard data cache
  private dashboardCache: Map<string, { data: any; timestamp: Date }> = new Map();
  private readonly CACHE_TTL_SECONDS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heartbeatService: ProductionHeartbeatService,
    private readonly oeeService: OeeCalculationService,
    private readonly bottleneckService: BottleneckDetectionService,
    private readonly financialService: FinancialPerformanceService,
    private readonly capacityService: CapacityPlanningService,
    private readonly alertService: AlertManagementService,
  ) {}

  // ============================================================================
  // EXECUTIVE DASHBOARD
  // ============================================================================

  /**
   * Get comprehensive executive dashboard
   */
  async getExecutiveDashboard(organizationId: string): Promise<ExecutiveDashboard> {
    const cacheKey = `exec:${organizationId}`;
    const cached = this.getCached<ExecutiveDashboard>(cacheKey);
    if (cached) return cached;

    const [
      shopFloor,
      oeeData,
      bottlenecks,
      financial,
      alerts,
      quality,
      orders,
    ] = await Promise.all([
      this.heartbeatService.getShopFloorSnapshot(organizationId),
      this.oeeService.getOeeDashboard(organizationId),
      this.bottleneckService.analyzeBottlenecks(organizationId),
      this.financialService.getFinancialDashboard(organizationId),
      this.alertService.getAlertDashboard(organizationId),
      this.getQualityMetrics(organizationId),
      this.getOrderMetrics(organizationId),
    ]);

    // Calculate overall health
    const healthScore = this.calculateHealthScore({
      oee: oeeData.overallOee.oee,
      quality: quality.firstPassYield,
      delivery: orders.onTimeDelivery,
      alerts: alerts.summary.criticalUnacknowledged,
    });

    const dashboard: ExecutiveDashboard = {
      summary: {
        overallHealth: this.getHealthLabel(healthScore),
        healthScore,
        topIssues: this.identifyTopIssues(bottlenecks, alerts, orders),
        recommendations: this.generateRecommendations(healthScore, bottlenecks, oeeData),
      },
      kpis: this.buildKpiCards(oeeData, financial, quality, orders),
      revenue: {
        todayRevenue: Number(financial.revenueSnapshot?.recognized || 0),
        monthToDate: Number(financial.periodSummaries?.[2]?.actual || 0),
        monthTarget: Number(financial.periodSummaries?.[2]?.target || 0),
        achievementPercent: financial.periodSummaries?.[2]?.achievementPercent || 0,
        topCustomers: financial.revenueSnapshot?.breakdown?.byCustomer?.slice(0, 5) || [],
        revenueByProduct: financial.revenueSnapshot?.breakdown?.byProductLine || [],
        forecast: this.buildRevenueForecast(financial),
      },
      production: {
        machinesRunning: shopFloor.summary.byStatus?.RUNNING || 0,
        totalMachines: shopFloor.summary.totalMachines,
        utilizationPercent: shopFloor.summary.overallUtilization,
        partsProducedToday: shopFloor.summary.partsProducedToday,
        oeeOverall: oeeData.overallOee.oee,
        activeWorkOrders: orders.activeWorkOrders,
        completedToday: orders.completedToday,
        behindSchedule: orders.behindSchedule,
      },
      quality: {
        firstPassYield: quality.firstPassYield,
        scrapRate: quality.scrapRate,
        reworkRate: quality.reworkRate,
        openNcrs: quality.openNcrs,
        openCapas: quality.openCapas,
        customerComplaints: quality.customerComplaints,
        trend: quality.trend,
      },
      delivery: {
        onTimeDelivery: orders.onTimeDelivery,
        ordersShippedToday: orders.shippedToday,
        ordersAtRisk: orders.atRisk,
        ordersLate: orders.late,
        avgLeadTimeDays: orders.avgLeadTime,
        upcomingDeliveries: orders.upcomingDeliveries,
      },
      alerts: {
        total: alerts.summary.total,
        critical: alerts.summary.bySeverity[AlertSeverity.CRITICAL] || 0,
        warning: alerts.summary.bySeverity[AlertSeverity.WARNING] || 0,
        info: alerts.summary.bySeverity[AlertSeverity.INFO] || 0,
        unacknowledged: alerts.summary.criticalUnacknowledged,
        recentAlerts: alerts.recentAlerts.slice(0, 5).map(a => ({
          title: a.title,
          severity: a.severity,
          time: a.timestamps.createdAt,
        })),
      },
      trends: this.buildTrendCharts(oeeData, financial, quality),
    };

    this.setCache(cacheKey, dashboard);
    return dashboard;
  }

  // ============================================================================
  // OPERATIONS DASHBOARD
  // ============================================================================

  /**
   * Get comprehensive operations dashboard
   */
  async getOperationsDashboard(organizationId: string): Promise<OperationsDashboard> {
    const cacheKey = `ops:${organizationId}`;
    const cached = this.getCached<OperationsDashboard>(cacheKey);
    if (cached) return cached;

    const [
      shopFloor,
      bottlenecks,
      capacity,
      inventory,
      maintenance,
      workOrders,
      labor,
    ] = await Promise.all([
      this.heartbeatService.getShopFloorSnapshot(organizationId),
      this.bottleneckService.analyzeBottlenecks(organizationId),
      this.capacityService.getCapacityDashboard(organizationId),
      this.getInventoryStatus(organizationId),
      this.getMaintenanceSchedule(organizationId),
      this.getWorkOrderQueue(organizationId),
      this.getLaborStatus(organizationId),
    ]);

    const dashboard: OperationsDashboard = {
      floorStatus: {
        totalMachines: shopFloor.summary.totalMachines,
        byStatus: shopFloor.summary.byStatus,
        utilizationPercent: shopFloor.summary.overallUtilization,
        alarmsActive: shopFloor.machines.filter(m => m.status === 'ALARM').length,
        machineList: shopFloor.machines.map(m => ({
          id: m.machineId,
          name: m.machineName,
          status: m.status,
          currentJob: m.currentJob?.workOrderNumber,
          operator: m.currentJob?.operatorName,
        })),
      },
      workOrderQueue: workOrders,
      bottlenecks: {
        activeBottlenecks: bottlenecks.bottlenecks.length,
        criticalBottlenecks: bottlenecks.bottlenecks.filter(b => b.severity === 'CRITICAL').length,
        topBottlenecks: bottlenecks.bottlenecks.slice(0, 5).map(b => ({
          resource: b.resourceName,
          queueHours: b.metrics.queueHours,
          severity: b.severity,
        })),
        impactedOrders: bottlenecks.impactedOrders?.length || 0,
        mitigationsAvailable: bottlenecks.bottlenecks.reduce(
          (sum, b) => sum + (b.mitigations?.length || 0), 0
        ),
      },
      capacity: {
        overallUtilization: capacity.currentUtilization.overallUtilization,
        availableHours: capacity.currentUtilization.totalAvailableHours,
        scheduledHours: capacity.currentUtilization.scheduledHours,
        overtimeScheduled: capacity.currentUtilization.overtimeHours || 0,
        byWorkCenter: capacity.currentUtilization.byWorkCenter?.map(wc => ({
          name: wc.workCenterName,
          utilization: wc.utilization,
          available: wc.availableHours,
        })) || [],
      },
      inventory: inventory,
      laborSummary: labor,
      maintenanceSchedule: maintenance,
      shiftComparison: await this.getShiftComparison(organizationId),
    };

    this.setCache(cacheKey, dashboard);
    return dashboard;
  }

  // ============================================================================
  // PRODUCTION DASHBOARD
  // ============================================================================

  /**
   * Get comprehensive production dashboard
   */
  async getProductionDashboard(organizationId: string): Promise<ProductionDashboard> {
    const cacheKey = `prod:${organizationId}`;
    const cached = this.getCached<ProductionDashboard>(cacheKey);
    if (cached) return cached;

    const [
      shopFloor,
      oeeData,
      workOrders,
      cycleTime,
      downtime,
      qualityMetrics,
      operatorPerf,
    ] = await Promise.all([
      this.heartbeatService.getShopFloorSnapshot(organizationId),
      this.oeeService.getOeeDashboard(organizationId),
      this.getActiveWorkOrders(organizationId),
      this.getCycleTimeAnalysis(organizationId),
      this.getDowntimeAnalysis(organizationId),
      this.getProductionQualityMetrics(organizationId),
      this.getOperatorPerformance(organizationId),
    ]);

    const dashboard: ProductionDashboard = {
      realTimeStatus: {
        partsInLastHour: shopFloor.summary.partsProducedToday, // Simplified
        partsTarget: Math.round(shopFloor.summary.partsProducedToday * 1.1),
        cyclesCompleted: shopFloor.machines.reduce((sum, m) => sum + (m.telemetry?.cycleCount || 0), 0),
        avgCycleTime: cycleTime.avgActual,
        targetCycleTime: cycleTime.avgTarget,
        efficiency: oeeData.overallOee.performance,
      },
      machineGrid: shopFloor.machines.map(m => ({
        id: m.machineId,
        name: m.machineName,
        status: m.status,
        statusColor: this.getStatusColor(m.status),
        currentOee: m.telemetry?.efficiency || 0,
        currentJob: m.currentJob?.workOrderNumber,
        operator: m.currentJob?.operatorName,
        partsProduced: m.currentJob?.quantityCompleted || 0,
        partsTarget: m.currentJob?.quantityOrdered || 0,
        cycleTime: m.telemetry?.cycleTime || 0,
        targetCycleTime: cycleTime.avgTarget,
        utilization: m.telemetry?.utilization || 0,
        lastUpdate: new Date(),
      })),
      oeeMetrics: {
        overall: oeeData.overallOee.oee,
        availability: oeeData.overallOee.availability,
        performance: oeeData.overallOee.performance,
        quality: oeeData.overallOee.quality,
        target: 85,
        trend: {
          direction: oeeData.trend?.trend || 'STABLE',
          changePercent: oeeData.trend?.changePercent || 0,
          dataPoints: oeeData.trend?.dataPoints?.map(dp => ({
            timestamp: dp.timestamp,
            value: dp.oee,
          })) || [],
        },
        byMachine: oeeData.byMachine?.map(m => ({
          machineId: m.machineId,
          name: m.machineName,
          oee: m.oee,
        })) || [],
        byShift: [],
      },
      workOrderProgress: workOrders,
      cycleTimeAnalysis: cycleTime,
      downtimeAnalysis: downtime,
      qualityMetrics: qualityMetrics,
      operatorPerformance: operatorPerf,
    };

    this.setCache(cacheKey, dashboard);
    return dashboard;
  }

  // ============================================================================
  // CUSTOM DASHBOARD
  // ============================================================================

  /**
   * Get custom dashboard by ID
   */
  async getCustomDashboard(dashboardId: string): Promise<DashboardData> {
    const config = await this.getDashboardConfig(dashboardId);
    if (!config) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const widgets: WidgetData[] = await Promise.all(
      config.layout.map(async widget => {
        try {
          const data = await this.fetchWidgetData(widget, config.organizationId);
          return {
            widgetId: widget.widgetId,
            data,
            loading: false,
            lastUpdated: new Date(),
          };
        } catch (error) {
          return {
            widgetId: widget.widgetId,
            data: null,
            loading: false,
            error: error.message,
            lastUpdated: new Date(),
          };
        }
      }),
    );

    const refreshMs = config.refreshInterval * 1000;
    
    return {
      config,
      widgets,
      lastUpdated: new Date(),
      nextRefresh: new Date(Date.now() + refreshMs),
    };
  }

  /**
   * Create a new dashboard configuration
   */
  async createDashboard(
    organizationId: string,
    userId: string,
    name: string,
    view: DashboardView,
    layout: WidgetLayout[],
  ): Promise<DashboardConfig> {
    const config: DashboardConfig = {
      id: this.generateId(),
      name,
      view,
      layout,
      refreshInterval: RefreshInterval.NORMAL,
      timeRange: TimeRange.TODAY,
      filters: [],
      userId,
      organizationId,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // In real implementation, save to database
    return config;
  }

  /**
   * Update dashboard configuration
   */
  async updateDashboard(
    dashboardId: string,
    updates: Partial<DashboardConfig>,
  ): Promise<DashboardConfig> {
    const config = await this.getDashboardConfig(dashboardId);
    if (!config) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }

    const updated = {
      ...config,
      ...updates,
      updatedAt: new Date(),
    };

    // In real implementation, save to database
    return updated;
  }

  // ============================================================================
  // REAL-TIME UPDATES
  // ============================================================================

  /**
   * Get real-time updates for dashboard
   */
  async getRealTimeUpdates(
    organizationId: string,
    view: DashboardView,
    lastUpdate: Date,
  ): Promise<{
    hasUpdates: boolean;
    updates: Record<string, any>;
    timestamp: Date;
  }> {
    // Check for changes since last update
    const [
      shopFloor,
      alerts,
    ] = await Promise.all([
      this.heartbeatService.getShopFloorSnapshot(organizationId),
      this.alertService.getAlertFeed(organizationId, {}),
    ]);

    const updates: Record<string, any> = {};
    let hasUpdates = false;

    // Check for machine status changes
    const machineUpdates = shopFloor.machines.filter(
      m => m.lastUpdate && new Date(m.lastUpdate) > lastUpdate
    );
    if (machineUpdates.length > 0) {
      updates.machines = machineUpdates;
      hasUpdates = true;
    }

    // Check for new alerts
    const newAlerts = alerts.alerts.filter(
      a => a.timestamps.createdAt > lastUpdate
    );
    if (newAlerts.length > 0) {
      updates.alerts = newAlerts;
      hasUpdates = true;
    }

    return {
      hasUpdates,
      updates,
      timestamp: new Date(),
    };
  }

  // ============================================================================
  // SCHEDULED CACHE REFRESH
  // ============================================================================

  @Cron(CronExpression.EVERY_MINUTE)
  async refreshDashboardCache(): Promise<void> {
    // Clear stale cache entries
    const now = Date.now();
    for (const [key, { timestamp }] of this.dashboardCache) {
      if (now - timestamp.getTime() > this.CACHE_TTL_SECONDS * 1000 * 2) {
        this.dashboardCache.delete(key);
      }
    }
  }

  // ============================================================================
  // HELPER METHODS - DATA FETCHING
  // ============================================================================

  private async getQualityMetrics(organizationId: string): Promise<QualityOverview> {
    // Aggregate quality data from inspection results and NCRs
    const [inspections, ncrs, capas] = await Promise.all([
      this.prisma.inspectionResult.findMany({
        where: {
          workOrder: { organizationId },
          inspectedAt: { gte: this.getStartOfDay() },
        },
      }),
      this.prisma.nonConformanceReport.count({
        where: { organizationId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
      }),
      this.prisma.correctiveAction.count({
        where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
    ]);

    const passed = inspections.filter(i => i.result === 'PASS').length;
    const total = inspections.length || 1;

    return {
      firstPassYield: Math.round((passed / total) * 100),
      scrapRate: 2.5, // Would calculate from actual data
      reworkRate: 1.8,
      openNcrs: ncrs,
      openCapas: capas,
      customerComplaints: 0,
      trend: 'STABLE',
    };
  }

  private async getOrderMetrics(organizationId: string): Promise<{
    onTimeDelivery: number;
    shippedToday: number;
    atRisk: number;
    late: number;
    avgLeadTime: number;
    activeWorkOrders: number;
    completedToday: number;
    behindSchedule: number;
    upcomingDeliveries: any[];
  }> {
    const today = this.getStartOfDay();
    
    const [orders, shipments, workOrders] = await Promise.all([
      this.prisma.order.findMany({
        where: { organizationId },
        include: { shipments: true },
      }),
      this.prisma.shipment.findMany({
        where: {
          order: { organizationId },
          actualShipDate: { gte: today },
        },
      }),
      this.prisma.workOrder.findMany({
        where: { organizationId, status: { not: 'COMPLETED' } },
      }),
    ]);

    // Calculate on-time delivery
    const completedOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'SHIPPED');
    const onTime = completedOrders.filter(o => {
      const shipDate = o.shipments?.[0]?.actualShipDate;
      return shipDate && shipDate <= o.requestedDate;
    }).length;

    const atRiskOrders = orders.filter(o => {
      if (o.status === 'COMPLETED' || o.status === 'SHIPPED' || o.status === 'CANCELLED') return false;
      const daysToDelivery = Math.ceil((o.requestedDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysToDelivery <= 3 && daysToDelivery > 0;
    });

    const lateOrders = orders.filter(o => {
      if (o.status === 'COMPLETED' || o.status === 'SHIPPED' || o.status === 'CANCELLED') return false;
      return o.requestedDate < new Date();
    });

    return {
      onTimeDelivery: completedOrders.length > 0 ? Math.round((onTime / completedOrders.length) * 100) : 100,
      shippedToday: shipments.length,
      atRisk: atRiskOrders.length,
      late: lateOrders.length,
      avgLeadTime: 14, // Would calculate from actual data
      activeWorkOrders: workOrders.filter(wo => wo.status === 'IN_PROGRESS').length,
      completedToday: workOrders.filter(wo => 
        wo.status === 'COMPLETED' && wo.completedAt && wo.completedAt >= today
      ).length,
      behindSchedule: workOrders.filter(wo => 
        wo.status !== 'COMPLETED' && wo.scheduledEnd && wo.scheduledEnd < new Date()
      ).length,
      upcomingDeliveries: orders
        .filter(o => o.status !== 'COMPLETED' && o.status !== 'SHIPPED' && o.status !== 'CANCELLED')
        .sort((a, b) => a.requestedDate.getTime() - b.requestedDate.getTime())
        .slice(0, 5)
        .map(o => ({
          orderNumber: o.orderNumber,
          customer: '', // Would join with customer
          dueDate: o.requestedDate,
          status: o.status,
        })),
    };
  }

  private async getInventoryStatus(organizationId: string): Promise<InventorySummary> {
    const inventory = await this.prisma.inventoryItem.findMany({
      where: { organizationId },
      include: { part: true },
    });

    const lowStock = inventory.filter(i => 
      i.quantityOnHand.lessThanOrEqualTo(i.reorderPoint || 0)
    );
    const outOfStock = inventory.filter(i => i.quantityOnHand.lessThanOrEqualTo(0));
    const expiring = inventory.filter(i => {
      if (!i.expirationDate) return false;
      const daysToExpiry = Math.ceil((i.expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return daysToExpiry <= 30 && daysToExpiry > 0;
    });

    return {
      lowStockItems: lowStock.length,
      outOfStock: outOfStock.length,
      expiringItems: expiring.length,
      pendingReceipts: 0, // Would query purchase orders
      criticalShortages: lowStock.slice(0, 5).map(i => ({
        partNumber: i.part?.partNumber || 'Unknown',
        name: i.part?.name || 'Unknown',
        needed: Number(i.reorderPoint || 0),
        available: Number(i.quantityOnHand),
      })),
    };
  }

  private async getMaintenanceSchedule(organizationId: string): Promise<MaintenanceItem[]> {
    const maintenance = await this.prisma.maintenanceSchedule.findMany({
      where: {
        machine: { organizationId },
        status: { in: ['SCHEDULED', 'OVERDUE'] },
      },
      include: { machine: true },
      orderBy: { nextDueDate: 'asc' },
      take: 10,
    });

    return maintenance.map(m => ({
      machineId: m.machineId,
      machineName: m.machine.name,
      maintenanceType: m.maintenanceType,
      dueDate: m.nextDueDate,
      status: m.nextDueDate < new Date() ? 'OVERDUE' : 
              m.nextDueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'DUE' : 'UPCOMING',
      estimatedDuration: m.estimatedDuration || 60,
    }));
  }

  private async getWorkOrderQueue(organizationId: string): Promise<WorkOrderQueueSummary> {
    const workOrders = await this.prisma.workOrder.findMany({
      where: { organizationId },
    });

    const today = this.getStartOfDay();
    const inProgress = workOrders.filter(wo => wo.status === 'IN_PROGRESS');
    const queued = workOrders.filter(wo => wo.status === 'QUEUED' || wo.status === 'RELEASED');
    const completedToday = workOrders.filter(wo => 
      wo.status === 'COMPLETED' && wo.completedAt && wo.completedAt >= today
    );

    const onTime = workOrders.filter(wo => 
      wo.status !== 'COMPLETED' && wo.scheduledEnd && wo.scheduledEnd >= new Date()
    );
    const late = workOrders.filter(wo => 
      wo.status !== 'COMPLETED' && wo.scheduledEnd && wo.scheduledEnd < new Date()
    );

    return {
      total: workOrders.length,
      inProgress: inProgress.length,
      queued: queued.length,
      completedToday: completedToday.length,
      onTime: onTime.length,
      atRisk: 0, // Would calculate based on progress vs schedule
      late: late.length,
      priorityBreakdown: {
        HIGH: workOrders.filter(wo => wo.priority === 'HIGH').length,
        NORMAL: workOrders.filter(wo => wo.priority === 'NORMAL').length,
        LOW: workOrders.filter(wo => wo.priority === 'LOW').length,
      },
    };
  }

  private async getLaborStatus(organizationId: string): Promise<LaborSummary> {
    // Would integrate with HR/time tracking system
    return {
      operatorsOnShift: 12,
      operatorsAvailable: 10,
      avgEfficiency: 87,
      overtimeHours: 4,
      absentToday: 2,
    };
  }

  private async getShiftComparison(organizationId: string): Promise<ShiftComparison> {
    // Would calculate from shift data
    return {
      currentShift: {
        shiftName: 'Day Shift',
        startTime: new Date(this.getStartOfDay().getTime() + 6 * 60 * 60 * 1000),
        endTime: new Date(this.getStartOfDay().getTime() + 14 * 60 * 60 * 1000),
        partsProduced: 450,
        oee: 82,
        scrapRate: 2.1,
        efficiency: 88,
        downtime: 45,
      },
    };
  }

  private async getActiveWorkOrders(organizationId: string): Promise<WorkOrderProgressItem[]> {
    const workOrders = await this.prisma.workOrder.findMany({
      where: { organizationId, status: { in: ['IN_PROGRESS', 'RELEASED'] } },
      include: { part: true, operations: true },
      take: 20,
    });

    return workOrders.map(wo => ({
      id: wo.id,
      workOrderNumber: wo.workOrderNumber,
      partNumber: wo.part.partNumber,
      partName: wo.part.name,
      quantityOrdered: wo.quantity,
      quantityCompleted: wo.quantityCompleted,
      quantityInProgress: wo.quantity - wo.quantityCompleted,
      completionPercent: Math.round((wo.quantityCompleted / wo.quantity) * 100),
      status: wo.status,
      dueDate: wo.scheduledEnd || wo.dueDate,
      estimatedCompletion: wo.scheduledEnd || new Date(),
      currentOperation: wo.operations?.[0]?.operationType || 'Unknown',
      isOnTime: !wo.scheduledEnd || wo.scheduledEnd >= new Date(),
    }));
  }

  private async getCycleTimeAnalysis(organizationId: string): Promise<CycleTimeAnalysis> {
    // Would analyze from production data
    return {
      avgActual: 45,
      avgTarget: 42,
      variance: 3,
      variancePercent: 7.1,
      byPart: [],
      byMachine: [],
      histogram: [
        { range: '35-40', count: 15 },
        { range: '40-45', count: 28 },
        { range: '45-50', count: 22 },
        { range: '50-55', count: 8 },
        { range: '55+', count: 3 },
      ],
    };
  }

  private async getDowntimeAnalysis(organizationId: string): Promise<DowntimeAnalysis> {
    // Would analyze from machine events
    return {
      totalMinutes: 180,
      plannedMinutes: 120,
      unplannedMinutes: 60,
      byReason: [
        { reason: 'Setup/Changeover', minutes: 60, percent: 33 },
        { reason: 'Break', minutes: 45, percent: 25 },
        { reason: 'Material Wait', minutes: 30, percent: 17 },
        { reason: 'Machine Fault', minutes: 25, percent: 14 },
        { reason: 'Other', minutes: 20, percent: 11 },
      ],
      byMachine: [],
      trend: [],
    };
  }

  private async getProductionQualityMetrics(organizationId: string): Promise<ProductionQualityMetrics> {
    // Would aggregate from inspection data
    return {
      firstPassYield: 97.5,
      scrapCount: 12,
      scrapCost: 450,
      reworkCount: 8,
      reworkCost: 280,
      defectsByType: [
        { type: 'Dimensional', count: 8 },
        { type: 'Surface', count: 6 },
        { type: 'Material', count: 4 },
        { type: 'Assembly', count: 2 },
      ],
      defectsByPart: [],
    };
  }

  private async getOperatorPerformance(organizationId: string): Promise<OperatorPerformanceItem[]> {
    // Would aggregate from production and time tracking data
    return [
      {
        operatorId: '1',
        operatorName: 'John Smith',
        partsProduced: 145,
        efficiency: 94,
        qualityRate: 99.2,
        machinesOperated: 2,
        hoursWorked: 7.5,
        ranking: 1,
      },
      {
        operatorId: '2',
        operatorName: 'Jane Doe',
        partsProduced: 138,
        efficiency: 91,
        qualityRate: 98.8,
        machinesOperated: 3,
        hoursWorked: 7.5,
        ranking: 2,
      },
    ];
  }

  // ============================================================================
  // HELPER METHODS - CALCULATIONS
  // ============================================================================

  private calculateHealthScore(metrics: {
    oee: number;
    quality: number;
    delivery: number;
    alerts: number;
  }): number {
    // Weighted score calculation
    const oeeScore = (metrics.oee / 100) * 30;
    const qualityScore = (metrics.quality / 100) * 25;
    const deliveryScore = (metrics.delivery / 100) * 25;
    const alertPenalty = Math.min(metrics.alerts * 5, 20);
    
    return Math.round(oeeScore + qualityScore + deliveryScore + (20 - alertPenalty));
  }

  private getHealthLabel(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL' {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 75) return 'GOOD';
    if (score >= 60) return 'FAIR';
    if (score >= 40) return 'POOR';
    return 'CRITICAL';
  }

  private identifyTopIssues(bottlenecks: any, alerts: any, orders: any): string[] {
    const issues: string[] = [];
    
    if (bottlenecks.bottlenecks?.length > 0) {
      const critical = bottlenecks.bottlenecks.filter((b: any) => b.severity === 'CRITICAL');
      if (critical.length > 0) {
        issues.push(`${critical.length} critical bottleneck(s) affecting production`);
      }
    }
    
    if (alerts.summary?.criticalUnacknowledged > 0) {
      issues.push(`${alerts.summary.criticalUnacknowledged} unacknowledged critical alert(s)`);
    }
    
    if (orders.late > 0) {
      issues.push(`${orders.late} order(s) past due date`);
    }
    
    if (orders.atRisk > 0) {
      issues.push(`${orders.atRisk} order(s) at risk of missing delivery`);
    }
    
    return issues.slice(0, 5);
  }

  private generateRecommendations(healthScore: number, bottlenecks: any, oeeData: any): string[] {
    const recommendations: string[] = [];
    
    if (healthScore < 75) {
      recommendations.push('Review and address critical bottlenecks immediately');
    }
    
    if (oeeData.overallOee?.oee < 75) {
      recommendations.push('Focus on OEE improvement - current level below target');
    }
    
    if (bottlenecks.bottlenecks?.length > 3) {
      recommendations.push('Consider capacity expansion or workload rebalancing');
    }
    
    return recommendations.slice(0, 3);
  }

  private buildKpiCards(oeeData: any, financial: any, quality: any, orders: any): KpiCard[] {
    return [
      {
        id: 'oee',
        name: 'OEE',
        value: oeeData.overallOee?.oee || 0,
        unit: '%',
        target: 85,
        achievementPercent: Math.round(((oeeData.overallOee?.oee || 0) / 85) * 100),
        trend: 'STABLE',
        trendPercent: 0,
        sparkline: [],
        status: (oeeData.overallOee?.oee || 0) >= 85 ? 'ON_TARGET' : 
                (oeeData.overallOee?.oee || 0) >= 75 ? 'WARNING' : 'CRITICAL',
      },
      {
        id: 'quality',
        name: 'First Pass Yield',
        value: quality.firstPassYield || 0,
        unit: '%',
        target: 98,
        achievementPercent: Math.round(((quality.firstPassYield || 0) / 98) * 100),
        trend: 'STABLE',
        trendPercent: 0,
        sparkline: [],
        status: (quality.firstPassYield || 0) >= 98 ? 'ON_TARGET' : 
                (quality.firstPassYield || 0) >= 95 ? 'WARNING' : 'CRITICAL',
      },
      {
        id: 'delivery',
        name: 'On-Time Delivery',
        value: orders.onTimeDelivery || 0,
        unit: '%',
        target: 95,
        achievementPercent: Math.round(((orders.onTimeDelivery || 0) / 95) * 100),
        trend: 'STABLE',
        trendPercent: 0,
        sparkline: [],
        status: (orders.onTimeDelivery || 0) >= 95 ? 'ON_TARGET' : 
                (orders.onTimeDelivery || 0) >= 90 ? 'WARNING' : 'CRITICAL',
      },
    ];
  }

  private buildRevenueForecast(financial: any): { date: Date; projected: number; actual?: number }[] {
    // Would build from cash flow data
    return [];
  }

  private buildTrendCharts(oeeData: any, financial: any, quality: any): TrendChart[] {
    return [
      {
        id: 'oee-trend',
        title: 'OEE Trend',
        metric: 'oee',
        data: oeeData.trend?.dataPoints?.map((dp: any) => ({
          timestamp: dp.timestamp,
          value: dp.oee,
        })) || [],
        target: 85,
        unit: '%',
      },
    ];
  }

  private getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      RUNNING: '#22c55e',
      IDLE: '#eab308',
      SETUP: '#3b82f6',
      MAINTENANCE: '#8b5cf6',
      ALARM: '#ef4444',
      OFFLINE: '#6b7280',
      WARMUP: '#f97316',
      BREAKDOWN: '#dc2626',
    };
    return colors[status] || '#6b7280';
  }

  private async getDashboardConfig(dashboardId: string): Promise<DashboardConfig | null> {
    // Would load from database
    return null;
  }

  private async fetchWidgetData(widget: WidgetLayout, organizationId: string): Promise<any> {
    // Fetch data based on widget configuration
    switch (widget.config.dataSource) {
      case 'oee':
        return this.oeeService.getOeeDashboard(organizationId);
      case 'bottlenecks':
        return this.bottleneckService.analyzeBottlenecks(organizationId);
      case 'alerts':
        return this.alertService.getAlertDashboard(organizationId);
      default:
        return null;
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getStartOfDay(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private getCached<T>(key: string): T | null {
    const cached = this.dashboardCache.get(key);
    if (!cached) return null;
    
    const age = (Date.now() - cached.timestamp.getTime()) / 1000;
    if (age > this.CACHE_TTL_SECONDS) {
      this.dashboardCache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.dashboardCache.set(key, { data, timestamp: new Date() });
  }
}
