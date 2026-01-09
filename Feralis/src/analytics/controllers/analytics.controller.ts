/**
 * Feralis Manufacturing Platform
 * Analytics Controller - REST API endpoints for analytics and reporting
 * Phase 7: Analytics & Customer Portal Implementation
 */

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
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AnalyticsService } from '../services/analytics.service';
import {
  ExecuteReportRequestDto,
  KPIDashboardRequestDto,
  CreateDashboardRequestDto,
  UpdateDashboardRequestDto,
  AnalyticsSummaryRequestDto,
  AcknowledgeAlertDto,
  ResolveAlertDto,
} from '../dto/analytics.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Analytics')
@Controller('api/v1/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============================================================================
  // REPORT ENDPOINTS
  // ============================================================================

  @Get('reports')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'SALES_MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Get list of available reports' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by report type' })
  @ApiQuery({ name: 'module', required: false, description: 'Filter by module' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name/description' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of reports' })
  async getReports(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('module') module?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.analyticsService.getReports(
      user.organizationId,
      user.id,
      user.roles,
      { type, module, search },
      { page: page || 1, pageSize: pageSize || 20 },
    );
  }

  @Get('reports/:id')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'SALES_MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Get report definition by ID' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report definition' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const report = await this.analyticsService.getReportById(
      id,
      user.organizationId,
      user.id,
      user.roles,
    );
    if (!report) {
      throw new HttpException('Report not found', HttpStatus.NOT_FOUND);
    }
    return report;
  }

  @Post('reports/:id/execute')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'SALES_MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Execute a report' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report execution results' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async executeReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) request: ExecuteReportRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.executeReport(
      id,
      user.organizationId,
      user.id,
      user.roles,
      request,
    );
  }

  // ============================================================================
  // KPI ENDPOINTS
  // ============================================================================

  @Get('kpis')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Get list of KPI definitions' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by category' })
  @ApiQuery({ name: 'featured', required: false, type: Boolean, description: 'Filter featured KPIs' })
  @ApiResponse({ status: 200, description: 'List of KPI definitions' })
  async getKPIs(
    @CurrentUser() user: any,
    @Query('category') category?: string,
    @Query('featured') featured?: boolean,
  ) {
    return this.analyticsService.getKPIs(user.organizationId, { category, featured });
  }

  @Get('kpis/:id')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Get KPI definition by ID' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiResponse({ status: 200, description: 'KPI definition' })
  @ApiResponse({ status: 404, description: 'KPI not found' })
  async getKPI(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const kpi = await this.analyticsService.getKPIById(id, user.organizationId);
    if (!kpi) {
      throw new HttpException('KPI not found', HttpStatus.NOT_FOUND);
    }
    return kpi;
  }

  @Get('kpis/:id/snapshot')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Get current KPI snapshot with trend data' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiResponse({ status: 200, description: 'KPI snapshot' })
  @ApiResponse({ status: 404, description: 'KPI not found' })
  async getKPISnapshot(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getKPISnapshot(id, user.organizationId);
  }

  @Post('kpis/:id/calculate')
  @Roles('ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Trigger KPI calculation' })
  @ApiParam({ name: 'id', description: 'KPI ID' })
  @ApiResponse({ status: 200, description: 'KPI value calculated' })
  async calculateKPI(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.calculateKPIValue(id, user.organizationId);
  }

  @Post('kpis/dashboard')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Get KPI dashboard data' })
  @ApiResponse({ status: 200, description: 'KPI dashboard data' })
  async getKPIDashboard(
    @Body(ValidationPipe) request: KPIDashboardRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getKPIDashboard(user.organizationId, request);
  }

  // ============================================================================
  // DASHBOARD ENDPOINTS
  // ============================================================================

  @Get('dashboards')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER', 'SALES_MANAGER')
  @ApiOperation({ summary: 'Get list of dashboards' })
  @ApiResponse({ status: 200, description: 'List of dashboards' })
  async getDashboards(@CurrentUser() user: any) {
    return this.analyticsService.getDashboards(
      user.organizationId,
      user.id,
      user.roles,
    );
  }

  @Get('dashboards/default')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER', 'SALES_MANAGER')
  @ApiOperation({ summary: 'Get default dashboard for current user/role' })
  @ApiResponse({ status: 200, description: 'Default dashboard' })
  async getDefaultDashboard(@CurrentUser() user: any) {
    return this.analyticsService.getDefaultDashboard(
      user.organizationId,
      user.id,
      user.roles?.[0],
    );
  }

  @Get('dashboards/:id')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER', 'SALES_MANAGER')
  @ApiOperation({ summary: 'Get dashboard by ID' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard definition' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async getDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    const dashboard = await this.analyticsService.getDashboardById(
      id,
      user.organizationId,
      user.id,
      user.roles,
    );
    if (!dashboard) {
      throw new HttpException('Dashboard not found', HttpStatus.NOT_FOUND);
    }
    return dashboard;
  }

  @Post('dashboards')
  @Roles('ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Create a new dashboard' })
  @ApiResponse({ status: 201, description: 'Dashboard created' })
  async createDashboard(
    @Body(ValidationPipe) request: CreateDashboardRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.createDashboard(
      user.organizationId,
      user.id,
      request,
    );
  }

  @Put('dashboards/:id')
  @Roles('ADMIN', 'OPERATIONS_MANAGER')
  @ApiOperation({ summary: 'Update a dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard updated' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async updateDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) request: UpdateDashboardRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.updateDashboard(
      id,
      user.organizationId,
      user.id,
      request,
    );
  }

  @Delete('dashboards/:id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a dashboard' })
  @ApiParam({ name: 'id', description: 'Dashboard ID' })
  @ApiResponse({ status: 200, description: 'Dashboard deleted' })
  @ApiResponse({ status: 404, description: 'Dashboard not found' })
  async deleteDashboard(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.deleteDashboard(
      id,
      user.organizationId,
      user.id,
    );
  }

  // ============================================================================
  // ANALYTICS SUMMARY ENDPOINTS
  // ============================================================================

  @Post('summary')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR')
  @ApiOperation({ summary: 'Get comprehensive analytics summary' })
  @ApiResponse({ status: 200, description: 'Analytics summary data' })
  async getAnalyticsSummary(
    @Body(ValidationPipe) request: AnalyticsSummaryRequestDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getAnalyticsSummary(user.organizationId, request);
  }

  @Get('production/daily')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR')
  @ApiOperation({ summary: 'Get daily production summaries' })
  @ApiQuery({ name: 'startDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: true, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'facilityId', required: false, description: 'Filter by facility' })
  @ApiResponse({ status: 200, description: 'Daily production summaries' })
  async getDailyProductionSummaries(
    @CurrentUser() user: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.analyticsService.getDailyProductionSummaries(
      user.organizationId,
      new Date(startDate),
      new Date(endDate),
      facilityId,
    );
  }

  @Get('customers/performance')
  @Roles('ADMIN', 'EXECUTIVE', 'SALES_MANAGER')
  @ApiOperation({ summary: 'Get customer performance summaries' })
  @ApiQuery({ name: 'periodType', required: false, description: 'Period type (MONTH, QUARTER, YEAR)' })
  @ApiQuery({ name: 'periodStart', required: true, description: 'Period start date' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Filter by customer' })
  @ApiResponse({ status: 200, description: 'Customer performance summaries' })
  async getCustomerPerformance(
    @CurrentUser() user: any,
    @Query('periodStart') periodStart: string,
    @Query('periodType') periodType?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.analyticsService.getCustomerPerformanceSummaries(
      user.organizationId,
      periodType || 'MONTH',
      new Date(periodStart),
      customerId,
    );
  }

  // ============================================================================
  // ALERT ENDPOINTS
  // ============================================================================

  @Get('alerts')
  @Roles('ADMIN', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Get active analytics alerts' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'acknowledged', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'List of active alerts' })
  async getAlerts(
    @CurrentUser() user: any,
    @Query('severity') severity?: string,
    @Query('acknowledged') acknowledged?: boolean,
  ) {
    return this.analyticsService.getActiveAlerts(
      user.organizationId,
      { severity, acknowledged },
    );
  }

  @Post('alerts/:id/acknowledge')
  @Roles('ADMIN', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  @ApiParam({ name: 'id', description: 'Alert instance ID' })
  @ApiResponse({ status: 200, description: 'Alert acknowledged' })
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) request: AcknowledgeAlertDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.acknowledgeAlert(
      id,
      user.organizationId,
      user.id,
      request.notes,
    );
  }

  @Post('alerts/:id/resolve')
  @Roles('ADMIN', 'OPERATIONS_MANAGER', 'PRODUCTION_SUPERVISOR', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Resolve an alert' })
  @ApiParam({ name: 'id', description: 'Alert instance ID' })
  @ApiResponse({ status: 200, description: 'Alert resolved' })
  async resolveAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) request: ResolveAlertDto,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.resolveAlert(
      id,
      user.organizationId,
      user.id,
      request.notes,
    );
  }

  // ============================================================================
  // EXPORT ENDPOINTS
  // ============================================================================

  @Post('reports/:id/export')
  @Roles('ADMIN', 'EXECUTIVE', 'OPERATIONS_MANAGER', 'SALES_MANAGER', 'QUALITY_MANAGER')
  @ApiOperation({ summary: 'Export report to file' })
  @ApiParam({ name: 'id', description: 'Report ID' })
  @ApiQuery({ name: 'format', required: true, description: 'Export format (CSV, XLSX, PDF)' })
  @ApiResponse({ status: 200, description: 'Export file URL' })
  async exportReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('format') format: string,
    @Body(ValidationPipe) request: ExecuteReportRequestDto,
    @CurrentUser() user: any,
  ) {
    // Execute report and format for export
    const result = await this.analyticsService.executeReport(
      id,
      user.organizationId,
      user.id,
      user.roles,
      { ...request, page: 1, pageSize: 10000 }, // Get all data for export
    );

    // TODO: Implement actual file generation with export service
    return {
      format,
      rowCount: result.data?.length || 0,
      downloadUrl: `/api/v1/analytics/exports/${id}?format=${format}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
  }

  // ============================================================================
  // SCHEDULED JOBS ENDPOINTS (Admin only)
  // ============================================================================

  @Post('jobs/daily-summary')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Trigger daily production summary calculation' })
  @ApiResponse({ status: 200, description: 'Summary calculation started' })
  async triggerDailySummary(@CurrentUser() user: any) {
    await this.analyticsService.calculateDailyProductionSummary(
      user.organizationId,
      new Date(),
    );
    return { message: 'Daily summary calculation completed' };
  }

  @Post('jobs/kpi-calculation')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Trigger scheduled KPI calculations' })
  @ApiResponse({ status: 200, description: 'KPI calculations started' })
  async triggerKPICalculations(@CurrentUser() user: any) {
    await this.analyticsService.runScheduledKPICalculations(user.organizationId);
    return { message: 'KPI calculations completed' };
  }
}
