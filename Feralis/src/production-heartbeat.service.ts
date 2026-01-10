/**
 * Feralis Manufacturing Platform
 * Production Heartbeat Service
 * 
 * Real-time shop floor monitoring and visualization:
 * - Machine status tracking with color-coded states
 * - Floor plan layout management
 * - Live telemetry aggregation
 * - Historical state comparison
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export enum MachineStatus {
  RUNNING = 'RUNNING',
  IDLE = 'IDLE',
  SETUP = 'SETUP',
  MAINTENANCE = 'MAINTENANCE',
  ALARM = 'ALARM',
  OFFLINE = 'OFFLINE',
  WARMUP = 'WARMUP',
  BREAKDOWN = 'BREAKDOWN',
}

export interface MachinePosition {
  machineId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface MachineNode {
  id: string;
  code: string;
  name: string;
  type: string;
  workCenterId: string;
  workCenterName: string;
  status: MachineStatus;
  statusSince: Date;
  position: MachinePosition;
  utilization: number;
  currentJob?: CurrentJobInfo;
  telemetry: MachineTelemetrySnapshot;
  alarmCount: number;
  lastAlarm?: AlarmInfo;
  isDataStale: boolean;
}

export interface CurrentJobInfo {
  workOrderId: string;
  workOrderNumber: string;
  operationId: string;
  operationSequence: number;
  partNumber: string;
  partName: string;
  quantityRequired: number;
  quantityCompleted: number;
  estimatedCompletion?: Date;
  operatorName?: string;
}

export interface MachineTelemetrySnapshot {
  timestamp: Date;
  spindleRpm?: number;
  feedRate?: number;
  loadPercent?: number;
  temperature?: number;
  powerKw?: number;
  cycleTime?: number;
  partsPerHour?: number;
}

export interface AlarmInfo {
  id: string;
  code: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
}

export interface FloorPlanConfig {
  id: string;
  name: string;
  facilityId: string;
  imageUrl?: string;
  width: number;
  height: number;
  gridSize: number;
  machines: MachinePosition[];
  workCenterZones: WorkCenterZone[];
}

export interface WorkCenterZone {
  workCenterId: string;
  name: string;
  color: string;
  bounds: { x: number; y: number; width: number; height: number };
}

export interface ShopFloorSnapshot {
  timestamp: Date;
  facilityId: string;
  floorPlan: FloorPlanConfig;
  machines: MachineNode[];
  summary: FloorSummary;
  alerts: ActiveAlert[];
}

export interface FloorSummary {
  totalMachines: number;
  running: number;
  idle: number;
  setup: number;
  maintenance: number;
  alarm: number;
  offline: number;
  overallUtilization: number;
  activeJobs: number;
  partsProducedToday: number;
}

export interface ActiveAlert {
  id: string;
  machineId: string;
  machineName: string;
  type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface HistoricalComparison {
  currentTime: Date;
  comparisonTime: Date;
  machines: MachineHistoricalNode[];
}

export interface MachineHistoricalNode {
  machineId: string;
  machineName: string;
  currentStatus: MachineStatus;
  historicalStatus: MachineStatus;
  statusChange: 'SAME' | 'IMPROVED' | 'DEGRADED';
  currentUtilization: number;
  historicalUtilization: number;
  utilizationChange: number;
}

export interface MachineDetailPanel {
  machine: MachineNode;
  telemetryHistory: TelemetryDataPoint[];
  recentAlarms: AlarmInfo[];
  performanceMetrics: MachinePerformanceMetrics;
  maintenanceInfo?: MaintenanceInfo;
}

export interface TelemetryDataPoint {
  timestamp: Date;
  spindleRpm?: number;
  feedRate?: number;
  loadPercent?: number;
  temperature?: number;
  powerKw?: number;
}

export interface MachinePerformanceMetrics {
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  mtbf?: number; // Mean time between failures
  mttr?: number; // Mean time to repair
  partsProducedToday: number;
  partsProducedShift: number;
  scrapToday: number;
  setupsToday: number;
}

export interface MaintenanceInfo {
  nextScheduled?: Date;
  lastCompleted?: Date;
  overdue: boolean;
  pendingTasks: number;
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

@Injectable()
export class ProductionHeartbeatService {
  private readonly logger = new Logger(ProductionHeartbeatService.name);
  private readonly STALE_DATA_THRESHOLD_SECONDS = 60;
  private readonly statusCache: Map<string, MachineNode[]> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // SHOP FLOOR VISUALIZATION
  // ===========================================================================

  /**
   * Get complete shop floor snapshot with all machine statuses
   */
  async getShopFloorSnapshot(
    organizationId: string,
    facilityId?: string,
  ): Promise<ShopFloorSnapshot> {
    // Get floor plan configuration
    const floorPlan = await this.getFloorPlan(organizationId, facilityId);

    // Get all machines with current status
    const machines = await this.getMachineNodes(organizationId, facilityId);

    // Calculate summary
    const summary = this.calculateFloorSummary(machines);

    // Get active alerts
    const alerts = await this.getActiveAlerts(organizationId, facilityId);

    return {
      timestamp: new Date(),
      facilityId: facilityId || 'default',
      floorPlan,
      machines,
      summary,
      alerts,
    };
  }

  /**
   * Get floor plan configuration
   */
  async getFloorPlan(
    organizationId: string,
    facilityId?: string,
  ): Promise<FloorPlanConfig> {
    // In production, this would come from database
    // For now, generate a default floor plan based on work centers

    const workCenters = await this.prisma.workCenter.findMany({
      where: {
        organizationId,
        ...(facilityId && { facilityId }),
        isActive: true,
      },
      include: {
        machines: {
          where: { isActive: true },
          select: { id: true, code: true },
        },
      },
    });

    // Generate positions for machines
    const machinePositions: MachinePosition[] = [];
    const workCenterZones: WorkCenterZone[] = [];
    let xOffset = 50;

    const colors = ['#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff3e0', '#fce4ec'];

    for (let i = 0; i < workCenters.length; i++) {
      const wc = workCenters[i];
      const zoneWidth = Math.max(200, wc.machines.length * 100);
      
      workCenterZones.push({
        workCenterId: wc.id,
        name: wc.name,
        color: colors[i % colors.length],
        bounds: { x: xOffset - 10, y: 40, width: zoneWidth, height: 200 },
      });

      for (let j = 0; j < wc.machines.length; j++) {
        machinePositions.push({
          machineId: wc.machines[j].id,
          x: xOffset + j * 100,
          y: 100,
          width: 80,
          height: 80,
          rotation: 0,
        });
      }

      xOffset += zoneWidth + 50;
    }

    return {
      id: `floor-plan-${facilityId || 'default'}`,
      name: 'Main Production Floor',
      facilityId: facilityId || 'default',
      width: Math.max(800, xOffset),
      height: 400,
      gridSize: 20,
      machines: machinePositions,
      workCenterZones,
    };
  }

  /**
   * Get all machine nodes with current status and telemetry
   */
  async getMachineNodes(
    organizationId: string,
    facilityId?: string,
  ): Promise<MachineNode[]> {
    const cacheKey = `${organizationId}-${facilityId || 'all'}`;
    
    // Get machines with their work centers
    const machines = await this.prisma.machine.findMany({
      where: {
        organizationId,
        ...(facilityId && { workCenter: { facilityId } }),
        isActive: true,
      },
      include: {
        workCenter: true,
      },
    });

    // Get floor plan for positions
    const floorPlan = await this.getFloorPlan(organizationId, facilityId);
    const positionMap = new Map(
      floorPlan.machines.map(p => [p.machineId, p])
    );

    // Get latest telemetry for all machines
    const latestTelemetry = await this.getLatestTelemetry(
      machines.map(m => m.id)
    );

    // Get current jobs
    const currentJobs = await this.getCurrentJobs(organizationId);

    // Get alarm counts
    const alarmCounts = await this.getAlarmCounts(machines.map(m => m.id));

    const nodes: MachineNode[] = machines.map(machine => {
      const telemetry = latestTelemetry.get(machine.id);
      const job = currentJobs.get(machine.id);
      const alarms = alarmCounts.get(machine.id) || { count: 0, lastAlarm: null };
      const position = positionMap.get(machine.id) || {
        machineId: machine.id,
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        rotation: 0,
      };

      const status = this.determineMachineStatus(machine, telemetry, job);
      const isDataStale = telemetry 
        ? this.isDataStale(telemetry.timestamp)
        : true;

      return {
        id: machine.id,
        code: machine.code,
        name: machine.name,
        type: machine.machineType,
        workCenterId: machine.workCenterId,
        workCenterName: machine.workCenter.name,
        status,
        statusSince: machine.updatedAt, // Would be tracked separately in production
        position,
        utilization: this.calculateUtilization(telemetry),
        currentJob: job,
        telemetry: telemetry || this.getEmptyTelemetry(),
        alarmCount: alarms.count,
        lastAlarm: alarms.lastAlarm,
        isDataStale,
      };
    });

    // Cache for quick access
    this.statusCache.set(cacheKey, nodes);

    return nodes;
  }

  /**
   * Get detailed machine panel information
   */
  async getMachineDetail(
    organizationId: string,
    machineId: string,
  ): Promise<MachineDetailPanel> {
    // Get machine node
    const machines = await this.getMachineNodes(organizationId);
    const machine = machines.find(m => m.id === machineId);

    if (!machine) {
      throw new Error(`Machine ${machineId} not found`);
    }

    // Get telemetry history (last hour)
    const telemetryHistory = await this.getTelemetryHistory(
      machineId,
      new Date(Date.now() - 60 * 60 * 1000),
      new Date(),
    );

    // Get recent alarms
    const recentAlarms = await this.getRecentAlarms(machineId, 5);

    // Get performance metrics
    const performanceMetrics = await this.getMachinePerformanceMetrics(
      machineId,
      organizationId,
    );

    // Get maintenance info
    const maintenanceInfo = await this.getMaintenanceInfo(machineId);

    return {
      machine,
      telemetryHistory,
      recentAlarms,
      performanceMetrics,
      maintenanceInfo,
    };
  }

  // ===========================================================================
  // HISTORICAL COMPARISON
  // ===========================================================================

  /**
   * Get historical comparison overlay
   */
  async getHistoricalComparison(
    organizationId: string,
    facilityId: string | undefined,
    comparisonTime: Date,
  ): Promise<HistoricalComparison> {
    // Get current machine states
    const currentMachines = await this.getMachineNodes(organizationId, facilityId);

    // Get historical states
    const historicalStates = await this.getHistoricalMachineStates(
      organizationId,
      facilityId,
      comparisonTime,
    );

    const comparisons: MachineHistoricalNode[] = currentMachines.map(current => {
      const historical = historicalStates.get(current.id);

      let statusChange: 'SAME' | 'IMPROVED' | 'DEGRADED' = 'SAME';
      if (historical) {
        const currentRank = this.getStatusRank(current.status);
        const historicalRank = this.getStatusRank(historical.status);
        if (currentRank > historicalRank) statusChange = 'IMPROVED';
        else if (currentRank < historicalRank) statusChange = 'DEGRADED';
      }

      return {
        machineId: current.id,
        machineName: current.name,
        currentStatus: current.status,
        historicalStatus: historical?.status || MachineStatus.OFFLINE,
        statusChange,
        currentUtilization: current.utilization,
        historicalUtilization: historical?.utilization || 0,
        utilizationChange: current.utilization - (historical?.utilization || 0),
      };
    });

    return {
      currentTime: new Date(),
      comparisonTime,
      machines: comparisons,
    };
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private async getLatestTelemetry(
    machineIds: string[],
  ): Promise<Map<string, MachineTelemetrySnapshot>> {
    const result = new Map<string, MachineTelemetrySnapshot>();

    if (machineIds.length === 0) return result;

    // Get latest telemetry records
    // In production, this would query TimescaleDB
    const telemetryRecords = await this.prisma.machineTelemetryRaw.findMany({
      where: {
        machineId: { in: machineIds },
        timestamp: { gte: new Date(Date.now() - 5 * 60 * 1000) }, // Last 5 minutes
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['machineId'],
    });

    for (const record of telemetryRecords) {
      const data = record.data as any;
      result.set(record.machineId, {
        timestamp: record.timestamp,
        spindleRpm: data.spindle_rpm,
        feedRate: data.feed_rate,
        loadPercent: data.load_percent,
        temperature: data.temperature,
        powerKw: data.power_kw,
        cycleTime: data.cycle_time,
        partsPerHour: data.parts_per_hour,
      });
    }

    return result;
  }

  private async getCurrentJobs(
    organizationId: string,
  ): Promise<Map<string, CurrentJobInfo>> {
    const result = new Map<string, CurrentJobInfo>();

    // Get operations that are currently in progress
    const activeOperations = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        status: 'IN_PROGRESS',
        machineId: { not: null },
      },
      include: {
        workOrder: {
          include: {
            orderLine: {
              include: {
                part: true,
              },
            },
          },
        },
        operator: true,
      },
    });

    for (const op of activeOperations) {
      if (!op.machineId) continue;

      result.set(op.machineId, {
        workOrderId: op.workOrderId,
        workOrderNumber: op.workOrder.workOrderNumber,
        operationId: op.id,
        operationSequence: op.sequenceNumber,
        partNumber: op.workOrder.orderLine?.part?.partNumber || 'N/A',
        partName: op.workOrder.orderLine?.part?.name || 'N/A',
        quantityRequired: op.workOrder.quantity,
        quantityCompleted: op.quantityCompleted,
        estimatedCompletion: op.estimatedEndTime,
        operatorName: op.operator 
          ? `${op.operator.firstName} ${op.operator.lastName}`
          : undefined,
      });
    }

    return result;
  }

  private async getAlarmCounts(
    machineIds: string[],
  ): Promise<Map<string, { count: number; lastAlarm: AlarmInfo | null }>> {
    const result = new Map<string, { count: number; lastAlarm: AlarmInfo | null }>();

    if (machineIds.length === 0) return result;

    // Get active alarms from last 24 hours
    const alarms = await this.prisma.machineAlert.findMany({
      where: {
        machineId: { in: machineIds },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        acknowledged: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Initialize all machines
    for (const machineId of machineIds) {
      result.set(machineId, { count: 0, lastAlarm: null });
    }

    // Group by machine
    for (const alarm of alarms) {
      const entry = result.get(alarm.machineId)!;
      entry.count++;
      if (!entry.lastAlarm) {
        entry.lastAlarm = {
          id: alarm.id,
          code: alarm.alertCode || 'UNKNOWN',
          message: alarm.message,
          severity: alarm.severity as 'INFO' | 'WARNING' | 'CRITICAL',
          timestamp: alarm.createdAt,
        };
      }
    }

    return result;
  }

  private determineMachineStatus(
    machine: any,
    telemetry: MachineTelemetrySnapshot | undefined,
    job: CurrentJobInfo | undefined,
  ): MachineStatus {
    // Check machine's stored status first
    const storedStatus = machine.status as string;
    
    if (storedStatus === 'MAINTENANCE') return MachineStatus.MAINTENANCE;
    if (storedStatus === 'BREAKDOWN') return MachineStatus.BREAKDOWN;
    if (storedStatus === 'OFFLINE') return MachineStatus.OFFLINE;

    // Check for stale data
    if (!telemetry || this.isDataStale(telemetry.timestamp)) {
      return MachineStatus.OFFLINE;
    }

    // Determine status from telemetry and job
    if (telemetry.loadPercent && telemetry.loadPercent > 5) {
      return MachineStatus.RUNNING;
    }

    if (job) {
      // Has job but not running - likely in setup
      return MachineStatus.SETUP;
    }

    return MachineStatus.IDLE;
  }

  private calculateUtilization(
    telemetry: MachineTelemetrySnapshot | undefined,
  ): number {
    if (!telemetry) return 0;
    
    // Simple utilization based on load percentage
    // In production, would use more sophisticated calculation
    return telemetry.loadPercent || 0;
  }

  private isDataStale(timestamp: Date): boolean {
    const ageSeconds = (Date.now() - timestamp.getTime()) / 1000;
    return ageSeconds > this.STALE_DATA_THRESHOLD_SECONDS;
  }

  private getEmptyTelemetry(): MachineTelemetrySnapshot {
    return {
      timestamp: new Date(0),
      spindleRpm: undefined,
      feedRate: undefined,
      loadPercent: undefined,
      temperature: undefined,
      powerKw: undefined,
      cycleTime: undefined,
      partsPerHour: undefined,
    };
  }

  private getStatusRank(status: MachineStatus): number {
    const ranks: Record<MachineStatus, number> = {
      [MachineStatus.RUNNING]: 5,
      [MachineStatus.SETUP]: 4,
      [MachineStatus.WARMUP]: 3,
      [MachineStatus.IDLE]: 2,
      [MachineStatus.MAINTENANCE]: 1,
      [MachineStatus.OFFLINE]: 0,
      [MachineStatus.ALARM]: -1,
      [MachineStatus.BREAKDOWN]: -2,
    };
    return ranks[status] ?? 0;
  }

  private calculateFloorSummary(machines: MachineNode[]): FloorSummary {
    const summary: FloorSummary = {
      totalMachines: machines.length,
      running: 0,
      idle: 0,
      setup: 0,
      maintenance: 0,
      alarm: 0,
      offline: 0,
      overallUtilization: 0,
      activeJobs: 0,
      partsProducedToday: 0,
    };

    let totalUtilization = 0;

    for (const machine of machines) {
      switch (machine.status) {
        case MachineStatus.RUNNING:
          summary.running++;
          break;
        case MachineStatus.IDLE:
          summary.idle++;
          break;
        case MachineStatus.SETUP:
        case MachineStatus.WARMUP:
          summary.setup++;
          break;
        case MachineStatus.MAINTENANCE:
          summary.maintenance++;
          break;
        case MachineStatus.ALARM:
        case MachineStatus.BREAKDOWN:
          summary.alarm++;
          break;
        default:
          summary.offline++;
      }

      totalUtilization += machine.utilization;
      
      if (machine.currentJob) {
        summary.activeJobs++;
      }
    }

    summary.overallUtilization = machines.length > 0
      ? totalUtilization / machines.length
      : 0;

    return summary;
  }

  private async getActiveAlerts(
    organizationId: string,
    facilityId?: string,
  ): Promise<ActiveAlert[]> {
    const alerts = await this.prisma.machineAlert.findMany({
      where: {
        machine: {
          organizationId,
          ...(facilityId && { workCenter: { facilityId } }),
        },
        acknowledged: false,
      },
      include: {
        machine: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return alerts.map(alert => ({
      id: alert.id,
      machineId: alert.machineId,
      machineName: alert.machine.name,
      type: alert.alertType,
      severity: alert.severity as 'INFO' | 'WARNING' | 'CRITICAL',
      message: alert.message,
      timestamp: alert.createdAt,
      acknowledged: alert.acknowledged,
    }));
  }

  private async getTelemetryHistory(
    machineId: string,
    from: Date,
    to: Date,
  ): Promise<TelemetryDataPoint[]> {
    const records = await this.prisma.machineTelemetryRaw.findMany({
      where: {
        machineId,
        timestamp: { gte: from, lte: to },
      },
      orderBy: { timestamp: 'asc' },
      take: 360, // Max 1 per 10 seconds for 1 hour
    });

    return records.map(record => {
      const data = record.data as any;
      return {
        timestamp: record.timestamp,
        spindleRpm: data.spindle_rpm,
        feedRate: data.feed_rate,
        loadPercent: data.load_percent,
        temperature: data.temperature,
        powerKw: data.power_kw,
      };
    });
  }

  private async getRecentAlarms(
    machineId: string,
    limit: number,
  ): Promise<AlarmInfo[]> {
    const alarms = await this.prisma.machineAlert.findMany({
      where: { machineId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return alarms.map(alarm => ({
      id: alarm.id,
      code: alarm.alertCode || 'UNKNOWN',
      message: alarm.message,
      severity: alarm.severity as 'INFO' | 'WARNING' | 'CRITICAL',
      timestamp: alarm.createdAt,
    }));
  }

  private async getMachinePerformanceMetrics(
    machineId: string,
    organizationId: string,
  ): Promise<MachinePerformanceMetrics> {
    // Get today's production
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayProduction = await this.prisma.workOrderOperation.aggregate({
      where: {
        machineId,
        workOrder: { organizationId },
        actualEndTime: { gte: today },
      },
      _sum: {
        quantityCompleted: true,
        quantityScrapped: true,
      },
    });

    // Get shift start (assume 6 AM)
    const shiftStart = new Date();
    if (shiftStart.getHours() < 6) {
      shiftStart.setDate(shiftStart.getDate() - 1);
    }
    shiftStart.setHours(6, 0, 0, 0);

    const shiftProduction = await this.prisma.workOrderOperation.aggregate({
      where: {
        machineId,
        workOrder: { organizationId },
        actualEndTime: { gte: shiftStart },
      },
      _sum: {
        quantityCompleted: true,
      },
    });

    const setupsToday = await this.prisma.workOrderOperation.count({
      where: {
        machineId,
        workOrder: { organizationId },
        actualStartTime: { gte: today },
        setupStartTime: { not: null },
      },
    });

    // Placeholder OEE - would be calculated properly in production
    return {
      oee: 75.5,
      availability: 85.2,
      performance: 92.1,
      quality: 96.3,
      mtbf: 168, // hours
      mttr: 2.5, // hours
      partsProducedToday: todayProduction._sum.quantityCompleted || 0,
      partsProducedShift: shiftProduction._sum.quantityCompleted || 0,
      scrapToday: todayProduction._sum.quantityScrapped || 0,
      setupsToday,
    };
  }

  private async getMaintenanceInfo(
    machineId: string,
  ): Promise<MaintenanceInfo | undefined> {
    // Get next scheduled maintenance
    const nextMaintenance = await this.prisma.maintenanceTask.findFirst({
      where: {
        machineId,
        scheduledDate: { gte: new Date() },
        status: { in: ['SCHEDULED', 'PENDING'] },
      },
      orderBy: { scheduledDate: 'asc' },
    });

    // Get last completed maintenance
    const lastMaintenance = await this.prisma.maintenanceTask.findFirst({
      where: {
        machineId,
        status: 'COMPLETED',
      },
      orderBy: { completedDate: 'desc' },
    });

    // Get pending tasks count
    const pendingTasks = await this.prisma.maintenanceTask.count({
      where: {
        machineId,
        status: { in: ['SCHEDULED', 'PENDING', 'OVERDUE'] },
      },
    });

    // Check for overdue
    const overdueTasks = await this.prisma.maintenanceTask.count({
      where: {
        machineId,
        status: 'OVERDUE',
      },
    });

    return {
      nextScheduled: nextMaintenance?.scheduledDate,
      lastCompleted: lastMaintenance?.completedDate,
      overdue: overdueTasks > 0,
      pendingTasks,
    };
  }

  private async getHistoricalMachineStates(
    organizationId: string,
    facilityId: string | undefined,
    comparisonTime: Date,
  ): Promise<Map<string, { status: MachineStatus; utilization: number }>> {
    const result = new Map<string, { status: MachineStatus; utilization: number }>();

    // In production, this would query a machine_status_history table
    // For now, we'll use telemetry aggregates

    const machines = await this.prisma.machine.findMany({
      where: {
        organizationId,
        ...(facilityId && { workCenter: { facilityId } }),
        isActive: true,
      },
      select: { id: true },
    });

    // Get telemetry near the comparison time
    const windowStart = new Date(comparisonTime.getTime() - 5 * 60 * 1000);
    const windowEnd = new Date(comparisonTime.getTime() + 5 * 60 * 1000);

    for (const machine of machines) {
      const telemetry = await this.prisma.machineTelemetryRaw.findFirst({
        where: {
          machineId: machine.id,
          timestamp: { gte: windowStart, lte: windowEnd },
        },
        orderBy: { timestamp: 'desc' },
      });

      if (telemetry) {
        const data = telemetry.data as any;
        const loadPercent = data.load_percent || 0;
        
        result.set(machine.id, {
          status: loadPercent > 5 ? MachineStatus.RUNNING : MachineStatus.IDLE,
          utilization: loadPercent,
        });
      } else {
        result.set(machine.id, {
          status: MachineStatus.OFFLINE,
          utilization: 0,
        });
      }
    }

    return result;
  }

  // ===========================================================================
  // SCHEDULED JOBS
  // ===========================================================================

  /**
   * Refresh machine status cache every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async refreshStatusCache(): Promise<void> {
    this.logger.debug('Refreshing machine status cache...');
    
    // Get all organizations with active machines
    const orgs = await this.prisma.machine.findMany({
      where: { isActive: true },
      select: { organizationId: true },
      distinct: ['organizationId'],
    });

    for (const org of orgs) {
      try {
        await this.getMachineNodes(org.organizationId);
      } catch (error) {
        this.logger.error(
          `Failed to refresh cache for org ${org.organizationId}`,
          error,
        );
      }
    }
  }
}
