import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';

import { ProductionHeartbeatService } from '../services/production-heartbeat.service';
import { OeeCalculationService, OeePeriod } from '../services/oee-calculation.service';
import { BottleneckDetectionService, DisruptionType } from '../services/bottleneck-detection.service';
import { FinancialPerformanceService } from '../services/financial-performance.service';
import { CapacityPlanningService } from '../services/capacity-planning.service';
import { AlertManagementService, AlertCategory, AlertSeverity, AlertStatus, AlertFilter } from '../services/alert-management.service';
import { DashboardAggregatorService, DashboardView, TimeRange } from '../services/dashboard-aggregator.service';

// ============================================================================
// DTOs
// ============================================================================

class AcknowledgeAlertDto {
  notes?: string;
}

class ResolveAlertDto {
  resolution: string;
  rootCause?: string;
}

class EscalateAlertDto {
  reason: string;
  targetLevel?: string;
}

class SuppressAlertDto {
  reason: string;
  durationMinutes?: number;
}

class AddAlertNoteDto {
  note: string;
}

class CreateAlertDto {
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  sourceType: string;
  sourceId: string;
  sourceName: string;
  context?: Record<string, any>;
  tags?: string[];
}

class BulkAlertActionDto {
  alertIds: string[];
  notes?: string;
  resolution?: string;
}

class AlertFilterDto {
  categories?: AlertCategory[];
  severities?: AlertSeverity[];
  statuses?: AlertStatus[];
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
  tags?: string[];
  limit?: number;
  cursor?: string;
}

class SimulateScenarioDto {
  resourceId: string;
  resourceType: string;
  disruptionType: DisruptionType;
  durationHours?: number;
  impactPercent?: number;
}

class CreateDashboardDto {
  name: string;
  view: DashboardView;
  layout: any[];
}

class UpdateDashboardDto {
  name?: string;
  layout?: any[];
  refreshInterval?: number;
  timeRange?: TimeRange;
  filters?: any[];
}

// ============================================================================
// CONTROLLER
// ============================================================================

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/dashboard')
export class DashboardEnhancementsController {
  constructor(
    private readonly heartbeatService: ProductionHeartbeatService,
    private readonly oeeService: OeeCalculationService,
    private readonly bottleneckService: BottleneckDetectionService,
    private readonly financialService: FinancialPerformanceService,
    private readonly capacityService: CapacityPlanningService,
    private readonly alertService: AlertManagementService,
    private readonly aggregatorService: DashboardAggregatorService,
  ) {}

  // ============================================================================
  // AGGREGATED DASHBOARDS
  // ============================================================================

  @Get('executive')
  @Roles('admin', 'manager', 'executive')
  @ApiOperation({ summary: 'Get executive dashboard with KPIs and high-level metrics' })
  @ApiResponse({ status: 200, description: 'Executive dashboard data' })
  async getExecutiveDashboard(@Request() req: any) {
    return this.aggregatorService.getExecutiveDashboard(req.user.organizationId);
  }

  @Get('operations')
  @Roles('admin', 'manager', 'supervisor', 'planner')
  @ApiOperation({ summary: 'Get operations dashboard with floor status and work orders' })
  @ApiResponse({ status: 200, description: 'Operations dashboard data' })
  async getOperationsDashboard(@Request() req: any) {
    return this.aggregatorService.getOperationsDashboard(req.user.organizationId);
  }

  @Get('production')
  @Roles('admin', 'manager', 'supervisor', 'operator')
  @ApiOperation({ summary: 'Get production dashboard with real-time machine data' })
  @ApiResponse({ status: 200, description: 'Production dashboard data' })
  async getProductionDashboard(@Request() req: any) {
    return this.aggregatorService.getProductionDashboard(req.user.organizationId);
  }

