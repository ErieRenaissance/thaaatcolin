/**
 * Feralis Manufacturing Platform
 * OEE Calculation Service
 * 
 * Overall Equipment Effectiveness (OEE) calculations:
 * - Availability = Running Time / Planned Production Time
 * - Performance = (Ideal Cycle Time × Total Parts) / Running Time
 * - Quality = Good Parts / Total Parts
 * - OEE = Availability × Performance × Quality
 * 
 * Features:
 * - Real-time OEE per machine
 * - Loss categorization (downtime, speed, quality)
 * - Shift/day/week trending
 * - Pareto analysis of losses
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export enum LossCategory {
  // Availability Losses (Downtime)
  PLANNED_DOWNTIME = 'PLANNED_DOWNTIME',
  UNPLANNED_DOWNTIME = 'UNPLANNED_DOWNTIME',
  SETUP_CHANGEOVER = 'SETUP_CHANGEOVER',
  BREAKDOWN = 'BREAKDOWN',
  WAITING_MATERIAL = 'WAITING_MATERIAL',
  WAITING_OPERATOR = 'WAITING_OPERATOR',
  WAITING_TOOLING = 'WAITING_TOOLING',
  
  // Performance Losses (Speed)
  MINOR_STOPS = 'MINOR_STOPS',
  REDUCED_SPEED = 'REDUCED_SPEED',
  IDLE_SMALL_STOPS = 'IDLE_SMALL_STOPS',
  
  // Quality Losses
  STARTUP_REJECTS = 'STARTUP_REJECTS',
  PRODUCTION_REJECTS = 'PRODUCTION_REJECTS',
  REWORK = 'REWORK',
}

export interface OeeSnapshot {
  machineId: string;
  machineName: string;
  workCenterId: string;
  timestamp: Date;
  periodStart: Date;
  periodEnd: Date;
  
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  
  // Time breakdown (in minutes)
  plannedProductionTime: number;
  runningTime: number;
  downtimeMinutes: number;
  
  // Production counts
  totalParts: number;
  goodParts: number;
  scrapParts: number;
  reworkParts: number;
  
  // Ideal vs actual
  idealCycleTimeSeconds: number;
  actualCycleTimeSeconds: number;
  
  // Targets
  oeeTarget: number;
  availabilityTarget: number;
  performanceTarget: number;
  qualityTarget: number;
  
  // Status
  status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  trend: 'UP' | 'DOWN' | 'STABLE';
  previousOee?: number;
}

export interface OeeLossBreakdown {
  machineId: string;
  periodStart: Date;
  periodEnd: Date;
  
  availabilityLosses: LossDetail[];
  performanceLosses: LossDetail[];
  qualityLosses: LossDetail[];
  
  totalAvailabilityLossMinutes: number;
  totalPerformanceLossMinutes: number;
  totalQualityLossMinutes: number;
}

export interface LossDetail {
  category: LossCategory;
  reason: string;
  durationMinutes: number;
  occurrences: number;
  percentage: number;
  impactOnOee: number;
}

export interface OeeTrend {
  machineId: string;
  machineName: string;
  dataPoints: OeeTrendPoint[];
  average: number;
  min: number;
  max: number;
  standardDeviation: number;
}

export interface OeeTrendPoint {
  timestamp: Date;
  periodLabel: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
}

export interface OeeDashboard {
  timestamp: Date;
  organizationId: string;
  facilityId?: string;
  
  overallOee: number;
  overallAvailability: number;
  overallPerformance: number;
  overallQuality: number;
  
  machineSnapshots: OeeSnapshot[];
  topPerformers: OeeSnapshot[];
  bottomPerformers: OeeSnapshot[];
  
  lossPareto: ParetoItem[];
  
  shiftComparison: ShiftOeeComparison;
  dailyTrend: OeeTrendPoint[];
  weeklyTrend: OeeTrendPoint[];
}

export interface ParetoItem {
  category: LossCategory;
  description: string;
  minutes: number;
  percentage: number;
  cumulativePercentage: number;
  affectedMachines: number;
}

export interface ShiftOeeComparison {
  currentShift: ShiftOee;
  previousShift?: ShiftOee;
  dayAgoShift?: ShiftOee;
  weekAgoShift?: ShiftOee;
}

export interface ShiftOee {
  shiftName: string;
  shiftDate: Date;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  machineCount: number;
}

export interface OeeCalculationInput {
  machineId: string;
  periodStart: Date;
  periodEnd: Date;
  plannedProductionMinutes: number;
  idealCycleTimeSeconds: number;
}

export interface DowntimeEvent {
  id: string;
  machineId: string;
  startTime: Date;
  endTime?: Date;
  durationMinutes: number;
  category: LossCategory;
  reason: string;
  isPlanned: boolean;
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

@Injectable()
export class OeeCalculationService {
  private readonly logger = new Logger(OeeCalculationService.name);
  
  // OEE thresholds
  private readonly OEE_EXCELLENT = 85;
  private readonly OEE_GOOD = 75;
  private readonly OEE_FAIR = 65;
  
  // Default targets
  private readonly DEFAULT_OEE_TARGET = 85;
  private readonly DEFAULT_AVAILABILITY_TARGET = 90;
  private readonly DEFAULT_PERFORMANCE_TARGET = 95;
  private readonly DEFAULT_QUALITY_TARGET = 99;

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // OEE CALCULATIONS
  // ===========================================================================

  /**
   * Calculate OEE for a specific machine and time period
   */
  async calculateMachineOee(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OeeSnapshot> {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      include: { workCenter: true },
    });

    if (!machine) {
      throw new Error(`Machine ${machineId} not found`);
    }

    // Get planned production time
    const plannedMinutes = await this.getPlannedProductionTime(
      machineId,
      periodStart,
      periodEnd,
    );

    // Get downtime events
    const downtime = await this.getDowntimeMinutes(
      machineId,
      periodStart,
      periodEnd,
    );

    // Get production counts
    const production = await this.getProductionCounts(
      machineId,
      periodStart,
      periodEnd,
    );

    // Get ideal cycle time
    const idealCycleTime = await this.getIdealCycleTime(machineId, periodStart, periodEnd);

    // Calculate components
    const runningTime = Math.max(0, plannedMinutes - downtime);
    
    const availability = plannedMinutes > 0 
      ? (runningTime / plannedMinutes) * 100 
      : 0;

    const theoreticalOutput = idealCycleTime > 0 
      ? (runningTime * 60) / idealCycleTime 
      : 0;
    
    const performance = theoreticalOutput > 0 
      ? (production.total / theoreticalOutput) * 100 
      : 0;

    const quality = production.total > 0 
      ? (production.good / production.total) * 100 
      : 0;

    const oee = (availability * performance * quality) / 10000;

    // Get targets
    const targets = await this.getMachineTargets(machineId);

    // Get previous period for trend
    const previousPeriod = this.getPreviousPeriod(periodStart, periodEnd);
    const previousSnapshot = await this.getHistoricalOee(
      machineId,
      previousPeriod.start,
      previousPeriod.end,
    );

    // Determine trend
    let trend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (previousSnapshot) {
      if (oee > previousSnapshot.oee + 2) trend = 'UP';
      else if (oee < previousSnapshot.oee - 2) trend = 'DOWN';
    }

    // Determine status
    let status: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    if (oee >= this.OEE_EXCELLENT) status = 'EXCELLENT';
    else if (oee >= this.OEE_GOOD) status = 'GOOD';
    else if (oee >= this.OEE_FAIR) status = 'FAIR';
    else status = 'POOR';

    return {
      machineId,
      machineName: machine.name,
      workCenterId: machine.workCenterId,
      timestamp: new Date(),
      periodStart,
      periodEnd,
      oee: Math.round(oee * 10) / 10,
      availability: Math.round(availability * 10) / 10,
      performance: Math.min(100, Math.round(performance * 10) / 10), // Cap at 100%
      quality: Math.round(quality * 10) / 10,
      plannedProductionTime: plannedMinutes,
      runningTime,
      downtimeMinutes: downtime,
      totalParts: production.total,
      goodParts: production.good,
      scrapParts: production.scrap,
      reworkParts: production.rework,
      idealCycleTimeSeconds: idealCycleTime,
      actualCycleTimeSeconds: production.total > 0 
        ? (runningTime * 60) / production.total 
        : 0,
      oeeTarget: targets.oee,
      availabilityTarget: targets.availability,
      performanceTarget: targets.performance,
      qualityTarget: targets.quality,
      status,
      trend,
      previousOee: previousSnapshot?.oee,
    };
  }

  /**
   * Get loss breakdown for a machine
   */
  async getLossBreakdown(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OeeLossBreakdown> {
    // Get all downtime events
    const downtimeEvents = await this.getDowntimeEvents(
      machineId,
      periodStart,
      periodEnd,
    );

    // Get production data for quality losses
    const production = await this.getProductionDetails(
      machineId,
      periodStart,
      periodEnd,
    );

    // Categorize availability losses
    const availabilityLosses = this.categorizeAvailabilityLosses(downtimeEvents);
    const totalAvailabilityLoss = availabilityLosses.reduce(
      (sum, l) => sum + l.durationMinutes,
      0,
    );

    // Calculate performance losses (speed losses)
    const performanceLosses = await this.calculatePerformanceLosses(
      machineId,
      periodStart,
      periodEnd,
    );
    const totalPerformanceLoss = performanceLosses.reduce(
      (sum, l) => sum + l.durationMinutes,
      0,
    );

    // Calculate quality losses
    const qualityLosses = this.calculateQualityLosses(production);
    const totalQualityLoss = qualityLosses.reduce(
      (sum, l) => sum + l.durationMinutes,
      0,
    );

    // Calculate percentages and OEE impact
    const totalLossTime = totalAvailabilityLoss + totalPerformanceLoss + totalQualityLoss;
    
    const enrichLosses = (losses: LossDetail[]): LossDetail[] => {
      return losses.map(loss => ({
        ...loss,
        percentage: totalLossTime > 0 
          ? (loss.durationMinutes / totalLossTime) * 100 
          : 0,
        impactOnOee: totalLossTime > 0
          ? (loss.durationMinutes / totalLossTime) * 100
          : 0,
      }));
    };

    return {
      machineId,
      periodStart,
      periodEnd,
      availabilityLosses: enrichLosses(availabilityLosses),
      performanceLosses: enrichLosses(performanceLosses),
      qualityLosses: enrichLosses(qualityLosses),
      totalAvailabilityLossMinutes: totalAvailabilityLoss,
      totalPerformanceLossMinutes: totalPerformanceLoss,
      totalQualityLossMinutes: totalQualityLoss,
    };
  }

  /**
   * Get OEE trend over time
   */
  async getOeeTrend(
    machineId: string,
    periodType: 'HOUR' | 'SHIFT' | 'DAY' | 'WEEK',
    count: number = 10,
  ): Promise<OeeTrend> {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!machine) {
      throw new Error(`Machine ${machineId} not found`);
    }

    const dataPoints: OeeTrendPoint[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const { start, end, label } = this.getPeriodBounds(now, periodType, i);
      
      try {
        const snapshot = await this.calculateMachineOee(machineId, start, end);
        dataPoints.push({
          timestamp: start,
          periodLabel: label,
          oee: snapshot.oee,
          availability: snapshot.availability,
          performance: snapshot.performance,
          quality: snapshot.quality,
        });
      } catch (error) {
        // No data for this period
        dataPoints.push({
          timestamp: start,
          periodLabel: label,
          oee: 0,
          availability: 0,
          performance: 0,
          quality: 0,
        });
      }
    }

    const oeeValues = dataPoints.filter(d => d.oee > 0).map(d => d.oee);
    const average = oeeValues.length > 0
      ? oeeValues.reduce((a, b) => a + b, 0) / oeeValues.length
      : 0;
    const min = oeeValues.length > 0 ? Math.min(...oeeValues) : 0;
    const max = oeeValues.length > 0 ? Math.max(...oeeValues) : 0;
    
    const variance = oeeValues.length > 0
      ? oeeValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / oeeValues.length
      : 0;
    const standardDeviation = Math.sqrt(variance);

    return {
      machineId,
      machineName: machine.name,
      dataPoints,
      average: Math.round(average * 10) / 10,
      min: Math.round(min * 10) / 10,
      max: Math.round(max * 10) / 10,
      standardDeviation: Math.round(standardDeviation * 10) / 10,
    };
  }

  // ===========================================================================
  // OEE DASHBOARD
  // ===========================================================================

  /**
   * Get complete OEE dashboard
   */
  async getOeeDashboard(
    organizationId: string,
    facilityId?: string,
  ): Promise<OeeDashboard> {
    // Get current shift bounds
    const { start: shiftStart, end: shiftEnd } = this.getCurrentShiftBounds();

    // Get all machines
    const machines = await this.prisma.machine.findMany({
      where: {
        organizationId,
        ...(facilityId && { workCenter: { facilityId } }),
        isActive: true,
      },
    });

    // Calculate OEE for all machines
    const snapshots: OeeSnapshot[] = [];
    for (const machine of machines) {
      try {
        const snapshot = await this.calculateMachineOee(
          machine.id,
          shiftStart,
          shiftEnd,
        );
        snapshots.push(snapshot);
      } catch (error) {
        this.logger.warn(`Failed to calculate OEE for machine ${machine.id}`);
      }
    }

    // Sort by OEE
    const sortedByOee = [...snapshots].sort((a, b) => b.oee - a.oee);

    // Calculate overall metrics
    const overallOee = this.calculateWeightedAverage(snapshots, 'oee');
    const overallAvailability = this.calculateWeightedAverage(snapshots, 'availability');
    const overallPerformance = this.calculateWeightedAverage(snapshots, 'performance');
    const overallQuality = this.calculateWeightedAverage(snapshots, 'quality');

    // Get loss pareto
    const lossPareto = await this.getLossPareto(organizationId, shiftStart, shiftEnd);

    // Get shift comparisons
    const shiftComparison = await this.getShiftComparison(organizationId, facilityId);

    // Get daily trend
    const dailyTrend = await this.getOrganizationTrend(
      organizationId,
      facilityId,
      'DAY',
      7,
    );

    // Get weekly trend
    const weeklyTrend = await this.getOrganizationTrend(
      organizationId,
      facilityId,
      'WEEK',
      4,
    );

    return {
      timestamp: new Date(),
      organizationId,
      facilityId,
      overallOee,
      overallAvailability,
      overallPerformance,
      overallQuality,
      machineSnapshots: snapshots,
      topPerformers: sortedByOee.slice(0, 5),
      bottomPerformers: sortedByOee.slice(-5).reverse(),
      lossPareto,
      shiftComparison,
      dailyTrend,
      weeklyTrend,
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private async getPlannedProductionTime(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    // Get scheduled shift time minus planned maintenance
    const totalMinutes = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60);
    
    // Get planned downtime (maintenance, breaks, etc.)
    const plannedDowntime = await this.prisma.machineDowntime.aggregate({
      where: {
        machineId,
        startTime: { gte: periodStart },
        endTime: { lte: periodEnd },
        isPlanned: true,
      },
      _sum: { durationMinutes: true },
    });

    return Math.max(0, totalMinutes - (plannedDowntime._sum.durationMinutes || 0));
  }

  private async getDowntimeMinutes(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const downtime = await this.prisma.machineDowntime.aggregate({
      where: {
        machineId,
        startTime: { gte: periodStart },
        endTime: { lte: periodEnd },
      },
      _sum: { durationMinutes: true },
    });

    return downtime._sum.durationMinutes || 0;
  }

  private async getDowntimeEvents(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<DowntimeEvent[]> {
    const events = await this.prisma.machineDowntime.findMany({
      where: {
        machineId,
        startTime: { gte: periodStart },
        OR: [
          { endTime: { lte: periodEnd } },
          { endTime: null },
        ],
      },
      orderBy: { startTime: 'asc' },
    });

    return events.map(event => ({
      id: event.id,
      machineId: event.machineId,
      startTime: event.startTime,
      endTime: event.endTime,
      durationMinutes: event.durationMinutes || 0,
      category: this.mapDowntimeCategory(event.reason),
      reason: event.reason || 'Unknown',
      isPlanned: event.isPlanned,
    }));
  }

  private mapDowntimeCategory(reason: string | null): LossCategory {
    if (!reason) return LossCategory.UNPLANNED_DOWNTIME;
    
    const reasonLower = reason.toLowerCase();
    
    if (reasonLower.includes('setup') || reasonLower.includes('changeover')) {
      return LossCategory.SETUP_CHANGEOVER;
    }
    if (reasonLower.includes('breakdown') || reasonLower.includes('failure')) {
      return LossCategory.BREAKDOWN;
    }
    if (reasonLower.includes('material') || reasonLower.includes('stock')) {
      return LossCategory.WAITING_MATERIAL;
    }
    if (reasonLower.includes('operator') || reasonLower.includes('personnel')) {
      return LossCategory.WAITING_OPERATOR;
    }
    if (reasonLower.includes('tool') || reasonLower.includes('tooling')) {
      return LossCategory.WAITING_TOOLING;
    }
    if (reasonLower.includes('maintenance') || reasonLower.includes('pm')) {
      return LossCategory.PLANNED_DOWNTIME;
    }
    
    return LossCategory.UNPLANNED_DOWNTIME;
  }

  private async getProductionCounts(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ total: number; good: number; scrap: number; rework: number }> {
    const production = await this.prisma.workOrderOperation.aggregate({
      where: {
        machineId,
        actualEndTime: { gte: periodStart, lte: periodEnd },
      },
      _sum: {
        quantityCompleted: true,
        quantityScrapped: true,
      },
    });

    const good = production._sum.quantityCompleted || 0;
    const scrap = production._sum.quantityScrapped || 0;
    
    // Estimate rework from NCRs
    const reworkCount = await this.prisma.ncr.count({
      where: {
        workOrderId: { not: null },
        disposition: 'REWORK',
        createdAt: { gte: periodStart, lte: periodEnd },
      },
    });

    const total = good + scrap + reworkCount;

    return { total, good, scrap, rework: reworkCount };
  }

  private async getProductionDetails(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{
    total: number;
    good: number;
    scrap: number;
    rework: number;
    idealCycleTime: number;
    actualCycleTime: number;
  }> {
    const counts = await this.getProductionCounts(machineId, periodStart, periodEnd);
    const idealCycleTime = await this.getIdealCycleTime(machineId, periodStart, periodEnd);
    
    // Calculate actual cycle time from running time / total parts
    const runningMinutes = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60);
    const downtime = await this.getDowntimeMinutes(machineId, periodStart, periodEnd);
    const actualRunning = runningMinutes - downtime;
    const actualCycleTime = counts.total > 0 ? (actualRunning * 60) / counts.total : 0;

    return {
      ...counts,
      idealCycleTime,
      actualCycleTime,
    };
  }

  private async getIdealCycleTime(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    // Get average standard cycle time from operations run during period
    const operations = await this.prisma.workOrderOperation.findMany({
      where: {
        machineId,
        actualEndTime: { gte: periodStart, lte: periodEnd },
      },
      select: { standardMinutes: true, quantityCompleted: true },
    });

    if (operations.length === 0) return 60; // Default 60 seconds

    let totalCycleTime = 0;
    let totalParts = 0;

    for (const op of operations) {
      if (op.standardMinutes && op.quantityCompleted) {
        totalCycleTime += (op.standardMinutes * 60) / op.quantityCompleted;
        totalParts++;
      }
    }

    return totalParts > 0 ? totalCycleTime / totalParts : 60;
  }

  private async getMachineTargets(machineId: string): Promise<{
    oee: number;
    availability: number;
    performance: number;
    quality: number;
  }> {
    // In production, would get from machine configuration
    // For now, return defaults
    return {
      oee: this.DEFAULT_OEE_TARGET,
      availability: this.DEFAULT_AVAILABILITY_TARGET,
      performance: this.DEFAULT_PERFORMANCE_TARGET,
      quality: this.DEFAULT_QUALITY_TARGET,
    };
  }

  private async getHistoricalOee(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<OeeSnapshot | null> {
    try {
      return await this.calculateMachineOee(machineId, periodStart, periodEnd);
    } catch {
      return null;
    }
  }

  private getPreviousPeriod(
    periodStart: Date,
    periodEnd: Date,
  ): { start: Date; end: Date } {
    const duration = periodEnd.getTime() - periodStart.getTime();
    return {
      start: new Date(periodStart.getTime() - duration),
      end: new Date(periodEnd.getTime() - duration),
    };
  }

  private getPeriodBounds(
    reference: Date,
    periodType: 'HOUR' | 'SHIFT' | 'DAY' | 'WEEK',
    periodsBack: number,
  ): { start: Date; end: Date; label: string } {
    const start = new Date(reference);
    const end = new Date(reference);

    switch (periodType) {
      case 'HOUR':
        start.setHours(start.getHours() - periodsBack, 0, 0, 0);
        end.setHours(end.getHours() - periodsBack + 1, 0, 0, 0);
        return {
          start,
          end,
          label: start.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }),
        };
      
      case 'SHIFT':
        // Assume 8-hour shifts starting at 6 AM
        const shiftHour = Math.floor((reference.getHours() - 6) / 8) * 8 + 6;
        start.setHours(shiftHour - periodsBack * 8, 0, 0, 0);
        end.setHours(shiftHour - periodsBack * 8 + 8, 0, 0, 0);
        const shiftNum = Math.floor((start.getHours() - 6) / 8) + 1;
        return { start, end, label: `Shift ${shiftNum}` };
      
      case 'DAY':
        start.setDate(start.getDate() - periodsBack);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() - periodsBack);
        end.setHours(23, 59, 59, 999);
        return {
          start,
          end,
          label: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        };
      
      case 'WEEK':
        start.setDate(start.getDate() - periodsBack * 7);
        start.setHours(0, 0, 0, 0);
        // Go to start of week
        start.setDate(start.getDate() - start.getDay());
        end.setTime(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        return {
          start,
          end,
          label: `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        };
    }
  }

  private getCurrentShiftBounds(): { start: Date; end: Date } {
    const now = new Date();
    const hour = now.getHours();
    
    // 6 AM - 2 PM = Shift 1
    // 2 PM - 10 PM = Shift 2
    // 10 PM - 6 AM = Shift 3
    
    let shiftStart: Date;
    if (hour >= 6 && hour < 14) {
      shiftStart = new Date(now);
      shiftStart.setHours(6, 0, 0, 0);
    } else if (hour >= 14 && hour < 22) {
      shiftStart = new Date(now);
      shiftStart.setHours(14, 0, 0, 0);
    } else {
      shiftStart = new Date(now);
      if (hour < 6) {
        shiftStart.setDate(shiftStart.getDate() - 1);
      }
      shiftStart.setHours(22, 0, 0, 0);
    }

    const shiftEnd = new Date(shiftStart.getTime() + 8 * 60 * 60 * 1000);

    return { start: shiftStart, end: shiftEnd };
  }

  private categorizeAvailabilityLosses(events: DowntimeEvent[]): LossDetail[] {
    const categoryMap = new Map<LossCategory, { duration: number; count: number; reasons: Set<string> }>();

    for (const event of events) {
      const existing = categoryMap.get(event.category);
      if (existing) {
        existing.duration += event.durationMinutes;
        existing.count++;
        existing.reasons.add(event.reason);
      } else {
        categoryMap.set(event.category, {
          duration: event.durationMinutes,
          count: 1,
          reasons: new Set([event.reason]),
        });
      }
    }

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      reason: Array.from(data.reasons).slice(0, 3).join(', '),
      durationMinutes: data.duration,
      occurrences: data.count,
      percentage: 0, // Calculated later
      impactOnOee: 0, // Calculated later
    })).sort((a, b) => b.durationMinutes - a.durationMinutes);
  }

  private async calculatePerformanceLosses(
    machineId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<LossDetail[]> {
    // Performance losses are speed losses - difference between ideal and actual cycle time
    const production = await this.getProductionDetails(machineId, periodStart, periodEnd);
    
    if (production.total === 0) return [];

    const speedLossMinutes = production.total > 0
      ? (production.actualCycleTime - production.idealCycleTime) * production.total / 60
      : 0;

    if (speedLossMinutes <= 0) return [];

    return [{
      category: LossCategory.REDUCED_SPEED,
      reason: 'Running below ideal cycle time',
      durationMinutes: Math.max(0, speedLossMinutes),
      occurrences: 1,
      percentage: 0,
      impactOnOee: 0,
    }];
  }

  private calculateQualityLosses(production: {
    total: number;
    good: number;
    scrap: number;
    rework: number;
    idealCycleTime: number;
  }): LossDetail[] {
    const losses: LossDetail[] = [];

    if (production.scrap > 0) {
      losses.push({
        category: LossCategory.PRODUCTION_REJECTS,
        reason: 'Scrap parts',
        durationMinutes: (production.scrap * production.idealCycleTime) / 60,
        occurrences: production.scrap,
        percentage: 0,
        impactOnOee: 0,
      });
    }

    if (production.rework > 0) {
      losses.push({
        category: LossCategory.REWORK,
        reason: 'Parts requiring rework',
        durationMinutes: (production.rework * production.idealCycleTime) / 60,
        occurrences: production.rework,
        percentage: 0,
        impactOnOee: 0,
      });
    }

    return losses;
  }

  private calculateWeightedAverage(
    snapshots: OeeSnapshot[],
    field: 'oee' | 'availability' | 'performance' | 'quality',
  ): number {
    if (snapshots.length === 0) return 0;

    let totalValue = 0;
    let totalWeight = 0;

    for (const snapshot of snapshots) {
      const weight = snapshot.plannedProductionTime;
      totalValue += snapshot[field] * weight;
      totalWeight += weight;
    }

    return totalWeight > 0
      ? Math.round((totalValue / totalWeight) * 10) / 10
      : 0;
  }

  private async getLossPareto(
    organizationId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ParetoItem[]> {
    // Get all machines
    const machines = await this.prisma.machine.findMany({
      where: { organizationId, isActive: true },
      select: { id: true },
    });

    const categoryTotals = new Map<LossCategory, { minutes: number; machines: Set<string> }>();

    for (const machine of machines) {
      const breakdown = await this.getLossBreakdown(machine.id, periodStart, periodEnd);
      
      const allLosses = [
        ...breakdown.availabilityLosses,
        ...breakdown.performanceLosses,
        ...breakdown.qualityLosses,
      ];

      for (const loss of allLosses) {
        const existing = categoryTotals.get(loss.category);
        if (existing) {
          existing.minutes += loss.durationMinutes;
          existing.machines.add(machine.id);
        } else {
          categoryTotals.set(loss.category, {
            minutes: loss.durationMinutes,
            machines: new Set([machine.id]),
          });
        }
      }
    }

    // Sort by minutes descending
    const sorted = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1].minutes - a[1].minutes);

    const totalMinutes = sorted.reduce((sum, [_, data]) => sum + data.minutes, 0);
    
    let cumulative = 0;
    return sorted.map(([category, data]) => {
      const percentage = totalMinutes > 0 ? (data.minutes / totalMinutes) * 100 : 0;
      cumulative += percentage;
      return {
        category,
        description: this.getLossCategoryDescription(category),
        minutes: Math.round(data.minutes),
        percentage: Math.round(percentage * 10) / 10,
        cumulativePercentage: Math.round(cumulative * 10) / 10,
        affectedMachines: data.machines.size,
      };
    });
  }

  private getLossCategoryDescription(category: LossCategory): string {
    const descriptions: Record<LossCategory, string> = {
      [LossCategory.PLANNED_DOWNTIME]: 'Scheduled maintenance & breaks',
      [LossCategory.UNPLANNED_DOWNTIME]: 'Unexpected stoppages',
      [LossCategory.SETUP_CHANGEOVER]: 'Setup & changeover time',
      [LossCategory.BREAKDOWN]: 'Equipment breakdown',
      [LossCategory.WAITING_MATERIAL]: 'Waiting for material',
      [LossCategory.WAITING_OPERATOR]: 'Waiting for operator',
      [LossCategory.WAITING_TOOLING]: 'Waiting for tooling',
      [LossCategory.MINOR_STOPS]: 'Minor stops & interruptions',
      [LossCategory.REDUCED_SPEED]: 'Running below ideal speed',
      [LossCategory.IDLE_SMALL_STOPS]: 'Small stops & idling',
      [LossCategory.STARTUP_REJECTS]: 'Start-up rejects',
      [LossCategory.PRODUCTION_REJECTS]: 'Production scrap',
      [LossCategory.REWORK]: 'Rework required',
    };
    return descriptions[category] || category;
  }

  private async getShiftComparison(
    organizationId: string,
    facilityId?: string,
  ): Promise<ShiftOeeComparison> {
    const current = this.getCurrentShiftBounds();
    
    const currentShift = await this.calculateShiftOee(
      organizationId,
      facilityId,
      current.start,
      current.end,
      'Current',
    );

    // Previous shift
    const prevStart = new Date(current.start.getTime() - 8 * 60 * 60 * 1000);
    const prevEnd = new Date(current.end.getTime() - 8 * 60 * 60 * 1000);
    const previousShift = await this.calculateShiftOee(
      organizationId,
      facilityId,
      prevStart,
      prevEnd,
      'Previous',
    );

    // Day ago
    const dayAgoStart = new Date(current.start.getTime() - 24 * 60 * 60 * 1000);
    const dayAgoEnd = new Date(current.end.getTime() - 24 * 60 * 60 * 1000);
    const dayAgoShift = await this.calculateShiftOee(
      organizationId,
      facilityId,
      dayAgoStart,
      dayAgoEnd,
      'Day Ago',
    );

    // Week ago
    const weekAgoStart = new Date(current.start.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoEnd = new Date(current.end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoShift = await this.calculateShiftOee(
      organizationId,
      facilityId,
      weekAgoStart,
      weekAgoEnd,
      'Week Ago',
    );

    return {
      currentShift,
      previousShift,
      dayAgoShift,
      weekAgoShift,
    };
  }

  private async calculateShiftOee(
    organizationId: string,
    facilityId: string | undefined,
    start: Date,
    end: Date,
    name: string,
  ): Promise<ShiftOee> {
    const machines = await this.prisma.machine.findMany({
      where: {
        organizationId,
        ...(facilityId && { workCenter: { facilityId } }),
        isActive: true,
      },
    });

    const snapshots: OeeSnapshot[] = [];
    for (const machine of machines) {
      try {
        const snapshot = await this.calculateMachineOee(machine.id, start, end);
        snapshots.push(snapshot);
      } catch {
        // Skip machines with no data
      }
    }

    return {
      shiftName: name,
      shiftDate: start,
      oee: this.calculateWeightedAverage(snapshots, 'oee'),
      availability: this.calculateWeightedAverage(snapshots, 'availability'),
      performance: this.calculateWeightedAverage(snapshots, 'performance'),
      quality: this.calculateWeightedAverage(snapshots, 'quality'),
      machineCount: snapshots.length,
    };
  }

  private async getOrganizationTrend(
    organizationId: string,
    facilityId: string | undefined,
    periodType: 'DAY' | 'WEEK',
    count: number,
  ): Promise<OeeTrendPoint[]> {
    const dataPoints: OeeTrendPoint[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      const { start, end, label } = this.getPeriodBounds(now, periodType, i);
      
      const machines = await this.prisma.machine.findMany({
        where: {
          organizationId,
          ...(facilityId && { workCenter: { facilityId } }),
          isActive: true,
        },
      });

      const snapshots: OeeSnapshot[] = [];
      for (const machine of machines) {
        try {
          const snapshot = await this.calculateMachineOee(machine.id, start, end);
          snapshots.push(snapshot);
        } catch {
          // Skip
        }
      }

      dataPoints.push({
        timestamp: start,
        periodLabel: label,
        oee: this.calculateWeightedAverage(snapshots, 'oee'),
        availability: this.calculateWeightedAverage(snapshots, 'availability'),
        performance: this.calculateWeightedAverage(snapshots, 'performance'),
        quality: this.calculateWeightedAverage(snapshots, 'quality'),
      });
    }

    return dataPoints;
  }

  // ===========================================================================
  // SCHEDULED JOBS
  // ===========================================================================

  /**
   * Store OEE snapshots for historical tracking
   */
  @Cron(CronExpression.EVERY_HOUR)
  async storeHourlyOeeSnapshots(): Promise<void> {
    this.logger.log('Storing hourly OEE snapshots...');
    
    // Implementation would store snapshots to database
    // for long-term trending and analysis
  }
}
