/**
 * Feralis Manufacturing Platform
 * Financial Performance Service
 * 
 * Real-time financial metrics and tracking:
 * - Revenue recognition as parts pass inspection
 * - Margin tracking per job with variance analysis
 * - Cash flow forecasting based on orders and payment terms
 * - Daily/weekly/monthly target tracking
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Decimal } from '@prisma/client/runtime/library';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export interface RevenueSnapshot {
  timestamp: Date;
  organizationId: string;
  
  // Today's revenue
  todayRecognized: number;
  todayTarget: number;
  todayProgress: number;
  
  // Comparison
  sameDayLastWeek: number;
  changeFromLastWeek: number;
  changePercent: number;
  
  // Breakdown
  byCustomer: RevenueByEntity[];
  byProductLine: RevenueByEntity[];
  
  // Forecast
  forecastToEndOfDay: number;
  remainingScheduled: number;
}

export interface RevenueByEntity {
  id: string;
  name: string;
  revenue: number;
  percentage: number;
  orderCount: number;
}

export interface RevenueRecognitionEvent {
  id: string;
  timestamp: Date;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  marginPercent: number;
}

export interface MarginSnapshot {
  timestamp: Date;
  organizationId: string;
  
  // Aggregate metrics
  aggregateMargin: number;
  aggregateMarginTarget: number;
  
  // Jobs summary
  totalActiveJobs: number;
  jobsOnTarget: number;
  jobsWithErosion: number;
  
  // Top erosion alerts
  marginAlerts: MarginAlert[];
  
  // Trending
  averageMarginTrend: MarginTrendPoint[];
}

export interface MarginAlert {
  workOrderId: string;
  workOrderNumber: string;
  customerName: string;
  partNumber: string;
  
  quotedMargin: number;
  currentMargin: number;
  variance: number;
  
  quotedCost: number;
  actualCost: number;
  costVariance: number;
  
  trendDirection: 'IMPROVING' | 'DECLINING' | 'STABLE';
  completionPercent: number;
  estimatedFinalMargin: number;
  
  severity: 'WARNING' | 'CRITICAL';
  costBreakdown: JobCostBreakdown;
}

export interface JobCostBreakdown {
  materialEstimated: number;
  materialActual: number;
  
  laborEstimated: number;
  laborActual: number;
  
  machineEstimated: number;
  machineActual: number;
  
  finishingEstimated: number;
  finishingActual: number;
  
  overheadEstimated: number;
  overheadActual: number;
  
  totalEstimated: number;
  totalActual: number;
}

export interface MarginTrendPoint {
  date: Date;
  label: string;
  margin: number;
  target: number;
}

export interface CashFlowForecast {
  timestamp: Date;
  organizationId: string;
  horizon: number; // Days
  
  // Summary
  totalExpectedReceipts: number;
  pastDueReceivables: number;
  
  // Daily breakdown
  dailyForecasts: DailyCashForecast[];
  
  // Cumulative position
  cumulativeCashLine: CumulativeCashPoint[];
}

export interface DailyCashForecast {
  date: Date;
  dayLabel: string;
  
  // By confidence level
  highConfidence: number;  // Shipped, awaiting payment
  mediumConfidence: number; // Scheduled to ship
  lowConfidence: number;   // Forecasted
  
  totalExpected: number;
  
  // Contributing orders
  orders: CashForecastOrder[];
}

export interface CashForecastOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  shipDate?: Date;
  paymentTerms: string;
  expectedPaymentDate: Date;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface CumulativeCashPoint {
  date: Date;
  cumulativeReceipts: number;
  cumulativeForecast: number;
}

export interface FinancialDashboard {
  timestamp: Date;
  organizationId: string;
  
  revenue: RevenueSnapshot;
  margin: MarginSnapshot;
  cashFlow: CashFlowForecast;
  
  // Period summaries
  periodSummaries: PeriodFinancialSummary[];
  
  // Alerts
  financialAlerts: FinancialAlert[];
}

export interface PeriodFinancialSummary {
  period: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR';
  periodStart: Date;
  periodEnd: Date;
  
  revenue: number;
  revenueTarget: number;
  revenueAchievement: number;
  
  margin: number;
  marginTarget: number;
  
  ordersShipped: number;
  partsProduced: number;
}

export interface FinancialAlert {
  id: string;
  type: 'MARGIN_EROSION' | 'REVENUE_BEHIND' | 'CASH_FLOW_GAP' | 'OVERDUE_RECEIVABLE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  affectedEntity: string;
  value: number;
  threshold: number;
  createdAt: Date;
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

@Injectable()
export class FinancialPerformanceService {
  private readonly logger = new Logger(FinancialPerformanceService.name);
  
  // Thresholds
  private readonly MARGIN_EROSION_WARNING = 5; // 5% below target
  private readonly MARGIN_EROSION_CRITICAL = 10; // 10% below target
  private readonly REVENUE_WARNING_THRESHOLD = 0.8; // 80% of target

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // REVENUE TRACKING
  // ===========================================================================

  /**
   * Get real-time revenue snapshot
   */
  async getRevenueSnapshot(organizationId: string): Promise<RevenueSnapshot> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Get today's recognized revenue (parts that passed final inspection)
    const todayRevenue = await this.getRecognizedRevenue(
      organizationId,
      todayStart,
      todayEnd,
    );

    // Get same day last week
    const lastWeekStart = new Date(todayStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(todayEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);
    
    const lastWeekRevenue = await this.getRecognizedRevenue(
      organizationId,
      lastWeekStart,
      lastWeekEnd,
    );

    // Get target (from budgets or calculated)
    const todayTarget = await this.getDailyTarget(organizationId, now);

    // Get breakdown by customer and product line
    const byCustomer = await this.getRevenueByCustomer(
      organizationId,
      todayStart,
      todayEnd,
    );
    
    const byProductLine = await this.getRevenueByProductLine(
      organizationId,
      todayStart,
      todayEnd,
    );

    // Forecast remaining based on schedule
    const remainingScheduled = await this.getRemainingScheduledRevenue(
      organizationId,
      now,
      todayEnd,
    );

    const changeFromLastWeek = todayRevenue - lastWeekRevenue;
    const changePercent = lastWeekRevenue > 0
      ? (changeFromLastWeek / lastWeekRevenue) * 100
      : 0;

    return {
      timestamp: now,
      organizationId,
      todayRecognized: todayRevenue,
      todayTarget,
      todayProgress: todayTarget > 0 ? (todayRevenue / todayTarget) * 100 : 0,
      sameDayLastWeek: lastWeekRevenue,
      changeFromLastWeek,
      changePercent: Math.round(changePercent * 10) / 10,
      byCustomer,
      byProductLine,
      forecastToEndOfDay: todayRevenue + remainingScheduled,
      remainingScheduled,
    };
  }

  /**
   * Get recent revenue recognition events (for live ticker)
   */
  async getRecentRevenueEvents(
    organizationId: string,
    limit: number = 10,
  ): Promise<RevenueRecognitionEvent[]> {
    // Get recent completed shipments or inspections
    const recentCompletions = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        operationName: { contains: 'final' }, // Final operation
        status: 'COMPLETED',
        actualEndTime: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      include: {
        workOrder: {
          include: {
            orderLine: {
              include: {
                order: { include: { customer: true } },
                part: true,
              },
            },
          },
        },
      },
      orderBy: { actualEndTime: 'desc' },
      take: limit,
    });

    return recentCompletions.map(completion => {
      const ol = completion.workOrder.orderLine;
      const unitPrice = ol?.unitPrice ? Number(ol.unitPrice) : 0;
      const quantity = completion.quantityCompleted;
      const totalRevenue = unitPrice * quantity;
      
      // Calculate margin
      const estimatedCost = completion.workOrder.totalEstimatedCost
        ? Number(completion.workOrder.totalEstimatedCost)
        : totalRevenue * 0.7;
      const marginPercent = totalRevenue > 0
        ? ((totalRevenue - estimatedCost) / totalRevenue) * 100
        : 0;

      return {
        id: completion.id,
        timestamp: completion.actualEndTime || new Date(),
        orderId: ol?.orderId || '',
        orderNumber: ol?.order?.orderNumber || '',
        customerId: ol?.order?.customerId || '',
        customerName: ol?.order?.customer?.name || 'Unknown',
        partNumber: ol?.part?.partNumber || 'N/A',
        quantity,
        unitPrice,
        totalRevenue,
        marginPercent: Math.round(marginPercent * 10) / 10,
      };
    });
  }

  // ===========================================================================
  // MARGIN TRACKING
  // ===========================================================================

  /**
   * Get margin performance snapshot
   */
  async getMarginSnapshot(organizationId: string): Promise<MarginSnapshot> {
    // Get all active work orders with cost tracking
    const activeWorkOrders = await this.prisma.workOrder.findMany({
      where: {
        organizationId,
        status: { in: ['IN_PROGRESS', 'PENDING'] },
      },
      include: {
        orderLine: {
          include: {
            order: { include: { customer: true } },
            part: true,
          },
        },
        operations: true,
      },
    });

    // Calculate margin for each job
    const marginAlerts: MarginAlert[] = [];
    let totalQuotedMargin = 0;
    let totalCurrentMargin = 0;
    let jobsOnTarget = 0;
    let jobsWithErosion = 0;

    for (const wo of activeWorkOrders) {
      const costBreakdown = await this.calculateJobCosts(wo.id);
      const orderValue = wo.orderLine?.totalPrice
        ? Number(wo.orderLine.totalPrice)
        : 0;

      const quotedMargin = orderValue > 0
        ? ((orderValue - costBreakdown.totalEstimated) / orderValue) * 100
        : 0;
      
      const currentMargin = orderValue > 0
        ? ((orderValue - costBreakdown.totalActual) / orderValue) * 100
        : 0;

      const variance = currentMargin - quotedMargin;
      
      totalQuotedMargin += quotedMargin;
      totalCurrentMargin += currentMargin;

      if (variance >= -this.MARGIN_EROSION_WARNING) {
        jobsOnTarget++;
      } else {
        jobsWithErosion++;
        
        // Create alert for erosion
        const severity = variance <= -this.MARGIN_EROSION_CRITICAL ? 'CRITICAL' : 'WARNING';
        
        marginAlerts.push({
          workOrderId: wo.id,
          workOrderNumber: wo.workOrderNumber,
          customerName: wo.orderLine?.order?.customer?.name || 'Unknown',
          partNumber: wo.orderLine?.part?.partNumber || 'N/A',
          quotedMargin: Math.round(quotedMargin * 10) / 10,
          currentMargin: Math.round(currentMargin * 10) / 10,
          variance: Math.round(variance * 10) / 10,
          quotedCost: costBreakdown.totalEstimated,
          actualCost: costBreakdown.totalActual,
          costVariance: costBreakdown.totalActual - costBreakdown.totalEstimated,
          trendDirection: 'STABLE', // Would calculate from history
          completionPercent: this.calculateCompletionPercent(wo),
          estimatedFinalMargin: this.estimateFinalMargin(
            quotedMargin,
            currentMargin,
            this.calculateCompletionPercent(wo),
          ),
          severity,
          costBreakdown,
        });
      }
    }

    // Sort alerts by severity and variance
    marginAlerts.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'CRITICAL' ? -1 : 1;
      }
      return a.variance - b.variance;
    });

    // Get margin trend (last 7 days)
    const marginTrend = await this.getMarginTrend(organizationId, 7);

    return {
      timestamp: new Date(),
      organizationId,
      aggregateMargin: activeWorkOrders.length > 0
        ? Math.round((totalCurrentMargin / activeWorkOrders.length) * 10) / 10
        : 0,
      aggregateMarginTarget: 25, // Default target
      totalActiveJobs: activeWorkOrders.length,
      jobsOnTarget,
      jobsWithErosion,
      marginAlerts: marginAlerts.slice(0, 10), // Top 10 alerts
      averageMarginTrend: marginTrend,
    };
  }

  /**
   * Get detailed job cost breakdown
   */
  async getJobCostDetail(
    organizationId: string,
    workOrderId: string,
  ): Promise<{
    workOrder: any;
    costBreakdown: JobCostBreakdown;
    costHistory: Array<{ date: Date; actualCost: number }>;
  }> {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        orderLine: {
          include: {
            order: { include: { customer: true } },
            part: true,
          },
        },
        operations: true,
      },
    });

    if (!workOrder || workOrder.organizationId !== organizationId) {
      throw new Error('Work order not found');
    }

    const costBreakdown = await this.calculateJobCosts(workOrderId);

    // Get cost history (simplified - would track actual cost over time)
    const costHistory = [
      { date: workOrder.createdAt, actualCost: costBreakdown.totalEstimated * 0.1 },
      { date: new Date(), actualCost: costBreakdown.totalActual },
    ];

    return { workOrder, costBreakdown, costHistory };
  }

  // ===========================================================================
  // CASH FLOW FORECASTING
  // ===========================================================================

  /**
   * Get cash flow forecast
   */
  async getCashFlowForecast(
    organizationId: string,
    horizonDays: number = 90,
  ): Promise<CashFlowForecast> {
    const now = new Date();
    
    // Get past due receivables
    const pastDueReceivables = await this.getPastDueReceivables(organizationId);

    // Build daily forecasts
    const dailyForecasts: DailyCashForecast[] = [];
    const cumulativeCashLine: CumulativeCashPoint[] = [];
    let cumulative = 0;

    for (let day = 0; day < horizonDays; day++) {
      const forecastDate = new Date(now);
      forecastDate.setDate(forecastDate.getDate() + day);
      forecastDate.setHours(0, 0, 0, 0);

      const dailyForecast = await this.getDailyForecast(
        organizationId,
        forecastDate,
      );
      
      dailyForecasts.push(dailyForecast);
      
      cumulative += dailyForecast.totalExpected;
      cumulativeCashLine.push({
        date: forecastDate,
        cumulativeReceipts: cumulative,
        cumulativeForecast: cumulative,
      });
    }

    const totalExpectedReceipts = dailyForecasts.reduce(
      (sum, df) => sum + df.totalExpected,
      0,
    );

    return {
      timestamp: now,
      organizationId,
      horizon: horizonDays,
      totalExpectedReceipts,
      pastDueReceivables,
      dailyForecasts,
      cumulativeCashLine,
    };
  }

  // ===========================================================================
  // FINANCIAL DASHBOARD
  // ===========================================================================

  /**
   * Get complete financial dashboard
   */
  async getFinancialDashboard(
    organizationId: string,
  ): Promise<FinancialDashboard> {
    const [revenue, margin, cashFlow] = await Promise.all([
      this.getRevenueSnapshot(organizationId),
      this.getMarginSnapshot(organizationId),
      this.getCashFlowForecast(organizationId, 90),
    ]);

    // Get period summaries
    const periodSummaries = await this.getPeriodSummaries(organizationId);

    // Generate alerts
    const financialAlerts = this.generateFinancialAlerts(revenue, margin, cashFlow);

    return {
      timestamp: new Date(),
      organizationId,
      revenue,
      margin,
      cashFlow,
      periodSummaries,
      financialAlerts,
    };
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  private async getRecognizedRevenue(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<number> {
    // Revenue is recognized when parts pass final inspection
    const result = await this.prisma.workOrderOperation.aggregate({
      where: {
        workOrder: { organizationId },
        status: 'COMPLETED',
        actualEndTime: { gte: fromDate, lte: toDate },
        // Assume operations with highest sequence number are "final"
      },
      _sum: { quantityCompleted: true },
    });

    // Get average unit price for completed items
    const completedOps = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        status: 'COMPLETED',
        actualEndTime: { gte: fromDate, lte: toDate },
      },
      include: {
        workOrder: {
          include: {
            orderLine: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    for (const op of completedOps) {
      const unitPrice = op.workOrder.orderLine?.unitPrice
        ? Number(op.workOrder.orderLine.unitPrice)
        : 0;
      totalRevenue += unitPrice * op.quantityCompleted;
    }

    return Math.round(totalRevenue * 100) / 100;
  }

  private async getDailyTarget(organizationId: string, date: Date): Promise<number> {
    // In production, would get from budget/planning module
    // For now, use a default based on historical data
    
    const monthStart = new Date(date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    monthEnd.setDate(0);

    // Calculate average daily revenue from last month
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    
    const lastMonthEnd = new Date(monthStart);
    lastMonthEnd.setDate(0);

    const lastMonthRevenue = await this.getRecognizedRevenue(
      organizationId,
      lastMonthStart,
      lastMonthEnd,
    );

    const workingDays = 22; // Approximate working days per month
    return Math.round((lastMonthRevenue / workingDays) * 100) / 100;
  }

  private async getRevenueByCustomer(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<RevenueByEntity[]> {
    const completedOps = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        status: 'COMPLETED',
        actualEndTime: { gte: fromDate, lte: toDate },
      },
      include: {
        workOrder: {
          include: {
            orderLine: {
              include: {
                order: { include: { customer: true } },
              },
            },
          },
        },
      },
    });

    const customerRevenue = new Map<string, { name: string; revenue: number; orders: Set<string> }>();

    for (const op of completedOps) {
      const customer = op.workOrder.orderLine?.order?.customer;
      if (!customer) continue;

      const unitPrice = op.workOrder.orderLine?.unitPrice
        ? Number(op.workOrder.orderLine.unitPrice)
        : 0;
      const revenue = unitPrice * op.quantityCompleted;

      const existing = customerRevenue.get(customer.id);
      if (existing) {
        existing.revenue += revenue;
        existing.orders.add(op.workOrder.orderLine?.orderId || '');
      } else {
        customerRevenue.set(customer.id, {
          name: customer.name,
          revenue,
          orders: new Set([op.workOrder.orderLine?.orderId || '']),
        });
      }
    }

    const totalRevenue = Array.from(customerRevenue.values()).reduce(
      (sum, c) => sum + c.revenue,
      0,
    );

    return Array.from(customerRevenue.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        revenue: Math.round(data.revenue * 100) / 100,
        percentage: totalRevenue > 0
          ? Math.round((data.revenue / totalRevenue) * 1000) / 10
          : 0,
        orderCount: data.orders.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private async getRevenueByProductLine(
    organizationId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<RevenueByEntity[]> {
    // Simplified - would categorize by product line/type
    const completedOps = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        status: 'COMPLETED',
        actualEndTime: { gte: fromDate, lte: toDate },
      },
      include: {
        workOrder: {
          include: {
            orderLine: {
              include: { part: true },
            },
          },
        },
      },
    });

    const productRevenue = new Map<string, { name: string; revenue: number; orders: Set<string> }>();

    for (const op of completedOps) {
      const part = op.workOrder.orderLine?.part;
      // Use part type or category as product line
      const productLine = part?.type || 'Other';

      const unitPrice = op.workOrder.orderLine?.unitPrice
        ? Number(op.workOrder.orderLine.unitPrice)
        : 0;
      const revenue = unitPrice * op.quantityCompleted;

      const existing = productRevenue.get(productLine);
      if (existing) {
        existing.revenue += revenue;
        existing.orders.add(op.workOrderId);
      } else {
        productRevenue.set(productLine, {
          name: productLine,
          revenue,
          orders: new Set([op.workOrderId]),
        });
      }
    }

    const totalRevenue = Array.from(productRevenue.values()).reduce(
      (sum, p) => sum + p.revenue,
      0,
    );

    return Array.from(productRevenue.entries())
      .map(([id, data]) => ({
        id,
        name: data.name,
        revenue: Math.round(data.revenue * 100) / 100,
        percentage: totalRevenue > 0
          ? Math.round((data.revenue / totalRevenue) * 1000) / 10
          : 0,
        orderCount: data.orders.size,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private async getRemainingScheduledRevenue(
    organizationId: string,
    fromTime: Date,
    toTime: Date,
  ): Promise<number> {
    const scheduledOps = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        status: { in: ['PENDING', 'IN_PROGRESS', 'READY'] },
        scheduledEndTime: { gte: fromTime, lte: toTime },
      },
      include: {
        workOrder: {
          include: {
            orderLine: true,
          },
        },
      },
    });

    let totalRevenue = 0;
    for (const op of scheduledOps) {
      const unitPrice = op.workOrder.orderLine?.unitPrice
        ? Number(op.workOrder.orderLine.unitPrice)
        : 0;
      const remainingQty = op.workOrder.quantity - op.quantityCompleted;
      totalRevenue += unitPrice * Math.max(0, remainingQty);
    }

    return Math.round(totalRevenue * 100) / 100;
  }

  private async calculateJobCosts(workOrderId: string): Promise<JobCostBreakdown> {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        operations: true,
        materialAllocations: true,
      },
    });

    if (!workOrder) {
      return {
        materialEstimated: 0,
        materialActual: 0,
        laborEstimated: 0,
        laborActual: 0,
        machineEstimated: 0,
        machineActual: 0,
        finishingEstimated: 0,
        finishingActual: 0,
        overheadEstimated: 0,
        overheadActual: 0,
        totalEstimated: 0,
        totalActual: 0,
      };
    }

    // Material costs
    const materialEstimated = workOrder.totalEstimatedCost
      ? Number(workOrder.totalEstimatedCost) * 0.4 // Assume 40% material
      : 0;
    
    const materialActual = workOrder.materialAllocations?.reduce(
      (sum, ma) => sum + (ma.actualCost ? Number(ma.actualCost) : 0),
      0,
    ) || 0;

    // Labor costs (from operation time tracking)
    const laborRate = 45; // $/hour
    const laborEstimated = workOrder.operations.reduce(
      (sum, op) => sum + ((op.standardMinutes || 0) / 60) * laborRate,
      0,
    );
    const laborActual = workOrder.operations.reduce(
      (sum, op) => sum + ((op.actualMinutes || 0) / 60) * laborRate,
      0,
    );

    // Machine costs
    const machineRate = 75; // $/hour
    const machineEstimated = workOrder.operations.reduce(
      (sum, op) => sum + ((op.standardMinutes || 0) / 60) * machineRate,
      0,
    );
    const machineActual = workOrder.operations.reduce(
      (sum, op) => sum + ((op.actualMinutes || 0) / 60) * machineRate,
      0,
    );

    // Finishing (estimated as percentage)
    const finishingEstimated = materialEstimated * 0.15;
    const finishingActual = materialActual * 0.15;

    // Overhead (estimated as percentage of direct costs)
    const directEstimated = materialEstimated + laborEstimated + machineEstimated;
    const directActual = materialActual + laborActual + machineActual;
    const overheadEstimated = directEstimated * 0.2;
    const overheadActual = directActual * 0.2;

    return {
      materialEstimated: Math.round(materialEstimated * 100) / 100,
      materialActual: Math.round(materialActual * 100) / 100,
      laborEstimated: Math.round(laborEstimated * 100) / 100,
      laborActual: Math.round(laborActual * 100) / 100,
      machineEstimated: Math.round(machineEstimated * 100) / 100,
      machineActual: Math.round(machineActual * 100) / 100,
      finishingEstimated: Math.round(finishingEstimated * 100) / 100,
      finishingActual: Math.round(finishingActual * 100) / 100,
      overheadEstimated: Math.round(overheadEstimated * 100) / 100,
      overheadActual: Math.round(overheadActual * 100) / 100,
      totalEstimated: Math.round(
        (materialEstimated + laborEstimated + machineEstimated + finishingEstimated + overheadEstimated) * 100,
      ) / 100,
      totalActual: Math.round(
        (materialActual + laborActual + machineActual + finishingActual + overheadActual) * 100,
      ) / 100,
    };
  }

  private calculateCompletionPercent(workOrder: any): number {
    if (!workOrder.operations || workOrder.operations.length === 0) return 0;

    const completedOps = workOrder.operations.filter(
      (op: any) => op.status === 'COMPLETED',
    ).length;
    
    return Math.round((completedOps / workOrder.operations.length) * 100);
  }

  private estimateFinalMargin(
    quotedMargin: number,
    currentMargin: number,
    completionPercent: number,
  ): number {
    // Linear interpolation based on completion percentage
    // If we're 50% done and margin has dropped 10%, expect similar pattern for remaining work
    if (completionPercent === 0) return quotedMargin;
    if (completionPercent === 100) return currentMargin;

    const marginDrop = quotedMargin - currentMargin;
    const projectedDrop = marginDrop * (100 / completionPercent);
    
    return Math.round((quotedMargin - projectedDrop) * 10) / 10;
  }

  private async getMarginTrend(
    organizationId: string,
    days: number,
  ): Promise<MarginTrendPoint[]> {
    const trend: MarginTrendPoint[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      // Would calculate actual margin for that day
      // For now, use placeholder
      trend.push({
        date,
        label: date.toLocaleDateString('en-US', { weekday: 'short' }),
        margin: 22 + Math.random() * 6, // Placeholder
        target: 25,
      });
    }

    return trend;
  }

  private async getPastDueReceivables(organizationId: string): Promise<number> {
    const pastDueOrders = await this.prisma.order.findMany({
      where: {
        organizationId,
        status: 'SHIPPED',
        // Payment not received and past expected payment date
        actualShipDate: {
          lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30+ days ago
        },
      },
      include: {
        lines: true,
      },
    });

    return pastDueOrders.reduce((sum, order) => {
      const orderTotal = order.lines.reduce(
        (lineSum, line) => lineSum + (line.totalPrice ? Number(line.totalPrice) : 0),
        0,
      );
      return sum + orderTotal;
    }, 0);
  }

  private async getDailyForecast(
    organizationId: string,
    date: Date,
  ): Promise<DailyCashForecast> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const orders: CashForecastOrder[] = [];
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    // Get orders with expected payment on this date
    // (ship date + payment terms)
    const potentialOrders = await this.prisma.order.findMany({
      where: {
        organizationId,
        status: { in: ['SHIPPED', 'RELEASED', 'IN_PRODUCTION'] },
      },
      include: {
        customer: true,
        lines: true,
      },
    });

    for (const order of potentialOrders) {
      const orderTotal = order.lines.reduce(
        (sum, line) => sum + (line.totalPrice ? Number(line.totalPrice) : 0),
        0,
      );

      // Calculate expected payment date
      const shipDate = order.actualShipDate || order.requestedDeliveryDate;
      if (!shipDate) continue;

      const paymentTermsDays = this.getPaymentTermsDays(order.customer?.paymentTerms);
      const expectedPaymentDate = new Date(shipDate);
      expectedPaymentDate.setDate(expectedPaymentDate.getDate() + paymentTermsDays);

      // Check if payment expected on target date
      if (
        expectedPaymentDate >= dayStart &&
        expectedPaymentDate <= dayEnd
      ) {
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

        if (order.status === 'SHIPPED') {
          confidence = 'HIGH';
          highConfidence += orderTotal;
        } else if (order.status === 'RELEASED') {
          confidence = 'MEDIUM';
          mediumConfidence += orderTotal;
        } else {
          confidence = 'LOW';
          lowConfidence += orderTotal;
        }

        orders.push({
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customer?.name || 'Unknown',
          amount: orderTotal,
          shipDate: order.actualShipDate || undefined,
          paymentTerms: order.customer?.paymentTerms || 'Net 30',
          expectedPaymentDate,
          confidence,
        });
      }
    }

    return {
      date,
      dayLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      highConfidence: Math.round(highConfidence * 100) / 100,
      mediumConfidence: Math.round(mediumConfidence * 100) / 100,
      lowConfidence: Math.round(lowConfidence * 100) / 100,
      totalExpected: Math.round((highConfidence + mediumConfidence + lowConfidence) * 100) / 100,
      orders,
    };
  }

  private getPaymentTermsDays(terms?: string | null): number {
    if (!terms) return 30;
    
    const match = terms.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 30;
  }

  private async getPeriodSummaries(
    organizationId: string,
  ): Promise<PeriodFinancialSummary[]> {
    const now = new Date();
    const summaries: PeriodFinancialSummary[] = [];

    // Day summary
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    
    summaries.push(await this.calculatePeriodSummary(
      organizationId,
      'DAY',
      dayStart,
      dayEnd,
    ));

    // Week summary
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    summaries.push(await this.calculatePeriodSummary(
      organizationId,
      'WEEK',
      weekStart,
      weekEnd,
    ));

    // Month summary
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    
    summaries.push(await this.calculatePeriodSummary(
      organizationId,
      'MONTH',
      monthStart,
      monthEnd,
    ));

    return summaries;
  }

  private async calculatePeriodSummary(
    organizationId: string,
    period: 'DAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'YEAR',
    start: Date,
    end: Date,
  ): Promise<PeriodFinancialSummary> {
    const revenue = await this.getRecognizedRevenue(organizationId, start, end);
    
    // Get orders shipped
    const ordersShipped = await this.prisma.order.count({
      where: {
        organizationId,
        actualShipDate: { gte: start, lte: end },
      },
    });

    // Get parts produced
    const partsProduced = await this.prisma.workOrderOperation.aggregate({
      where: {
        workOrder: { organizationId },
        status: 'COMPLETED',
        actualEndTime: { gte: start, lte: end },
      },
      _sum: { quantityCompleted: true },
    });

    // Calculate target based on period
    const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    const dailyTarget = await this.getDailyTarget(organizationId, start);
    const periodTarget = dailyTarget * Math.ceil(days);

    return {
      period,
      periodStart: start,
      periodEnd: end,
      revenue: Math.round(revenue * 100) / 100,
      revenueTarget: Math.round(periodTarget * 100) / 100,
      revenueAchievement: periodTarget > 0
        ? Math.round((revenue / periodTarget) * 1000) / 10
        : 0,
      margin: 24, // Placeholder - would calculate actual
      marginTarget: 25,
      ordersShipped,
      partsProduced: partsProduced._sum.quantityCompleted || 0,
    };
  }

  private generateFinancialAlerts(
    revenue: RevenueSnapshot,
    margin: MarginSnapshot,
    cashFlow: CashFlowForecast,
  ): FinancialAlert[] {
    const alerts: FinancialAlert[] = [];

    // Revenue behind target
    if (revenue.todayProgress < this.REVENUE_WARNING_THRESHOLD * 100) {
      alerts.push({
        id: `revenue-${Date.now()}`,
        type: 'REVENUE_BEHIND',
        severity: revenue.todayProgress < 50 ? 'CRITICAL' : 'WARNING',
        message: `Revenue at ${Math.round(revenue.todayProgress)}% of daily target`,
        affectedEntity: 'Organization',
        value: revenue.todayRecognized,
        threshold: revenue.todayTarget,
        createdAt: new Date(),
      });
    }

    // Margin erosion alerts
    for (const alert of margin.marginAlerts.slice(0, 3)) {
      alerts.push({
        id: `margin-${alert.workOrderId}`,
        type: 'MARGIN_EROSION',
        severity: alert.severity,
        message: `${alert.workOrderNumber}: Margin at ${alert.currentMargin}% (${alert.variance}% variance)`,
        affectedEntity: alert.workOrderNumber,
        value: alert.currentMargin,
        threshold: alert.quotedMargin,
        createdAt: new Date(),
      });
    }

    // Past due receivables
    if (cashFlow.pastDueReceivables > 10000) {
      alerts.push({
        id: `overdue-${Date.now()}`,
        type: 'OVERDUE_RECEIVABLE',
        severity: cashFlow.pastDueReceivables > 50000 ? 'CRITICAL' : 'WARNING',
        message: `Past due receivables: $${Math.round(cashFlow.pastDueReceivables).toLocaleString()}`,
        affectedEntity: 'Receivables',
        value: cashFlow.pastDueReceivables,
        threshold: 10000,
        createdAt: new Date(),
      });
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ===========================================================================
  // SCHEDULED JOBS
  // ===========================================================================

  /**
   * Update financial snapshots periodically
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateFinancialSnapshots(): Promise<void> {
    // In production, would cache/store snapshots for quick access
    this.logger.debug('Updating financial snapshots...');
  }
}