  @Get('custom/:dashboardId')
  @ApiOperation({ summary: 'Get custom dashboard by ID' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Custom dashboard data' })
  async getCustomDashboard(@Param('dashboardId') dashboardId: string) {
    return this.aggregatorService.getCustomDashboard(dashboardId);
  }

  @Post('custom')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Create a custom dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createCustomDashboard(
    @Request() req: any,
    @Body() dto: CreateDashboardDto,
  ) {
    return this.aggregatorService.createDashboard(
      req.user.organizationId,
      req.user.id,
      dto.name,
      dto.view,
      dto.layout,
    );
  }

  @Put('custom/:dashboardId')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Update a custom dashboard' })
  @ApiParam({ name: 'dashboardId', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  async updateCustomDashboard(
    @Param('dashboardId') dashboardId: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.aggregatorService.updateDashboard(dashboardId, dto);
  }

  @Get('updates')
  @ApiOperation({ summary: 'Get real-time updates since last timestamp' })
  @ApiQuery({ name: 'view', enum: DashboardView })
  @ApiQuery({ name: 'lastUpdate', description: 'ISO timestamp of last update' })
  @ApiResponse({ status: 200, description: 'Dashboard updates' })
  async getRealTimeUpdates(
    @Request() req: any,
    @Query('view') view: DashboardView,
    @Query('lastUpdate') lastUpdate: string,
  ) {
    return this.aggregatorService.getRealTimeUpdates(
      req.user.organizationId,
      view,
      new Date(lastUpdate),
    );
  }

  // ============================================================================
  // PRODUCTION HEARTBEAT
  // ============================================================================

  @Get('heartbeat/snapshot')
  @ApiOperation({ summary: 'Get real-time shop floor snapshot' })
  @ApiResponse({ status: 200, description: 'Shop floor snapshot with all machines' })
  async getShopFloorSnapshot(@Request() req: any) {
    return this.heartbeatService.getShopFloorSnapshot(req.user.organizationId);
  }

  @Get('heartbeat/machines')
  @ApiOperation({ summary: 'Get all machine statuses' })
  @ApiResponse({ status: 200, description: 'List of machine nodes' })
  async getMachineNodes(@Request() req: any) {
    return this.heartbeatService.getMachineNodes(req.user.organizationId);
  }

  @Get('heartbeat/machines/:machineId')
  @ApiOperation({ summary: 'Get detailed machine status' })
  @ApiParam({ name: 'machineId', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Machine detail panel' })
  async getMachineDetail(
    @Request() req: any,
    @Param('machineId') machineId: string,
  ) {
    return this.heartbeatService.getMachineDetail(req.user.organizationId, machineId);
  }

  @Get('heartbeat/floor-plan')
  @ApiOperation({ summary: 'Get floor plan layout' })
  @ApiResponse({ status: 200, description: 'Floor plan with machine positions' })
  async getFloorPlan(@Request() req: any) {
    return this.heartbeatService.getFloorPlan(req.user.organizationId);
  }

  @Get('heartbeat/historical')
  @ApiOperation({ summary: 'Get historical comparison' })
  @ApiQuery({ name: 'comparisonType', enum: ['1h', '4h', '24h', 'custom'] })
  @ApiQuery({ name: 'customTime', required: false, description: 'ISO timestamp for custom comparison' })
  @ApiResponse({ status: 200, description: 'Historical comparison data' })
  async getHistoricalComparison(
    @Request() req: any,
    @Query('comparisonType') comparisonType: string,
    @Query('customTime') customTime?: string,
  ) {
    return this.heartbeatService.getHistoricalComparison(
      req.user.organizationId,
      comparisonType as any,
      customTime ? new Date(customTime) : undefined,
    );
  }

  // ============================================================================
  // OEE METRICS
  // ============================================================================

  @Get('oee')
  @ApiOperation({ summary: 'Get OEE dashboard' })
  @ApiResponse({ status: 200, description: 'OEE dashboard with metrics' })
  async getOeeDashboard(@Request() req: any) {
    return this.oeeService.getOeeDashboard(req.user.organizationId);
  }

  @Get('oee/machine/:machineId')
  @ApiOperation({ summary: 'Get OEE for specific machine' })
  @ApiParam({ name: 'machineId', description: 'Machine ID' })
  @ApiQuery({ name: 'period', enum: OeePeriod })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiResponse({ status: 200, description: 'Machine OEE calculation' })
  async getMachineOee(
    @Param('machineId') machineId: string,
    @Query('period') period: OeePeriod = OeePeriod.SHIFT,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.oeeService.calculateMachineOee(
      machineId,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('oee/losses')
  @ApiOperation({ summary: 'Get OEE loss breakdown' })
  @ApiQuery({ name: 'period', enum: OeePeriod })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiResponse({ status: 200, description: 'Loss breakdown with Pareto analysis' })
  async getLossBreakdown(
    @Request() req: any,
    @Query('period') period: OeePeriod = OeePeriod.SHIFT,
    @Query('machineId') machineId?: string,
  ) {
    return this.oeeService.getLossBreakdown(req.user.organizationId, period, machineId);
  }

  @Get('oee/trend')
  @ApiOperation({ summary: 'Get OEE trend' })
  @ApiQuery({ name: 'trendPeriod', enum: ['HOUR', 'SHIFT', 'DAY', 'WEEK'] })
  @ApiQuery({ name: 'machineId', required: false })
  @ApiResponse({ status: 200, description: 'OEE trend data' })
  async getOeeTrend(
    @Request() req: any,
    @Query('trendPeriod') trendPeriod: string = 'SHIFT',
    @Query('machineId') machineId?: string,
  ) {
    return this.oeeService.getOeeTrend(req.user.organizationId, trendPeriod as any, machineId);
  }

  // ============================================================================
  // BOTTLENECK DETECTION
  // ============================================================================

  @Get('bottlenecks')
  @ApiOperation({ summary: 'Analyze current bottlenecks' })
  @ApiResponse({ status: 200, description: 'Bottleneck analysis' })
  async analyzeBottlenecks(@Request() req: any) {
    return this.bottleneckService.analyzeBottlenecks(req.user.organizationId);
  }

  @Get('bottlenecks/queue/:resourceType/:resourceId')
  @ApiOperation({ summary: 'Get queue analysis for specific resource' })
  @ApiParam({ name: 'resourceType', description: 'WORK_CENTER, MACHINE, or OPERATION_TYPE' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: 200, description: 'Queue analysis' })
  async getQueueAnalysis(
    @Request() req: any,
    @Param('resourceType') resourceType: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.bottleneckService.getQueueAnalysis(req.user.organizationId, resourceType, resourceId);
  }

  @Get('bottlenecks/:bottleneckId/mitigations')
  @ApiOperation({ summary: 'Get mitigation recommendations for bottleneck' })
  @ApiParam({ name: 'bottleneckId', description: 'Bottleneck ID' })
  @ApiResponse({ status: 200, description: 'Mitigation recommendations' })
  async getMitigations(@Param('bottleneckId') bottleneckId: string) {
    // This would need to look up the bottleneck first
    return this.bottleneckService.generateMitigations({
      id: bottleneckId,
      resourceType: 'WORK_CENTER' as any,
      resourceId: '',
      resourceName: '',
      severity: 'MEDIUM' as any,
      score: 50,
      metrics: {
        queueDepth: 0,
        queueHours: 0,
        avgWaitTime: 0,
        maxWaitTime: 0,
        utilizationPercent: 0,
        capacityAvailable: 0,
        capacityRequired: 0,
      },
      trend: 'STABLE' as any,
      affectedWorkOrders: [],
    });
  }

  @Post('bottlenecks/simulate')
  @Roles('admin', 'manager', 'planner')
  @ApiOperation({ summary: 'Simulate a disruption scenario' })
  @ApiResponse({ status: 200, description: 'Simulation results' })
  async simulateScenario(
    @Request() req: any,
    @Body() dto: SimulateScenarioDto,
  ) {
    return this.bottleneckService.simulateScenario(
      req.user.organizationId,
      dto.resourceId,
      dto.resourceType,
      dto.disruptionType,
      dto.durationHours,
      dto.impactPercent,
    );
  }

  // ============================================================================
  // FINANCIAL PERFORMANCE
  // ============================================================================

  @Get('financial')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: 'Get financial dashboard' })
  @ApiResponse({ status: 200, description: 'Financial dashboard' })
  async getFinancialDashboard(@Request() req: any) {
    return this.financialService.getFinancialDashboard(req.user.organizationId);
  }

  @Get('financial/revenue')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: 'Get revenue snapshot' })
  @ApiResponse({ status: 200, description: 'Revenue snapshot' })
  async getRevenueSnapshot(@Request() req: any) {
    return this.financialService.getRevenueSnapshot(req.user.organizationId);
  }

  @Get('financial/revenue/events')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: 'Get recent revenue events' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Recent revenue events' })
  async getRevenueEvents(
    @Request() req: any,
    @Query('limit') limit?: number,
  ) {
    return this.financialService.getRecentRevenueEvents(req.user.organizationId, limit);
  }

  @Get('financial/margin')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: 'Get margin snapshot' })
  @ApiResponse({ status: 200, description: 'Margin snapshot' })
  async getMarginSnapshot(@Request() req: any) {
    return this.financialService.getMarginSnapshot(req.user.organizationId);
  }

  @Get('financial/jobs/:jobId/costs')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: 'Get job cost detail' })
  @ApiParam({ name: 'jobId', description: 'Work order or job ID' })
  @ApiResponse({ status: 200, description: 'Job cost breakdown' })
  async getJobCostDetail(@Param('jobId') jobId: string) {
    return this.financialService.getJobCostDetail(jobId);
  }

