/**
 * Feralis Manufacturing Platform
 * Analytics Service (Fixed - Prisma Version)
 * Phase 7: Analytics & Customer Portal Implementation
 * 
 * CHANGES FROM ORIGINAL:
 * - Removed TypeORM repository injections
 * - Now uses PrismaService for all database operations
 * - All repository methods replaced with Prisma client methods
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ReportDefinition,
  ReportExecution,
  KpiDefinition,
  KpiValue,
  Dashboard,
  DashboardWidget,
  AnalyticsAlert,
  AlertInstance,
  DailyProductionSummary,
  CustomerPerformanceSummary,
  Prisma,
} from '@prisma/client';

// ============================================================================
// DTOs (Inline for service - can be moved to dto file)
// ============================================================================

interface CreateReportDto {
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  reportType: string;
  queryDefinition: any;
  parameters?: any[];
  columns?: any[];
  outputFormats?: string[];
  defaultFormat?: string;
  isScheduled?: boolean;
  scheduleConfig?: any;
  isPublic?: boolean;
  allowedRoles?: string[];
  createdBy?: string;
}

interface ExecuteReportDto {
  reportId: string;
  parameters?: any;
  outputFormat?: string;
  executedBy: string;
}

interface CreateKpiDto {
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  category: string;
  calculationType: string;
  calculation: any;
  unit?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  thresholdDirection?: string;
  calculationInterval?: string;
  displayFormat?: string;
  chartType?: string;
  createdBy?: string;
}

interface CreateDashboardDto {
  organizationId: string;
  name: string;
  code: string;
  description?: string;
  layout?: any;
  theme?: string;
  isPublic?: boolean;
  isDefault?: boolean;
  allowedRoles?: string[];
  ownerId?: string;
  autoRefreshSeconds?: number;
  createdBy?: string;
}

interface CreateWidgetDto {
  dashboardId: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  widgetType: string;
  title?: string;
  config?: any;
  dataSourceType: string;
  dataSourceId?: string;
  customQuery?: any;
}

interface CreateAlertDto {
  organizationId: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig: any;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  messageTemplate: string;
  notificationChannels?: string[];
  recipients?: any[];
  escalationConfig?: any;
  createdBy?: string;
}

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // REPORT MANAGEMENT
  // ==========================================================================

  async createReport(dto: CreateReportDto): Promise<ReportDefinition> {
    return this.prisma.reportDefinition.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        category: dto.category,
        reportType: dto.reportType,
        queryDefinition: dto.queryDefinition,
        parameters: dto.parameters || [],
        columns: dto.columns || [],
        outputFormats: dto.outputFormats || ['PDF', 'EXCEL', 'CSV'],
        defaultFormat: dto.defaultFormat || 'PDF',
        isScheduled: dto.isScheduled || false,
        scheduleConfig: dto.scheduleConfig,
        isPublic: dto.isPublic || false,
        allowedRoles: dto.allowedRoles || [],
        createdBy: dto.createdBy,
      },
    });
  }

  async getReports(
    organizationId: string,
    options?: {
      category?: string;
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ reports: ReportDefinition[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReportDefinitionWhereInput = {
      organizationId,
      isActive: true,
      ...(options?.category && { category: options.category }),
      ...(options?.status && { status: options.status as any }),
    };

    const [reports, total] = await Promise.all([
      this.prisma.reportDefinition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.reportDefinition.count({ where }),
    ]);

    return { reports, total };
  }

  async getReport(id: string): Promise<ReportDefinition> {
    const report = await this.prisma.reportDefinition.findUnique({
      where: { id },
      include: {
        executions: {
          take: 10,
          orderBy: { executedAt: 'desc' },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report ${id} not found`);
    }

    return report;
  }

  async executeReport(dto: ExecuteReportDto): Promise<ReportExecution> {
    const report = await this.getReport(dto.reportId);

    // Create execution record
    const execution = await this.prisma.reportExecution.create({
      data: {
        organizationId: report.organizationId,
        reportId: dto.reportId,
        executedBy: dto.executedBy,
        parameters: dto.parameters || {},
        status: 'PENDING',
        outputFormat: dto.outputFormat || report.defaultFormat,
      },
    });

    // Execute report asynchronously
    this.executeReportAsync(execution.id, report, dto.parameters);

    return execution;
  }

  private async executeReportAsync(
    executionId: string,
    report: ReportDefinition,
    parameters: any
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update status to running
      await this.prisma.reportExecution.update({
        where: { id: executionId },
        data: { status: 'RUNNING' },
      });

      // Execute the query (simplified - in production, use query builder)
      const queryDef = report.queryDefinition as any;
      // ... execute query based on queryDefinition ...

      // For now, simulate execution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update with results
      await this.prisma.reportExecution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETE',
          executionTimeMs: Date.now() - startTime,
          rowCount: 0, // Would be actual count
          outputUrl: `/api/v1/analytics/reports/executions/${executionId}/download`,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });
    } catch (error) {
      this.logger.error(`Report execution failed: ${error.message}`, error.stack);

      await this.prisma.reportExecution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          executionTimeMs: Date.now() - startTime,
          errorMessage: error.message,
        },
      });
    }
  }

  async getReportExecution(id: string): Promise<ReportExecution> {
    const execution = await this.prisma.reportExecution.findUnique({
      where: { id },
      include: { report: true },
    });

    if (!execution) {
      throw new NotFoundException(`Report execution ${id} not found`);
    }

    return execution;
  }

  // ==========================================================================
  // KPI MANAGEMENT
  // ==========================================================================

  async createKpi(dto: CreateKpiDto): Promise<KpiDefinition> {
    return this.prisma.kpiDefinition.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        category: dto.category,
        calculationType: dto.calculationType,
        calculation: dto.calculation,
        unit: dto.unit,
        targetValue: dto.targetValue,
        warningThreshold: dto.warningThreshold,
        criticalThreshold: dto.criticalThreshold,
        thresholdDirection: dto.thresholdDirection || 'ABOVE',
        calculationInterval: dto.calculationInterval || 'HOURLY',
        displayFormat: dto.displayFormat,
        chartType: dto.chartType,
        createdBy: dto.createdBy,
      },
    });
  }

  async getKpis(
    organizationId: string,
    options?: {
      category?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<{ kpis: KpiDefinition[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.KpiDefinitionWhereInput = {
      organizationId,
      isActive: true,
      ...(options?.category && { category: options.category }),
    };

    const [kpis, total] = await Promise.all([
      this.prisma.kpiDefinition.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.kpiDefinition.count({ where }),
    ]);

    return { kpis, total };
  }

  async getKpiSnapshot(
    organizationId: string,
    kpiIds?: string[]
  ): Promise<Array<{ kpi: KpiDefinition; currentValue: KpiValue | null }>> {
    const where: Prisma.KpiDefinitionWhereInput = {
      organizationId,
      isActive: true,
      ...(kpiIds && { id: { in: kpiIds } }),
    };

    const kpis = await this.prisma.kpiDefinition.findMany({
      where,
      include: {
        values: {
          take: 1,
          orderBy: { calculatedAt: 'desc' },
        },
      },
    });

    return kpis.map((kpi) => ({
      kpi,
      currentValue: kpi.values[0] || null,
    }));
  }

  async getKpiHistory(
    kpiId: string,
    startDate: Date,
    endDate: Date
  ): Promise<KpiValue[]> {
    return this.prisma.kpiValue.findMany({
      where: {
        kpiId,
        calculatedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { calculatedAt: 'asc' },
    });
  }

  async calculateKpi(kpiId: string): Promise<KpiValue> {
    const kpi = await this.prisma.kpiDefinition.findUnique({
      where: { id: kpiId },
    });

    if (!kpi) {
      throw new NotFoundException(`KPI ${kpiId} not found`);
    }

    const calculation = kpi.calculation as any;
    let value = 0;
    let status = 'NORMAL';

    // Execute calculation based on type
    switch (kpi.calculationType) {
      case 'QUERY':
        // Execute SQL query
        // value = await this.executeKpiQuery(calculation);
        break;
      case 'FORMULA':
        // Evaluate formula
        // value = await this.evaluateKpiFormula(calculation);
        break;
      case 'AGGREGATE':
        // Calculate aggregate
        // value = await this.calculateKpiAggregate(calculation);
        break;
    }

    // Determine status based on thresholds
    const numValue = Number(value);
    const target = kpi.targetValue ? Number(kpi.targetValue) : null;
    const warning = kpi.warningThreshold ? Number(kpi.warningThreshold) : null;
    const critical = kpi.criticalThreshold ? Number(kpi.criticalThreshold) : null;

    if (kpi.thresholdDirection === 'ABOVE') {
      if (critical && numValue >= critical) status = 'CRITICAL';
      else if (warning && numValue >= warning) status = 'WARNING';
    } else {
      if (critical && numValue <= critical) status = 'CRITICAL';
      else if (warning && numValue <= warning) status = 'WARNING';
    }

    const now = new Date();
    return this.prisma.kpiValue.create({
      data: {
        kpiId,
        calculatedAt: now,
        value,
        periodStart: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
        periodEnd: now,
        status,
      },
    });
  }

  // ==========================================================================
  // DASHBOARD MANAGEMENT
  // ==========================================================================

  async createDashboard(dto: CreateDashboardDto): Promise<Dashboard> {
    return this.prisma.dashboard.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        code: dto.code,
        description: dto.description,
        layout: dto.layout || {},
        theme: dto.theme || 'DEFAULT',
        isPublic: dto.isPublic || false,
        isDefault: dto.isDefault || false,
        allowedRoles: dto.allowedRoles || [],
        ownerId: dto.ownerId,
        autoRefreshSeconds: dto.autoRefreshSeconds || 300,
        createdBy: dto.createdBy,
      },
    });
  }

  async getDashboards(
    organizationId: string,
    userId?: string
  ): Promise<Dashboard[]> {
    return this.prisma.dashboard.findMany({
      where: {
        organizationId,
        isActive: true,
        OR: [
          { isPublic: true },
          { ownerId: userId },
        ],
      },
      include: {
        widgets: {
          where: { isActive: true },
          orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async getDashboard(id: string): Promise<Dashboard> {
    const dashboard = await this.prisma.dashboard.findUnique({
      where: { id },
      include: {
        widgets: {
          where: { isActive: true },
          orderBy: [{ positionY: 'asc' }, { positionX: 'asc' }],
        },
      },
    });

    if (!dashboard) {
      throw new NotFoundException(`Dashboard ${id} not found`);
    }

    return dashboard;
  }

  async addWidget(dto: CreateWidgetDto): Promise<DashboardWidget> {
    // Verify dashboard exists
    await this.getDashboard(dto.dashboardId);

    return this.prisma.dashboardWidget.create({
      data: {
        dashboardId: dto.dashboardId,
        positionX: dto.positionX,
        positionY: dto.positionY,
        width: dto.width,
        height: dto.height,
        widgetType: dto.widgetType,
        title: dto.title,
        config: dto.config || {},
        dataSourceType: dto.dataSourceType,
        dataSourceId: dto.dataSourceId,
        customQuery: dto.customQuery,
      },
    });
  }

  async updateWidgetLayout(
    dashboardId: string,
    widgets: Array<{ id: string; positionX: number; positionY: number; width: number; height: number }>
  ): Promise<void> {
    await this.prisma.$transaction(
      widgets.map((w) =>
        this.prisma.dashboardWidget.update({
          where: { id: w.id },
          data: {
            positionX: w.positionX,
            positionY: w.positionY,
            width: w.width,
            height: w.height,
          },
        })
      )
    );
  }

  // ==========================================================================
  // ALERT MANAGEMENT
  // ==========================================================================

  async createAlert(dto: CreateAlertDto): Promise<AnalyticsAlert> {
    return this.prisma.analyticsAlert.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        description: dto.description,
        triggerType: dto.triggerType,
        triggerConfig: dto.triggerConfig,
        severity: dto.severity || 'INFO',
        messageTemplate: dto.messageTemplate,
        notificationChannels: dto.notificationChannels || ['IN_APP'],
        recipients: dto.recipients || [],
        escalationConfig: dto.escalationConfig,
        createdBy: dto.createdBy,
      },
    });
  }

  async getAlerts(
    organizationId: string,
    options?: {
      severity?: string;
      isActive?: boolean;
    }
  ): Promise<AnalyticsAlert[]> {
    return this.prisma.analyticsAlert.findMany({
      where: {
        organizationId,
        ...(options?.severity && { severity: options.severity as any }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
      },
      orderBy: [{ severity: 'asc' }, { name: 'asc' }],
    });
  }

  async getActiveAlertInstances(
    organizationId: string
  ): Promise<AlertInstance[]> {
    const alerts = await this.prisma.analyticsAlert.findMany({
      where: { organizationId, isActive: true },
      select: { id: true },
    });

    return this.prisma.alertInstance.findMany({
      where: {
        alertId: { in: alerts.map((a) => a.id) },
        status: { in: ['ACTIVE', 'ESCALATED'] },
      },
      include: { alert: true },
      orderBy: { triggeredAt: 'desc' },
    });
  }

  async acknowledgeAlert(
    instanceId: string,
    userId: string,
    notes?: string
  ): Promise<AlertInstance> {
    return this.prisma.alertInstance.update({
      where: { id: instanceId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        resolutionNotes: notes,
      },
    });
  }

  async resolveAlert(
    instanceId: string,
    userId: string,
    notes?: string
  ): Promise<AlertInstance> {
    return this.prisma.alertInstance.update({
      where: { id: instanceId },
      data: {
        status: 'RESOLVED',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNotes: notes,
      },
    });
  }

  // ==========================================================================
  // PRODUCTION SUMMARIES
  // ==========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async calculateDailyProductionSummary(): Promise<void> {
    this.logger.log('Calculating daily production summaries...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const organizations = await this.prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const org of organizations) {
      try {
        await this.calculateDailySummaryForOrg(org.id, yesterday);
      } catch (error) {
        this.logger.error(
          `Failed to calculate daily summary for org ${org.id}: ${error.message}`
        );
      }
    }

    this.logger.log('Daily production summary calculation complete');
  }

  private async calculateDailySummaryForOrg(
    organizationId: string,
    date: Date
  ): Promise<DailyProductionSummary> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Calculate metrics (simplified - would use actual queries)
    const totalPartsProduced = 0;
    const totalOrdersShipped = 0;
    const totalRevenueEarned = 0;
    const totalMachineHours = 0;
    const totalIdleHours = 0;
    const avgOee = 0;
    const totalInspections = 0;
    const passRate = 0;
    const ncrCount = 0;
    const totalLaborHours = 0;

    return this.prisma.dailyProductionSummary.upsert({
      where: {
        organizationId_facilityId_summaryDate: {
          organizationId,
          facilityId: null,
          summaryDate: startOfDay,
        },
      },
      create: {
        organizationId,
        summaryDate: startOfDay,
        totalPartsProduced,
        totalOrdersShipped,
        totalRevenueEarned,
        totalMachineHours,
        totalIdleHours,
        avgOee,
        totalInspections,
        passRate,
        ncrCount,
        totalLaborHours,
        byWorkCenter: {},
        byMachine: {},
        byShift: {},
        calculatedAt: new Date(),
      },
      update: {
        totalPartsProduced,
        totalOrdersShipped,
        totalRevenueEarned,
        totalMachineHours,
        totalIdleHours,
        avgOee,
        totalInspections,
        passRate,
        ncrCount,
        totalLaborHours,
        byWorkCenter: {},
        byMachine: {},
        byShift: {},
        calculatedAt: new Date(),
      },
    });
  }

  async getDailyProductionSummary(
    organizationId: string,
    startDate: Date,
    endDate: Date,
    facilityId?: string
  ): Promise<DailyProductionSummary[]> {
    return this.prisma.dailyProductionSummary.findMany({
      where: {
        organizationId,
        ...(facilityId && { facilityId }),
        summaryDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { summaryDate: 'asc' },
    });
  }

  // ==========================================================================
  // CUSTOMER PERFORMANCE
  // ==========================================================================

  async getCustomerPerformanceSummary(
    organizationId: string,
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CustomerPerformanceSummary | null> {
    return this.prisma.customerPerformanceSummary.findFirst({
      where: {
        organizationId,
        customerId,
        periodStart: { gte: startDate },
        periodEnd: { lte: endDate },
      },
    });
  }

  async calculateCustomerPerformance(
    organizationId: string,
    customerId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CustomerPerformanceSummary> {
    // Calculate metrics (simplified - would use actual queries)
    const totalOrders = 0;
    const totalRevenue = 0;
    const avgOrderValue = 0;
    const onTimeDeliveryRate = 0;
    const avgLeadTimeDays = 0;
    const qualityRejectRate = 0;
    const rmaCount = 0;
    const totalQuotes = 0;
    const quoteConversionRate = 0;

    return this.prisma.customerPerformanceSummary.upsert({
      where: {
        organizationId_customerId_periodStart_periodEnd: {
          organizationId,
          customerId,
          periodStart: startDate,
          periodEnd: endDate,
        },
      },
      create: {
        organizationId,
        customerId,
        periodStart: startDate,
        periodEnd: endDate,
        totalOrders,
        totalRevenue,
        avgOrderValue,
        onTimeDeliveryRate,
        avgLeadTimeDays,
        qualityRejectRate,
        rmaCount,
        totalQuotes,
        quoteConversionRate,
        calculatedAt: new Date(),
      },
      update: {
        totalOrders,
        totalRevenue,
        avgOrderValue,
        onTimeDeliveryRate,
        avgLeadTimeDays,
        qualityRejectRate,
        rmaCount,
        totalQuotes,
        quoteConversionRate,
        calculatedAt: new Date(),
      },
    });
  }
}
