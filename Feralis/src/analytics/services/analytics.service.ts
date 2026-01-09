/**
 * FERALIS MANUFACTURING PLATFORM
 * Phase 7: Analytics & Customer Portal
 * 
 * Analytics Service Implementation
 */

import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { 
  ReportDefinition,
  ReportExecution,
  KPIDefinition,
  KPIValue,
  Dashboard,
  DashboardWidget,
  AnalyticsAlert,
  AlertInstance,
  DailyProductionSummary,
  CustomerPerformanceSummary,
  ExecuteReportRequest,
  ExecuteReportResponse,
  KPIDashboardRequest,
  KPIDashboardResponse,
  KPISnapshot,
  CreateDashboardRequest,
  UpdateDashboardRequest,
  AnalyticsSummaryRequest,
  AnalyticsSummaryResponse,
  ReportStatus,
  KPICategory,
  PeriodType,
  TrendDirection,
  AlertSeverity
} from './entities/analytics.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository('ReportDefinition')
    private readonly reportRepo: Repository<ReportDefinition>,
    @InjectRepository('ReportExecution')
    private readonly executionRepo: Repository<ReportExecution>,
    @InjectRepository('KPIDefinition')
    private readonly kpiRepo: Repository<KPIDefinition>,
    @InjectRepository('KPIValue')
    private readonly kpiValueRepo: Repository<KPIValue>,
    @InjectRepository('Dashboard')
    private readonly dashboardRepo: Repository<Dashboard>,
    @InjectRepository('DashboardWidget')
    private readonly widgetRepo: Repository<DashboardWidget>,
    @InjectRepository('AnalyticsAlert')
    private readonly alertRepo: Repository<AnalyticsAlert>,
    @InjectRepository('AlertInstance')
    private readonly alertInstanceRepo: Repository<AlertInstance>,
    @InjectRepository('DailyProductionSummary')
    private readonly dailySummaryRepo: Repository<DailyProductionSummary>,
    @InjectRepository('CustomerPerformanceSummary')
    private readonly customerSummaryRepo: Repository<CustomerPerformanceSummary>,
  ) {}

  // ============================================================================
  // REPORT MANAGEMENT
  // ============================================================================

  async getReports(
    organizationId: string,
    userId: string,
    userRoles: string[],
    options: {
      status?: ReportStatus;
      type?: string;
      category?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ reports: ReportDefinition[]; total: number }> {
    const { status, type, category, search, page = 1, pageSize = 20 } = options;

    const queryBuilder = this.reportRepo.createQueryBuilder('report')
      .where('report.organizationId = :organizationId', { organizationId })
      .andWhere('report.deletedAt IS NULL')
      .andWhere(
        '(report.isPublic = true OR report.ownerId = :userId OR report.sharedWithRoles && :userRoles OR :userId = ANY(report.sharedWithUsers))',
        { userId, userRoles }
      );

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('report.reportType = :type', { type });
    }

    if (category) {
      queryBuilder.andWhere('report.category = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(report.name ILIKE :search OR report.description ILIKE :search OR report.code ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    const [reports, total] = await queryBuilder
      .orderBy('report.name', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { reports, total };
  }

  async getReportById(
    organizationId: string,
    reportId: string,
    userId: string,
    userRoles: string[]
  ): Promise<ReportDefinition> {
    const report = await this.reportRepo.findOne({
      where: {
        id: reportId,
        organizationId,
        deletedAt: null
      }
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Check access
    if (
      !report.isPublic &&
      report.ownerId !== userId &&
      !userRoles.some(role => report.sharedWithRoles.includes(role)) &&
      !report.sharedWithUsers.includes(userId)
    ) {
      throw new ForbiddenException('Access denied to this report');
    }

    return report;
  }

  async executeReport(
    organizationId: string,
    userId: string,
    userRoles: string[],
    request: ExecuteReportRequest
  ): Promise<ExecuteReportResponse> {
    const report = await this.getReportById(
      organizationId,
      request.reportId,
      userId,
      userRoles
    );

    const execution = await this.executionRepo.save({
      reportId: report.id,
      organizationId,
      executedBy: userId,
      executionType: 'MANUAL',
      parametersUsed: request.parameters || {},
      filtersApplied: request.filters || [],
      startedAt: new Date(),
      status: 'RUNNING'
    });

    try {
      const startTime = Date.now();
      
      // Build and execute query
      const queryResult = await this.executeReportQuery(
        report,
        request.parameters || {},
        request.filters || [],
        request.page || 1,
        request.pageSize || 100
      );

      const endTime = Date.now();

      // Update execution record
      await this.executionRepo.update(execution.id, {
        completedAt: new Date(),
        durationMs: endTime - startTime,
        rowCount: queryResult.totalRows,
        status: 'COMPLETED'
      });

      return {
        executionId: execution.id,
        reportId: report.id,
        data: queryResult.data,
        totalRows: queryResult.totalRows,
        page: request.page || 1,
        pageSize: request.pageSize || 100,
        executionTime: endTime - startTime,
        columns: report.columns
      };
    } catch (error) {
      await this.executionRepo.update(execution.id, {
        completedAt: new Date(),
        status: 'FAILED',
        errorMessage: error.message
      });
      throw error;
    }
  }

  private async executeReportQuery(
    report: ReportDefinition,
    parameters: Record<string, any>,
    filters: any[],
    page: number,
    pageSize: number
  ): Promise<{ data: any[]; totalRows: number }> {
    const { queryDefinition } = report;
    
    // Build SQL query from definition
    let sql = this.buildSelectClause(queryDefinition);
    sql += this.buildFromClause(queryDefinition);
    sql += this.buildJoinClauses(queryDefinition);
    sql += this.buildWhereClause(queryDefinition, parameters, filters);
    sql += this.buildGroupByClause(queryDefinition);
    sql += this.buildOrderByClause(queryDefinition);

    // Count query
    const countSql = `SELECT COUNT(*) as total FROM (${sql}) as subquery`;
    const countResult = await this.dataSource.query(countSql);
    const totalRows = parseInt(countResult[0]?.total || '0', 10);

    // Paginated query
    const offset = (page - 1) * pageSize;
    const paginatedSql = `${sql} LIMIT ${pageSize} OFFSET ${offset}`;
    const data = await this.dataSource.query(paginatedSql);

    return { data, totalRows };
  }

  private buildSelectClause(query: any): string {
    const fields = query.selectFields.map((f: any) => {
      if (f.aggregate) {
        return `${f.aggregate}(${f.field}) AS ${f.alias || f.field}`;
      }
      if (f.formula) {
        return `(${f.formula}) AS ${f.alias || f.field}`;
      }
      return f.alias ? `${f.field} AS ${f.alias}` : f.field;
    });
    return `SELECT ${fields.join(', ')}`;
  }

  private buildFromClause(query: any): string {
    return ` FROM ${query.baseTable}`;
  }

  private buildJoinClauses(query: any): string {
    if (!query.joins || query.joins.length === 0) return '';
    
    return query.joins.map((j: any) => {
      const alias = j.alias ? ` AS ${j.alias}` : '';
      return ` ${j.type} JOIN ${j.table}${alias} ON ${j.on}`;
    }).join('');
  }

  private buildWhereClause(query: any, params: Record<string, any>, filters: any[]): string {
    const conditions: string[] = [];

    // Add conditions from query definition
    if (query.whereConditions) {
      for (const cond of query.whereConditions) {
        const value = cond.parameterName ? params[cond.parameterName] : cond.value;
        conditions.push(this.buildCondition(cond.field, cond.operator, value));
      }
    }

    // Add runtime filters
    for (const filter of filters) {
      conditions.push(this.buildCondition(filter.field, filter.operator, filter.value));
    }

    return conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
  }

  private buildCondition(field: string, operator: string, value: any): string {
    switch (operator) {
      case 'EQ': return `${field} = '${value}'`;
      case 'NE': return `${field} != '${value}'`;
      case 'GT': return `${field} > '${value}'`;
      case 'GTE': return `${field} >= '${value}'`;
      case 'LT': return `${field} < '${value}'`;
      case 'LTE': return `${field} <= '${value}'`;
      case 'IN': return `${field} IN (${value.map((v: any) => `'${v}'`).join(', ')})`;
      case 'NOT_IN': return `${field} NOT IN (${value.map((v: any) => `'${v}'`).join(', ')})`;
      case 'LIKE': return `${field} ILIKE '%${value}%'`;
      case 'BETWEEN': return `${field} BETWEEN '${value[0]}' AND '${value[1]}'`;
      case 'IS_NULL': return `${field} IS NULL`;
      case 'IS_NOT_NULL': return `${field} IS NOT NULL`;
      default: return `${field} = '${value}'`;
    }
  }

  private buildGroupByClause(query: any): string {
    if (!query.groupBy || query.groupBy.length === 0) return '';
    return ` GROUP BY ${query.groupBy.join(', ')}`;
  }

  private buildOrderByClause(query: any): string {
    if (!query.orderBy || query.orderBy.length === 0) return '';
    const orderClauses = query.orderBy.map((o: any) => `${o.field} ${o.direction}`);
    return ` ORDER BY ${orderClauses.join(', ')}`;
  }

  // ============================================================================
  // KPI MANAGEMENT
  // ============================================================================

  async getKPIs(
    organizationId: string,
    options: KPIDashboardRequest = {}
  ): Promise<KPIDashboardResponse> {
    const { category, featured, facilityId, periodType = PeriodType.DAY } = options;

    const whereConditions: any = {
      organizationId,
      isActive: true
    };

    if (category) {
      whereConditions.category = category;
    }

    if (featured !== undefined) {
      whereConditions.isFeatured = featured;
    }

    const kpis = await this.kpiRepo.find({
      where: whereConditions,
      order: { displayOrder: 'ASC', name: 'ASC' }
    });

    const kpiSnapshots: KPISnapshot[] = await Promise.all(
      kpis.map(kpi => this.getKPISnapshot(kpi, facilityId, periodType))
    );

    return {
      kpis: kpiSnapshots,
      lastUpdated: new Date()
    };
  }

  async getKPIById(
    organizationId: string,
    kpiId: string
  ): Promise<KPIDefinition> {
    const kpi = await this.kpiRepo.findOne({
      where: { id: kpiId, organizationId }
    });

    if (!kpi) {
      throw new NotFoundException('KPI not found');
    }

    return kpi;
  }

  async getKPISnapshot(
    kpi: KPIDefinition,
    facilityId?: string,
    periodType: PeriodType = PeriodType.DAY
  ): Promise<KPISnapshot> {
    const now = new Date();
    const periodStart = this.getPeriodStart(now, periodType);
    const previousPeriodStart = this.getPreviousPeriodStart(periodStart, periodType);

    // Get current value
    const currentValue = await this.kpiValueRepo.findOne({
      where: {
        kpiId: kpi.id,
        periodType,
        periodStart,
        ...(facilityId && { facilityId })
      },
      order: { calculatedAt: 'DESC' }
    });

    // Get previous value
    const previousValue = await this.kpiValueRepo.findOne({
      where: {
        kpiId: kpi.id,
        periodType,
        periodStart: previousPeriodStart,
        ...(facilityId && { facilityId })
      },
      order: { calculatedAt: 'DESC' }
    });

    // Get sparkline data (last 30 periods)
    const sparklineStart = this.getSparklineStart(now, periodType);
    const sparklineValues = await this.kpiValueRepo.find({
      where: {
        kpiId: kpi.id,
        periodType,
        periodStart: MoreThanOrEqual(sparklineStart),
        ...(facilityId && { facilityId })
      },
      order: { periodStart: 'ASC' }
    });

    // Calculate trend
    const trend = this.calculateTrend(currentValue, previousValue);

    return {
      kpi,
      currentValue: currentValue || this.createEmptyKPIValue(kpi.id, periodStart, periodType),
      previousValue,
      trend,
      sparklineData: sparklineValues.map(v => ({
        date: v.periodStart,
        value: v.value
      }))
    };
  }

  async calculateKPIValue(
    organizationId: string,
    kpiId: string,
    facilityId?: string,
    periodType: PeriodType = PeriodType.DAY
  ): Promise<KPIValue> {
    const kpi = await this.getKPIById(organizationId, kpiId);
    
    const now = new Date();
    const periodStart = this.getPeriodStart(now, periodType);
    const periodEnd = this.getPeriodEnd(periodStart, periodType);
    const previousPeriodStart = this.getPreviousPeriodStart(periodStart, periodType);

    // Execute calculation query
    const queryParams = {
      start_date: periodStart,
      end_date: periodEnd,
      target_date: periodStart,
      organization_id: organizationId,
      facility_id: facilityId
    };

    let query = kpi.calculationQuery;
    for (const [key, value] of Object.entries(queryParams)) {
      query = query.replace(new RegExp(`:${key}`, 'g'), `'${value}'`);
    }

    const result = await this.dataSource.query(query);
    const value = parseFloat(result[0]?.value || '0');

    // Get previous value for comparison
    const previousValue = await this.kpiValueRepo.findOne({
      where: {
        kpiId: kpi.id,
        periodType,
        periodStart: previousPeriodStart,
        ...(facilityId && { facilityId })
      }
    });

    // Calculate variance
    const variance = previousValue ? value - previousValue.value : 0;
    const variancePercent = previousValue && previousValue.value !== 0
      ? ((value - previousValue.value) / previousValue.value) * 100
      : 0;

    // Determine status
    let status: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
    if (kpi.criticalThreshold !== undefined) {
      if (kpi.thresholdDirection === 'ABOVE' && value >= kpi.criticalThreshold) {
        status = 'CRITICAL';
      } else if (kpi.thresholdDirection === 'BELOW' && value <= kpi.criticalThreshold) {
        status = 'CRITICAL';
      }
    }
    if (status === 'NORMAL' && kpi.warningThreshold !== undefined) {
      if (kpi.thresholdDirection === 'ABOVE' && value >= kpi.warningThreshold) {
        status = 'WARNING';
      } else if (kpi.thresholdDirection === 'BELOW' && value <= kpi.warningThreshold) {
        status = 'WARNING';
      }
    }

    // Determine trend direction
    let trendDirection: TrendDirection = TrendDirection.STABLE;
    if (Math.abs(variancePercent) > 5) {
      trendDirection = variancePercent > 0 ? TrendDirection.UP : TrendDirection.DOWN;
    }

    // Save or update KPI value
    const existingValue = await this.kpiValueRepo.findOne({
      where: {
        kpiId: kpi.id,
        periodType,
        periodStart,
        ...(facilityId && { facilityId })
      }
    });

    const kpiValue: Partial<KPIValue> = {
      kpiId: kpi.id,
      organizationId,
      facilityId,
      periodStart,
      periodEnd,
      periodType,
      value,
      targetValue: kpi.targetValue,
      previousValue: previousValue?.value,
      variance,
      variancePercent,
      trendDirection,
      status,
      calculatedAt: new Date()
    };

    if (existingValue) {
      await this.kpiValueRepo.update(existingValue.id, kpiValue);
      return { ...existingValue, ...kpiValue } as KPIValue;
    } else {
      return await this.kpiValueRepo.save(kpiValue);
    }
  }

  private getPeriodStart(date: Date, periodType: PeriodType): Date {
    const d = new Date(date);
    switch (periodType) {
      case PeriodType.HOUR:
        d.setMinutes(0, 0, 0);
        break;
      case PeriodType.DAY:
        d.setHours(0, 0, 0, 0);
        break;
      case PeriodType.WEEK:
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() - d.getDay());
        break;
      case PeriodType.MONTH:
        d.setHours(0, 0, 0, 0);
        d.setDate(1);
        break;
      case PeriodType.QUARTER:
        d.setHours(0, 0, 0, 0);
        d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
        break;
      case PeriodType.YEAR:
        d.setHours(0, 0, 0, 0);
        d.setMonth(0, 1);
        break;
    }
    return d;
  }

  private getPeriodEnd(periodStart: Date, periodType: PeriodType): Date {
    const d = new Date(periodStart);
    switch (periodType) {
      case PeriodType.HOUR:
        d.setHours(d.getHours() + 1);
        break;
      case PeriodType.DAY:
        d.setDate(d.getDate() + 1);
        break;
      case PeriodType.WEEK:
        d.setDate(d.getDate() + 7);
        break;
      case PeriodType.MONTH:
        d.setMonth(d.getMonth() + 1);
        break;
      case PeriodType.QUARTER:
        d.setMonth(d.getMonth() + 3);
        break;
      case PeriodType.YEAR:
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    d.setMilliseconds(d.getMilliseconds() - 1);
    return d;
  }

  private getPreviousPeriodStart(periodStart: Date, periodType: PeriodType): Date {
    const d = new Date(periodStart);
    switch (periodType) {
      case PeriodType.HOUR:
        d.setHours(d.getHours() - 1);
        break;
      case PeriodType.DAY:
        d.setDate(d.getDate() - 1);
        break;
      case PeriodType.WEEK:
        d.setDate(d.getDate() - 7);
        break;
      case PeriodType.MONTH:
        d.setMonth(d.getMonth() - 1);
        break;
      case PeriodType.QUARTER:
        d.setMonth(d.getMonth() - 3);
        break;
      case PeriodType.YEAR:
        d.setFullYear(d.getFullYear() - 1);
        break;
    }
    return d;
  }

  private getSparklineStart(date: Date, periodType: PeriodType): Date {
    const d = new Date(date);
    switch (periodType) {
      case PeriodType.HOUR:
        d.setHours(d.getHours() - 24);
        break;
      case PeriodType.DAY:
        d.setDate(d.getDate() - 30);
        break;
      case PeriodType.WEEK:
        d.setDate(d.getDate() - 12 * 7);
        break;
      case PeriodType.MONTH:
        d.setMonth(d.getMonth() - 12);
        break;
      case PeriodType.QUARTER:
        d.setMonth(d.getMonth() - 8 * 3);
        break;
      case PeriodType.YEAR:
        d.setFullYear(d.getFullYear() - 5);
        break;
    }
    return d;
  }

  private calculateTrend(current?: KPIValue, previous?: KPIValue): any {
    if (!current || !previous) {
      return {
        direction: TrendDirection.STABLE,
        changeValue: 0,
        changePercent: 0,
        periodComparison: 'N/A'
      };
    }

    const changeValue = current.value - previous.value;
    const changePercent = previous.value !== 0
      ? (changeValue / previous.value) * 100
      : 0;

    let direction = TrendDirection.STABLE;
    if (Math.abs(changePercent) > 5) {
      direction = changePercent > 0 ? TrendDirection.UP : TrendDirection.DOWN;
    }

    return {
      direction,
      changeValue,
      changePercent,
      periodComparison: `vs previous ${current.periodType.toLowerCase()}`
    };
  }

  private createEmptyKPIValue(kpiId: string, periodStart: Date, periodType: PeriodType): KPIValue {
    return {
      id: '',
      kpiId,
      organizationId: '',
      periodStart,
      periodEnd: this.getPeriodEnd(periodStart, periodType),
      periodType,
      value: 0,
      status: 'NORMAL',
      calculatedAt: new Date()
    };
  }

  // ============================================================================
  // DASHBOARD MANAGEMENT
  // ============================================================================

  async getDashboards(
    organizationId: string,
    userId: string,
    userRoles: string[]
  ): Promise<Dashboard[]> {
    return await this.dashboardRepo.find({
      where: [
        { organizationId, isPublic: true, deletedAt: null },
        { organizationId, ownerId: userId, deletedAt: null }
      ],
      order: { name: 'ASC' }
    });
  }

  async getDashboardById(
    organizationId: string,
    dashboardId: string,
    userId: string,
    userRoles: string[]
  ): Promise<Dashboard> {
    const dashboard = await this.dashboardRepo.findOne({
      where: { id: dashboardId, organizationId, deletedAt: null }
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    // Check access
    if (
      !dashboard.isPublic &&
      dashboard.ownerId !== userId &&
      !userRoles.some(role => dashboard.sharedWithRoles.includes(role))
    ) {
      throw new ForbiddenException('Access denied to this dashboard');
    }

    return dashboard;
  }

  async getDefaultDashboard(
    organizationId: string,
    userId: string,
    userRoles: string[]
  ): Promise<Dashboard | null> {
    // First try to find a dashboard default for user's roles
    for (const role of userRoles) {
      const dashboard = await this.dashboardRepo.findOne({
        where: {
          organizationId,
          defaultForRoles: In([role]),
          isActive: true,
          deletedAt: null
        }
      });
      if (dashboard) return dashboard;
    }

    // Fall back to organization default
    return await this.dashboardRepo.findOne({
      where: {
        organizationId,
        isDefault: true,
        isActive: true,
        deletedAt: null
      }
    });
  }

  async createDashboard(
    organizationId: string,
    userId: string,
    request: CreateDashboardRequest
  ): Promise<Dashboard> {
    // Check for duplicate code
    const existing = await this.dashboardRepo.findOne({
      where: { organizationId, code: request.code, deletedAt: null }
    });

    if (existing) {
      throw new BadRequestException('Dashboard with this code already exists');
    }

    const dashboard = await this.dashboardRepo.save({
      organizationId,
      ownerId: userId,
      code: request.code,
      name: request.name,
      description: request.description,
      layoutType: request.layoutType,
      layoutConfig: {
        columns: 12,
        rowHeight: 100,
        margin: [10, 10],
        containerPadding: [10, 10],
        compactType: 'vertical',
        preventCollision: false,
        ...request.layoutConfig
      },
      widgets: request.widgets || [],
      theme: request.theme || 'LIGHT',
      isPublic: request.isPublic || false,
      isDefault: request.isDefault || false,
      defaultForRoles: request.defaultForRoles || [],
      refreshIntervalSeconds: request.refreshIntervalSeconds || 300,
      isActive: true,
      isSystem: false,
      createdBy: userId
    });

    return dashboard;
  }

  async updateDashboard(
    organizationId: string,
    dashboardId: string,
    userId: string,
    request: UpdateDashboardRequest
  ): Promise<Dashboard> {
    const dashboard = await this.dashboardRepo.findOne({
      where: { id: dashboardId, organizationId, deletedAt: null }
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    if (dashboard.ownerId !== userId && dashboard.isSystem) {
      throw new ForbiddenException('Cannot modify this dashboard');
    }

    const updates: Partial<Dashboard> = {
      updatedBy: userId,
      updatedAt: new Date()
    };

    if (request.name !== undefined) updates.name = request.name;
    if (request.description !== undefined) updates.description = request.description;
    if (request.layoutConfig !== undefined) {
      updates.layoutConfig = { ...dashboard.layoutConfig, ...request.layoutConfig };
    }
    if (request.widgets !== undefined) updates.widgets = request.widgets;
    if (request.theme !== undefined) updates.theme = request.theme;
    if (request.isPublic !== undefined) updates.isPublic = request.isPublic;
    if (request.isDefault !== undefined) updates.isDefault = request.isDefault;
    if (request.defaultForRoles !== undefined) updates.defaultForRoles = request.defaultForRoles;
    if (request.refreshIntervalSeconds !== undefined) {
      updates.refreshIntervalSeconds = request.refreshIntervalSeconds;
    }

    await this.dashboardRepo.update(dashboardId, updates);

    return await this.getDashboardById(organizationId, dashboardId, userId, []);
  }

  async deleteDashboard(
    organizationId: string,
    dashboardId: string,
    userId: string
  ): Promise<void> {
    const dashboard = await this.dashboardRepo.findOne({
      where: { id: dashboardId, organizationId, deletedAt: null }
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    if (dashboard.isSystem) {
      throw new ForbiddenException('Cannot delete system dashboard');
    }

    if (dashboard.ownerId !== userId) {
      throw new ForbiddenException('Cannot delete this dashboard');
    }

    await this.dashboardRepo.update(dashboardId, {
      deletedAt: new Date(),
      deletedBy: userId
    });
  }

  // ============================================================================
  // ANALYTICS SUMMARY
  // ============================================================================

  async getAnalyticsSummary(
    organizationId: string,
    request: AnalyticsSummaryRequest
  ): Promise<AnalyticsSummaryResponse> {
    const { startDate, endDate, facilityId, granularity = 'DAY' } = request;

    // Fetch daily summaries
    const summaries = await this.dailySummaryRepo.find({
      where: {
        organizationId,
        summaryDate: Between(startDate, endDate),
        ...(facilityId && { facilityId })
      },
      order: { summaryDate: 'ASC' }
    });

    // Aggregate metrics
    const production = {
      ordersReceived: summaries.reduce((sum, s) => sum + (s.totalOrdersReceived || 0), 0),
      ordersCompleted: summaries.reduce((sum, s) => sum + (s.totalOrdersCompleted || 0), 0),
      partsProduced: summaries.reduce((sum, s) => sum + (s.totalPartsProduced || 0), 0),
      partsScrapped: summaries.reduce((sum, s) => sum + (s.totalPartsScrapped || 0), 0),
      partsReworked: summaries.reduce((sum, s) => sum + (s.totalPartsReworked || 0), 0)
    };

    const totalParts = production.partsProduced + production.partsScrapped + production.partsReworked;
    const quality = {
      firstPassYield: totalParts > 0 
        ? (production.partsProduced / totalParts) * 100 
        : 100,
      scrapRate: totalParts > 0 
        ? (production.partsScrapped / totalParts) * 100 
        : 0,
      reworkRate: totalParts > 0 
        ? (production.partsReworked / totalParts) * 100 
        : 0,
      ncrsOpened: 0,
      ncrsClosed: 0
    };

    const totalShipments = summaries.reduce((sum, s) => 
      sum + (s.onTimeShipments || 0) + (s.lateShipments || 0), 0
    );
    const delivery = {
      ordersShipped: summaries.reduce((sum, s) => sum + (s.totalOrdersShipped || 0), 0),
      onTimeRate: totalShipments > 0
        ? (summaries.reduce((sum, s) => sum + (s.onTimeShipments || 0), 0) / totalShipments) * 100
        : 100,
      lateOrders: summaries.reduce((sum, s) => sum + (s.lateShipments || 0), 0),
      averageLeadTime: 0
    };

    const revenue = summaries.reduce((sum, s) => sum + Number(s.revenueRecognized || 0), 0);
    const cost = summaries.reduce((sum, s) => sum + Number(s.productionCost || 0), 0);
    const financial = {
      revenue,
      cost,
      margin: revenue - cost,
      marginPercent: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
    };

    const machineHours = summaries.reduce((sum, s) => sum + Number(s.totalMachineHours || 0), 0);
    const laborHours = summaries.reduce((sum, s) => sum + Number(s.totalLaborHours || 0), 0);
    const efficiency = {
      machineUtilization: 0,
      laborEfficiency: 0,
      averageOee: summaries.length > 0
        ? summaries.reduce((sum, s) => sum + Number(s.averageOee || 0), 0) / summaries.length
        : 0,
      throughputRate: machineHours > 0 ? production.partsProduced / machineHours : 0
    };

    // Build trend data
    const trends = summaries.map(s => ({
      date: s.summaryDate,
      metrics: {
        partsProduced: s.totalPartsProduced || 0,
        revenue: Number(s.revenueRecognized || 0),
        oee: Number(s.averageOee || 0),
        onTimeRate: Number(s.onTimeRate || 0)
      }
    }));

    return {
      period: {
        start: startDate,
        end: endDate,
        granularity
      },
      production,
      quality,
      delivery,
      financial,
      efficiency,
      trends
    };
  }

  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  async getActiveAlerts(organizationId: string): Promise<AlertInstance[]> {
    return await this.alertInstanceRepo.find({
      where: {
        organizationId,
        status: 'ACTIVE'
      },
      order: { triggeredAt: 'DESC' }
    });
  }

  async acknowledgeAlert(
    organizationId: string,
    alertInstanceId: string,
    userId: string
  ): Promise<AlertInstance> {
    const instance = await this.alertInstanceRepo.findOne({
      where: { id: alertInstanceId, organizationId }
    });

    if (!instance) {
      throw new NotFoundException('Alert instance not found');
    }

    await this.alertInstanceRepo.update(alertInstanceId, {
      status: 'ACKNOWLEDGED',
      acknowledgedBy: userId,
      acknowledgedAt: new Date()
    });

    return await this.alertInstanceRepo.findOne({ where: { id: alertInstanceId } });
  }

  async resolveAlert(
    organizationId: string,
    alertInstanceId: string,
    userId: string,
    resolutionNotes?: string
  ): Promise<AlertInstance> {
    const instance = await this.alertInstanceRepo.findOne({
      where: { id: alertInstanceId, organizationId }
    });

    if (!instance) {
      throw new NotFoundException('Alert instance not found');
    }

    await this.alertInstanceRepo.update(alertInstanceId, {
      status: 'RESOLVED',
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes
    });

    return await this.alertInstanceRepo.findOne({ where: { id: alertInstanceId } });
  }

  // ============================================================================
  // SCHEDULED JOBS
  // ============================================================================

  async calculateDailyProductionSummary(
    organizationId: string,
    summaryDate: Date,
    facilityId?: string
  ): Promise<DailyProductionSummary> {
    // This would be implemented to aggregate data from production, orders, quality tables
    // For now, return a placeholder
    const summary: Partial<DailyProductionSummary> = {
      organizationId,
      facilityId,
      summaryDate,
      totalOrdersReceived: 0,
      totalOrdersCompleted: 0,
      totalOrdersShipped: 0,
      totalPartsProduced: 0,
      totalPartsScrapped: 0,
      totalPartsReworked: 0,
      revenueRecognized: 0,
      productionCost: 0,
      totalMachineHours: 0,
      totalLaborHours: 0,
      onTimeShipments: 0,
      lateShipments: 0,
      calculatedAt: new Date()
    };

    // Calculate derived metrics
    const totalParts = summary.totalPartsProduced + summary.totalPartsScrapped + summary.totalPartsReworked;
    if (totalParts > 0) {
      summary.firstPassYield = (summary.totalPartsProduced / totalParts) * 100;
      summary.scrapRate = (summary.totalPartsScrapped / totalParts) * 100;
      summary.reworkRate = (summary.totalPartsReworked / totalParts) * 100;
    }

    if (summary.revenueRecognized > 0) {
      summary.marginPercent = ((summary.revenueRecognized - summary.productionCost) / summary.revenueRecognized) * 100;
    }

    const totalShipments = summary.onTimeShipments + summary.lateShipments;
    if (totalShipments > 0) {
      summary.onTimeRate = (summary.onTimeShipments / totalShipments) * 100;
    }

    // Upsert summary
    const existing = await this.dailySummaryRepo.findOne({
      where: { organizationId, facilityId, summaryDate }
    });

    if (existing) {
      await this.dailySummaryRepo.update(existing.id, summary);
      return { ...existing, ...summary } as DailyProductionSummary;
    } else {
      return await this.dailySummaryRepo.save(summary);
    }
  }

  async runScheduledKPICalculations(organizationId: string): Promise<void> {
    const activeKPIs = await this.kpiRepo.find({
      where: { organizationId, isActive: true }
    });

    for (const kpi of activeKPIs) {
      try {
        await this.calculateKPIValue(organizationId, kpi.id, undefined, kpi.trendPeriod);
      } catch (error) {
        console.error(`Failed to calculate KPI ${kpi.code}:`, error);
      }
    }
  }
}

export default AnalyticsService;