  @Get('financial/cashflow')
  @Roles('admin', 'manager', 'finance')
  @ApiOperation({ summary: 'Get cash flow forecast' })
  @ApiQuery({ name: 'days', required: false, description: 'Forecast horizon in days' })
  @ApiResponse({ status: 200, description: 'Cash flow forecast' })
  async getCashFlowForecast(
    @Request() req: any,
    @Query('days') days?: number,
  ) {
    return this.financialService.getCashFlowForecast(req.user.organizationId, days);
  }

  // ============================================================================
  // CAPACITY PLANNING
  // ============================================================================

  @Get('capacity')
  @Roles('admin', 'manager', 'planner')
  @ApiOperation({ summary: 'Get capacity dashboard' })
  @ApiResponse({ status: 200, description: 'Capacity dashboard' })
  async getCapacityDashboard(@Request() req: any) {
    return this.capacityService.getCapacityDashboard(req.user.organizationId);
  }

  @Get('capacity/utilization')
  @Roles('admin', 'manager', 'planner')
  @ApiOperation({ summary: 'Get current capacity utilization' })
  @ApiResponse({ status: 200, description: 'Capacity utilization' })
  async getCapacityUtilization(@Request() req: any) {
    return this.capacityService.getCurrentUtilization(req.user.organizationId);
  }

  @Get('capacity/forecast')
  @Roles('admin', 'manager', 'planner')
  @ApiOperation({ summary: 'Get capacity forecast' })
  @ApiQuery({ name: 'weeks', required: false })
  @ApiResponse({ status: 200, description: 'Capacity forecast' })
  async getCapacityForecast(
    @Request() req: any,
    @Query('weeks') weeks?: number,
  ) {
    return this.capacityService.getCapacityForecast(req.user.organizationId, weeks);
  }

  @Get('capacity/recommendations')
  @Roles('admin', 'manager', 'planner')
  @ApiOperation({ summary: 'Get capacity recommendations' })
  @ApiResponse({ status: 200, description: 'Capacity recommendations' })
  async getCapacityRecommendations(@Request() req: any) {
    return this.capacityService.getCapacityRecommendations(req.user.organizationId);
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  @Get('alerts')
  @ApiOperation({ summary: 'Get alert feed' })
  @ApiResponse({ status: 200, description: 'Alert feed with filtering' })
  async getAlertFeed(
    @Request() req: any,
    @Query() filter: AlertFilterDto,
  ) {
    const alertFilter: AlertFilter = {
      categories: filter.categories,
      severities: filter.severities,
      statuses: filter.statuses,
      dateRange: filter.startDate && filter.endDate 
        ? { start: new Date(filter.startDate), end: new Date(filter.endDate) }
        : undefined,
      searchTerm: filter.searchTerm,
      tags: filter.tags,
      limit: filter.limit,
      cursor: filter.cursor,
    };
    
    return this.alertService.getAlertFeed(req.user.organizationId, alertFilter);
  }

  @Get('alerts/dashboard')
  @ApiOperation({ summary: 'Get alert dashboard' })
  @ApiResponse({ status: 200, description: 'Alert dashboard with summary' })
  async getAlertDashboard(@Request() req: any) {
    return this.alertService.getAlertDashboard(req.user.organizationId);
  }

  @Get('alerts/attention')
  @ApiOperation({ summary: 'Get alerts requiring attention' })
  @ApiResponse({ status: 200, description: 'Active and escalated alerts' })
  async getAlertsRequiringAttention(@Request() req: any) {
    return this.alertService.getAlertsRequiringAttention(req.user.organizationId);
  }

  @Get('alerts/trend/:period')
  @ApiOperation({ summary: 'Get alert trend' })
  @ApiParam({ name: 'period', enum: ['24h', '7d', '30d'] })
  @ApiResponse({ status: 200, description: 'Alert trend data' })
  async getAlertTrend(
    @Request() req: any,
    @Param('period') period: '24h' | '7d' | '30d',
  ) {
    return this.alertService.getAlertTrend(req.user.organizationId, period);
  }

  @Get('alerts/rules')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get alert rules' })
  @ApiResponse({ status: 200, description: 'Alert rules' })
  async getAlertRules(@Request() req: any) {
    return this.alertService.getAlertRules(req.user.organizationId);
  }

  @Get('alerts/policies')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get escalation policies' })
  @ApiResponse({ status: 200, description: 'Escalation policies' })
  async getEscalationPolicies(@Request() req: any) {
    return this.alertService.getEscalationPolicies(req.user.organizationId);
  }

  @Get('alerts/:alertId')
  @ApiOperation({ summary: 'Get alert by ID' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert details' })
  async getAlert(@Param('alertId') alertId: string) {
    return this.alertService.getAlertById(alertId);
  }

  @Get('alerts/source/:sourceType/:sourceId')
  @ApiOperation({ summary: 'Get alerts for specific source' })
  @ApiParam({ name: 'sourceType', description: 'Source type (MACHINE, WORK_ORDER, etc.)' })
  @ApiParam({ name: 'sourceId', description: 'Source ID' })
  @ApiResponse({ status: 200, description: 'Alerts for source' })
  async getAlertsForSource(
    @Request() req: any,
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.alertService.getAlertsForSource(req.user.organizationId, sourceType, sourceId);
  }

  @Post('alerts')
  @Roles('admin', 'manager', 'supervisor')
  @ApiOperation({ summary: 'Create a new alert' })
  @ApiResponse({ status: 201, description: 'Alert created' })
  async createAlert(
    @Request() req: any,
    @Body() dto: CreateAlertDto,
  ) {
    return this.alertService.createAlert(
      req.user.organizationId,
      dto.category,
      dto.severity,
      dto.title,
      dto.message,
      {
        type: dto.sourceType as any,
        id: dto.sourceId,
        name: dto.sourceName,
      },
      dto.context,
      dto.tags,
    );
  }

  @Post('alerts/:alertId/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Request() req: any,
    @Param('alertId') alertId: string,
    @Body() dto: AcknowledgeAlertDto,
  ) {
    return this.alertService.acknowledgeAlert(alertId, req.user.id, dto.notes);
  }

  @Post('alerts/:alertId/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(
    @Request() req: any,
    @Param('alertId') alertId: string,
    @Body() dto: ResolveAlertDto,
  ) {
    return this.alertService.resolveAlert(alertId, req.user.id, dto.resolution, dto.rootCause);
  }

  @Post('alerts/:alertId/escalate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate an alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert escalated' })
  async escalateAlert(
    @Request() req: any,
    @Param('alertId') alertId: string,
    @Body() dto: EscalateAlertDto,
  ) {
    return this.alertService.escalateAlert(alertId, req.user.id, dto.reason, dto.targetLevel as any);
  }

  @Post('alerts/:alertId/suppress')
  @HttpCode(HttpStatus.OK)
  @Roles('admin', 'manager', 'supervisor')
  @ApiOperation({ summary: 'Suppress an alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert suppressed' })
  async suppressAlert(
    @Request() req: any,
    @Param('alertId') alertId: string,
    @Body() dto: SuppressAlertDto,
  ) {
    return this.alertService.suppressAlert(alertId, req.user.id, dto.reason, dto.durationMinutes);
  }

  @Post('alerts/:alertId/notes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add note to alert' })
  @ApiParam({ name: 'alertId', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Note added' })
  async addAlertNote(
    @Request() req: any,
    @Param('alertId') alertId: string,
    @Body() dto: AddAlertNoteDto,
  ) {
    return this.alertService.addAlertNote(alertId, req.user.id, dto.note);
  }

  @Post('alerts/bulk/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk acknowledge alerts' })
  @ApiResponse({ status: 200, description: 'Alerts acknowledged' })
  async bulkAcknowledge(
    @Request() req: any,
    @Body() dto: BulkAlertActionDto,
  ) {
    return this.alertService.bulkAcknowledge(dto.alertIds, req.user.id, dto.notes);
  }

  @Post('alerts/bulk/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk resolve alerts' })
  @ApiResponse({ status: 200, description: 'Alerts resolved' })
  async bulkResolve(
    @Request() req: any,
    @Body() dto: BulkAlertActionDto,
  ) {
    return this.alertService.bulkResolve(dto.alertIds, req.user.id, dto.resolution || 'Bulk resolved');
  }
}
