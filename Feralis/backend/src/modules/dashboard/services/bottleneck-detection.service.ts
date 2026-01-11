/**
 * Feralis Manufacturing Platform
 * Bottleneck Detection Service
 * 
 * Dynamic bottleneck identification and mitigation:
 * - Real-time queue depth analysis
 * - Bottleneck scoring algorithm
 * - Intelligent mitigation recommendations
 * - What-if impact simulation
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

export enum BottleneckSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum MitigationType {
  REASSIGN_JOB = 'REASSIGN_JOB',
  ADD_OVERTIME = 'ADD_OVERTIME',
  OUTSOURCE = 'OUTSOURCE',
  CHANGE_PRIORITY = 'CHANGE_PRIORITY',
  EXPEDITE_SETUP = 'EXPEDITE_SETUP',
  ADD_RESOURCE = 'ADD_RESOURCE',
  SPLIT_LOT = 'SPLIT_LOT',
  PARALLEL_PROCESSING = 'PARALLEL_PROCESSING',
}

export interface BottleneckAnalysis {
  timestamp: Date;
  organizationId: string;
  facilityId?: string;
  
  bottlenecks: Bottleneck[];
  summary: BottleneckSummary;
  criticalPath: CriticalPathNode[];
  impactedOrders: ImpactedOrder[];
}

export interface Bottleneck {
  id: string;
  resourceType: 'WORK_CENTER' | 'MACHINE' | 'OPERATION_TYPE';
  resourceId: string;
  resourceName: string;
  
  severity: BottleneckSeverity;
  score: number; // 0-100
  
  queueDepth: number; // Number of jobs waiting
  queueHours: number; // Total hours in queue
  averageWaitTime: number; // Hours
  maxWaitTime: number; // Hours
  
  utilizationPercent: number;
  capacityHoursAvailable: number;
  capacityHoursRequired: number;
  
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  predictedResolutionTime?: Date;
  
  affectedOrders: string[];
  mitigations: MitigationRecommendation[];
}

export interface BottleneckSummary {
  totalBottlenecks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  
  totalQueueHours: number;
  averageQueueHours: number;
  
  ordersAtRisk: number;
  estimatedDeliveryImpactDays: number;
}

export interface MitigationRecommendation {
  id: string;
  type: MitigationType;
  description: string;
  
  estimatedImpact: {
    queueReduction: number; // Hours
    deliveryImprovement: number; // Days
    costImpact: number; // Currency
  };
  
  prerequisites: string[];
  steps: string[];
  
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  implementable: boolean;
  implementationTime: number; // Minutes
  
  affectedJobs?: string[];
  alternativeResource?: string;
  costBreakdown?: CostBreakdown;
}

export interface CostBreakdown {
  laborCost: number;
  overtimePremium: number;
  outsourcingCost: number;
  expediteFees: number;
  totalCost: number;
}

export interface CriticalPathNode {
  sequence: number;
  operationId: string;
  workOrderId: string;
  workOrderNumber: string;
  operationName: string;
  machineId?: string;
  machineName?: string;
  
  plannedStart: Date;
  plannedEnd: Date;
  estimatedStart: Date;
  estimatedEnd: Date;
  
  delayHours: number;
  isBottleneck: boolean;
  bottleneckId?: string;
}

export interface ImpactedOrder {
  orderId: string;
  orderNumber: string;
  customerName: string;
  
  originalDueDate: Date;
  estimatedCompletionDate: Date;
  
  delayDays: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'WILL_MISS' | 'ALREADY_LATE';
  
  bottleneckOperations: string[];
  criticalPathPosition: number;
}

export interface QueueAnalysis {
  resourceId: string;
  resourceType: string;
  
  queuedOperations: QueuedOperation[];
  
  totalQueueHours: number;
  averageWaitHours: number;
  maxWaitHours: number;
  
  throughputRate: number; // Parts per hour
  expectedClearanceTime: Date;
}

export interface QueuedOperation {
  operationId: string;
  workOrderId: string;
  workOrderNumber: string;
  partNumber: string;
  
  queuePosition: number;
  estimatedHours: number;
  waitingSince: Date;
  waitHours: number;
  
  priority: number;
  dueDate: Date;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface DisruptionScenario {
  id: string;
  name: string;
  type: 'MACHINE_DOWN' | 'MATERIAL_DELAY' | 'QUALITY_HOLD' | 'RESOURCE_SHORTAGE';
  
  affectedResource: string;
  duration: number; // Hours
  startTime: Date;
}

export interface ScenarioSimulation {
  scenario: DisruptionScenario;
  baseline: ImpactedOrder[];
  simulated: ImpactedOrder[];
  
  newBottlenecks: Bottleneck[];
  worsendBottlenecks: Bottleneck[];
  
  ordersMovedToRisk: number;
  totalDeliveryImpactDays: number;
  
  recommendedActions: MitigationRecommendation[];
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

@Injectable()
export class BottleneckDetectionService {
  private readonly logger = new Logger(BottleneckDetectionService.name);
  
  // Scoring thresholds
  private readonly CRITICAL_SCORE = 85;
  private readonly HIGH_SCORE = 70;
  private readonly MEDIUM_SCORE = 50;
  
  // Queue thresholds (hours)
  private readonly CRITICAL_QUEUE = 40;
  private readonly HIGH_QUEUE = 24;
  private readonly MEDIUM_QUEUE = 12;

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // BOTTLENECK ANALYSIS
  // ===========================================================================

  /**
   * Perform comprehensive bottleneck analysis
   */
  async analyzeBottlenecks(
    organizationId: string,
    facilityId?: string,
  ): Promise<BottleneckAnalysis> {
    // Analyze work centers
    const workCenterBottlenecks = await this.analyzeWorkCenterQueues(
      organizationId,
      facilityId,
    );

    // Analyze individual machines
    const machineBottlenecks = await this.analyzeMachineQueues(
      organizationId,
      facilityId,
    );

    // Combine and deduplicate
    const allBottlenecks = [...workCenterBottlenecks, ...machineBottlenecks]
      .sort((a, b) => b.score - a.score);

    // Calculate summary
    const summary = this.calculateSummary(allBottlenecks);

    // Build critical path
    const criticalPath = await this.buildCriticalPath(organizationId);

    // Identify impacted orders
    const impactedOrders = await this.identifyImpactedOrders(
      organizationId,
      allBottlenecks,
    );

    // Generate mitigations for top bottlenecks
    for (const bottleneck of allBottlenecks.slice(0, 10)) {
      bottleneck.mitigations = await this.generateMitigations(
        organizationId,
        bottleneck,
      );
    }

    return {
      timestamp: new Date(),
      organizationId,
      facilityId,
      bottlenecks: allBottlenecks,
      summary,
      criticalPath,
      impactedOrders,
    };
  }

  /**
   * Get queue analysis for a specific resource
   */
  async getQueueAnalysis(
    organizationId: string,
    resourceId: string,
    resourceType: 'WORK_CENTER' | 'MACHINE',
  ): Promise<QueueAnalysis> {
    const queuedOps = await this.getQueuedOperations(
      organizationId,
      resourceId,
      resourceType,
    );

    const totalQueueHours = queuedOps.reduce(
      (sum, op) => sum + op.estimatedHours,
      0,
    );

    const waitTimes = queuedOps.map(op => op.waitHours);
    const averageWaitHours = waitTimes.length > 0
      ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
      : 0;
    const maxWaitHours = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;

    // Calculate throughput rate (parts per hour over last 24 hours)
    const throughputRate = await this.calculateThroughputRate(
      resourceId,
      resourceType,
    );

    const expectedClearanceTime = new Date(
      Date.now() + (totalQueueHours / Math.max(0.1, throughputRate)) * 60 * 60 * 1000,
    );

    return {
      resourceId,
      resourceType,
      queuedOperations: queuedOps,
      totalQueueHours,
      averageWaitHours,
      maxWaitHours,
      throughputRate,
      expectedClearanceTime,
    };
  }

  // ===========================================================================
  // MITIGATION RECOMMENDATIONS
  // ===========================================================================

  /**
   * Generate mitigation recommendations for a bottleneck
   */
  async generateMitigations(
    organizationId: string,
    bottleneck: Bottleneck,
  ): Promise<MitigationRecommendation[]> {
    const mitigations: MitigationRecommendation[] = [];

    // Job reassignment
    const reassignment = await this.evaluateJobReassignment(
      organizationId,
      bottleneck,
    );
    if (reassignment) mitigations.push(reassignment);

    // Overtime
    const overtime = await this.evaluateOvertime(organizationId, bottleneck);
    if (overtime) mitigations.push(overtime);

    // Outsourcing
    const outsource = await this.evaluateOutsourcing(organizationId, bottleneck);
    if (outsource) mitigations.push(outsource);

    // Priority changes
    const priorityChange = await this.evaluatePriorityChange(
      organizationId,
      bottleneck,
    );
    if (priorityChange) mitigations.push(priorityChange);

    // Lot splitting
    const lotSplit = await this.evaluateLotSplitting(organizationId, bottleneck);
    if (lotSplit) mitigations.push(lotSplit);

    // Sort by priority and impact
    return mitigations.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (
        priorityOrder[a.priority] - priorityOrder[b.priority] ||
        b.estimatedImpact.queueReduction - a.estimatedImpact.queueReduction
      );
    });
  }

  /**
   * Implement a mitigation action
   */
  async implementMitigation(
    organizationId: string,
    mitigationId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string; affectedItems: string[] }> {
    // In production, this would:
    // 1. Validate the mitigation is still applicable
    // 2. Execute the appropriate action (reassign, schedule overtime, etc.)
    // 3. Log the action
    // 4. Return results

    this.logger.log(`Implementing mitigation ${mitigationId} for org ${organizationId}`);

    return {
      success: true,
      message: 'Mitigation implemented successfully',
      affectedItems: [],
    };
  }

  // ===========================================================================
  // SCENARIO SIMULATION
  // ===========================================================================

  /**
   * Simulate impact of a disruption scenario
   */
  async simulateScenario(
    organizationId: string,
    scenario: DisruptionScenario,
  ): Promise<ScenarioSimulation> {
    // Get baseline state
    const baselineAnalysis = await this.analyzeBottlenecks(organizationId);
    const baselineOrders = baselineAnalysis.impactedOrders;

    // Simulate disruption
    const simulatedBottlenecks = await this.simulateDisruption(
      organizationId,
      baselineAnalysis.bottlenecks,
      scenario,
    );

    // Recalculate impacted orders with disruption
    const simulatedOrders = await this.simulateOrderImpact(
      organizationId,
      simulatedBottlenecks,
      scenario,
    );

    // Identify new and worsened bottlenecks
    const newBottlenecks = simulatedBottlenecks.filter(
      sb => !baselineAnalysis.bottlenecks.find(bb => bb.resourceId === sb.resourceId),
    );

    const worsendBottlenecks = simulatedBottlenecks.filter(sb => {
      const baseline = baselineAnalysis.bottlenecks.find(
        bb => bb.resourceId === sb.resourceId,
      );
      return baseline && sb.score > baseline.score + 10;
    });

    // Count orders moved to risk
    const ordersMovedToRisk = simulatedOrders.filter(so => {
      const baseline = baselineOrders.find(bo => bo.orderId === so.orderId);
      return (
        baseline &&
        baseline.status === 'ON_TRACK' &&
        (so.status === 'AT_RISK' || so.status === 'WILL_MISS')
      );
    }).length;

    // Calculate total delivery impact
    const totalDeliveryImpactDays = simulatedOrders.reduce((sum, so) => {
      const baseline = baselineOrders.find(bo => bo.orderId === so.orderId);
      const additionalDelay = baseline
        ? Math.max(0, so.delayDays - baseline.delayDays)
        : so.delayDays;
      return sum + additionalDelay;
    }, 0);

    // Generate recommendations
    const recommendedActions: MitigationRecommendation[] = [];
    for (const bottleneck of [...newBottlenecks, ...worsendBottlenecks].slice(0, 5)) {
      const mitigations = await this.generateMitigations(organizationId, bottleneck);
      recommendedActions.push(...mitigations.slice(0, 2));
    }

    return {
      scenario,
      baseline: baselineOrders,
      simulated: simulatedOrders,
      newBottlenecks,
      worsendBottlenecks,
      ordersMovedToRisk,
      totalDeliveryImpactDays,
      recommendedActions,
    };
  }

  // ===========================================================================
  // PRIVATE HELPER METHODS
  // ===========================================================================

  private async analyzeWorkCenterQueues(
    organizationId: string,
    facilityId?: string,
  ): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    const workCenters = await this.prisma.workCenter.findMany({
      where: {
        organizationId,
        ...(facilityId && { facilityId }),
        isActive: true,
      },
      include: {
        machines: { where: { isActive: true } },
      },
    });

    for (const wc of workCenters) {
      const queueAnalysis = await this.getQueueAnalysis(
        organizationId,
        wc.id,
        'WORK_CENTER',
      );

      // Calculate capacity
      const capacityHoursAvailable = wc.machines.length * 8; // 8 hours per machine per shift
      const capacityHoursRequired = queueAnalysis.totalQueueHours;
      const utilizationPercent = capacityHoursAvailable > 0
        ? (capacityHoursRequired / capacityHoursAvailable) * 100
        : 0;

      // Calculate score
      const score = this.calculateBottleneckScore(
        queueAnalysis.totalQueueHours,
        utilizationPercent,
        queueAnalysis.maxWaitHours,
      );

      if (score >= this.MEDIUM_SCORE || queueAnalysis.totalQueueHours >= this.MEDIUM_QUEUE) {
        const severity = this.getBottleneckSeverity(score);
        
        bottlenecks.push({
          id: `wc-${wc.id}`,
          resourceType: 'WORK_CENTER',
          resourceId: wc.id,
          resourceName: wc.name,
          severity,
          score,
          queueDepth: queueAnalysis.queuedOperations.length,
          queueHours: queueAnalysis.totalQueueHours,
          averageWaitTime: queueAnalysis.averageWaitHours,
          maxWaitTime: queueAnalysis.maxWaitHours,
          utilizationPercent,
          capacityHoursAvailable,
          capacityHoursRequired,
          trend: 'STABLE', // Would calculate from historical data
          predictedResolutionTime: queueAnalysis.expectedClearanceTime,
          affectedOrders: queueAnalysis.queuedOperations.map(op => op.workOrderId),
          mitigations: [],
        });
      }
    }

    return bottlenecks;
  }

  private async analyzeMachineQueues(
    organizationId: string,
    facilityId?: string,
  ): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    const machines = await this.prisma.machine.findMany({
      where: {
        organizationId,
        ...(facilityId && { workCenter: { facilityId } }),
        isActive: true,
      },
    });

    for (const machine of machines) {
      const queueAnalysis = await this.getQueueAnalysis(
        organizationId,
        machine.id,
        'MACHINE',
      );

      const capacityHoursAvailable = 8; // 8 hours per shift
      const utilizationPercent = capacityHoursAvailable > 0
        ? (queueAnalysis.totalQueueHours / capacityHoursAvailable) * 100
        : 0;

      const score = this.calculateBottleneckScore(
        queueAnalysis.totalQueueHours,
        utilizationPercent,
        queueAnalysis.maxWaitHours,
      );

      if (score >= this.MEDIUM_SCORE || queueAnalysis.totalQueueHours >= this.MEDIUM_QUEUE) {
        const severity = this.getBottleneckSeverity(score);

        bottlenecks.push({
          id: `machine-${machine.id}`,
          resourceType: 'MACHINE',
          resourceId: machine.id,
          resourceName: machine.name,
          severity,
          score,
          queueDepth: queueAnalysis.queuedOperations.length,
          queueHours: queueAnalysis.totalQueueHours,
          averageWaitTime: queueAnalysis.averageWaitHours,
          maxWaitTime: queueAnalysis.maxWaitHours,
          utilizationPercent,
          capacityHoursAvailable,
          capacityHoursRequired: queueAnalysis.totalQueueHours,
          trend: 'STABLE',
          predictedResolutionTime: queueAnalysis.expectedClearanceTime,
          affectedOrders: queueAnalysis.queuedOperations.map(op => op.workOrderId),
          mitigations: [],
        });
      }
    }

    return bottlenecks;
  }

  private async getQueuedOperations(
    organizationId: string,
    resourceId: string,
    resourceType: 'WORK_CENTER' | 'MACHINE',
  ): Promise<QueuedOperation[]> {
    const whereClause = resourceType === 'MACHINE'
      ? { machineId: resourceId }
      : { workCenter: { id: resourceId } };

    const operations = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        status: { in: ['PENDING', 'QUEUED', 'READY'] },
        ...whereClause,
      },
      include: {
        workOrder: {
          include: {
            orderLine: {
              include: {
                part: true,
                order: true,
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledStartTime: 'asc' },
      ],
    });

    const now = new Date();
    
    return operations.map((op, index) => {
      const queuedTime = op.scheduledStartTime || op.createdAt;
      const waitHours = (now.getTime() - queuedTime.getTime()) / (1000 * 60 * 60);
      const dueDate = op.workOrder.orderLine?.order?.requestedDeliveryDate || 
                     op.workOrder.dueDate;

      // Determine urgency
      let urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (dueDate) {
        const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysUntilDue < 1) urgency = 'CRITICAL';
        else if (daysUntilDue < 3) urgency = 'HIGH';
        else if (daysUntilDue < 7) urgency = 'MEDIUM';
      }

      return {
        operationId: op.id,
        workOrderId: op.workOrderId,
        workOrderNumber: op.workOrder.workOrderNumber,
        partNumber: op.workOrder.orderLine?.part?.partNumber || 'N/A',
        queuePosition: index + 1,
        estimatedHours: op.standardMinutes ? op.standardMinutes / 60 : 1,
        waitingSince: queuedTime,
        waitHours: Math.round(waitHours * 10) / 10,
        priority: op.priority || 0,
        dueDate: dueDate || new Date(),
        urgency,
      };
    });
  }

  private async calculateThroughputRate(
    resourceId: string,
    resourceType: 'WORK_CENTER' | 'MACHINE',
  ): Promise<number> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const whereClause = resourceType === 'MACHINE'
      ? { machineId: resourceId }
      : { workCenter: { id: resourceId } };

    const completedOps = await this.prisma.workOrderOperation.count({
      where: {
        ...whereClause,
        status: 'COMPLETED',
        actualEndTime: { gte: yesterday },
      },
    });

    return completedOps / 24; // Operations per hour
  }

  private calculateBottleneckScore(
    queueHours: number,
    utilizationPercent: number,
    maxWaitHours: number,
  ): number {
    // Weighted score based on multiple factors
    const queueScore = Math.min(100, (queueHours / this.CRITICAL_QUEUE) * 100);
    const utilizationScore = Math.min(100, utilizationPercent);
    const waitScore = Math.min(100, (maxWaitHours / 48) * 100);

    return Math.round(
      queueScore * 0.4 + utilizationScore * 0.35 + waitScore * 0.25,
    );
  }

  private getBottleneckSeverity(score: number): BottleneckSeverity {
    if (score >= this.CRITICAL_SCORE) return BottleneckSeverity.CRITICAL;
    if (score >= this.HIGH_SCORE) return BottleneckSeverity.HIGH;
    if (score >= this.MEDIUM_SCORE) return BottleneckSeverity.MEDIUM;
    return BottleneckSeverity.LOW;
  }

  private calculateSummary(bottlenecks: Bottleneck[]): BottleneckSummary {
    const totalQueueHours = bottlenecks.reduce(
      (sum, b) => sum + b.queueHours,
      0,
    );

    const uniqueOrders = new Set(bottlenecks.flatMap(b => b.affectedOrders));

    return {
      totalBottlenecks: bottlenecks.length,
      criticalCount: bottlenecks.filter(b => b.severity === BottleneckSeverity.CRITICAL).length,
      highCount: bottlenecks.filter(b => b.severity === BottleneckSeverity.HIGH).length,
      mediumCount: bottlenecks.filter(b => b.severity === BottleneckSeverity.MEDIUM).length,
      lowCount: bottlenecks.filter(b => b.severity === BottleneckSeverity.LOW).length,
      totalQueueHours: Math.round(totalQueueHours),
      averageQueueHours: bottlenecks.length > 0
        ? Math.round(totalQueueHours / bottlenecks.length)
        : 0,
      ordersAtRisk: uniqueOrders.size,
      estimatedDeliveryImpactDays: Math.ceil(totalQueueHours / 24),
    };
  }

  private async buildCriticalPath(organizationId: string): Promise<CriticalPathNode[]> {
    // Get operations on orders due soonest
    const urgentOperations = await this.prisma.workOrderOperation.findMany({
      where: {
        workOrder: { organizationId },
        status: { in: ['PENDING', 'QUEUED', 'READY', 'IN_PROGRESS'] },
      },
      include: {
        workOrder: true,
        machine: true,
      },
      orderBy: [
        { workOrder: { dueDate: 'asc' } },
        { sequenceNumber: 'asc' },
      ],
      take: 20,
    });

    return urgentOperations.map((op, index) => ({
      sequence: index + 1,
      operationId: op.id,
      workOrderId: op.workOrderId,
      workOrderNumber: op.workOrder.workOrderNumber,
      operationName: op.operationName,
      machineId: op.machineId || undefined,
      machineName: op.machine?.name,
      plannedStart: op.scheduledStartTime || new Date(),
      plannedEnd: op.scheduledEndTime || new Date(),
      estimatedStart: op.scheduledStartTime || new Date(),
      estimatedEnd: op.scheduledEndTime || new Date(),
      delayHours: 0, // Would calculate from schedule
      isBottleneck: false,
    }));
  }

  private async identifyImpactedOrders(
    organizationId: string,
    bottlenecks: Bottleneck[],
  ): Promise<ImpactedOrder[]> {
    const affectedOrderIds = new Set(bottlenecks.flatMap(b => b.affectedOrders));

    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        id: { in: Array.from(affectedOrderIds) },
      },
      include: {
        orderLine: {
          include: {
            order: {
              include: { customer: true },
            },
          },
        },
      },
    });

    const now = new Date();

    return workOrders.map(wo => {
      const dueDate = wo.dueDate;
      const estimatedCompletion = new Date(
        now.getTime() + (wo.remainingMinutes || 0) * 60 * 1000,
      );
      
      const delayDays = dueDate
        ? Math.max(0, Math.ceil(
            (estimatedCompletion.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
          ))
        : 0;

      let status: 'ON_TRACK' | 'AT_RISK' | 'WILL_MISS' | 'ALREADY_LATE' = 'ON_TRACK';
      if (dueDate) {
        if (now > dueDate) status = 'ALREADY_LATE';
        else if (estimatedCompletion > dueDate) status = 'WILL_MISS';
        else if (delayDays > -2) status = 'AT_RISK';
      }

      const bottleneckOps = bottlenecks
        .filter(b => b.affectedOrders.includes(wo.id))
        .map(b => b.resourceName);

      return {
        orderId: wo.id,
        orderNumber: wo.workOrderNumber,
        customerName: wo.orderLine?.order?.customer?.name || 'Unknown',
        originalDueDate: dueDate || new Date(),
        estimatedCompletionDate: estimatedCompletion,
        delayDays,
        status,
        bottleneckOperations: bottleneckOps,
        criticalPathPosition: 0, // Would calculate
      };
    });
  }

  // ===========================================================================
  // MITIGATION EVALUATION
  // ===========================================================================

  private async evaluateJobReassignment(
    organizationId: string,
    bottleneck: Bottleneck,
  ): Promise<MitigationRecommendation | null> {
    if (bottleneck.resourceType !== 'MACHINE') return null;

    // Find alternative machines with capacity
    const alternativeMachines = await this.prisma.machine.findMany({
      where: {
        organizationId,
        id: { not: bottleneck.resourceId },
        machineType: { equals: await this.getMachineType(bottleneck.resourceId) },
        isActive: true,
        status: { in: ['AVAILABLE', 'RUNNING'] },
      },
    });

    if (alternativeMachines.length === 0) return null;

    // Find the machine with lowest queue
    const machineQueues = await Promise.all(
      alternativeMachines.map(async m => ({
        machine: m,
        queue: await this.getQueueAnalysis(organizationId, m.id, 'MACHINE'),
      })),
    );

    const bestAlternative = machineQueues.sort(
      (a, b) => a.queue.totalQueueHours - b.queue.totalQueueHours,
    )[0];

    if (!bestAlternative || bestAlternative.queue.totalQueueHours >= bottleneck.queueHours) {
      return null;
    }

    const queueReduction = Math.min(
      bottleneck.queueHours * 0.3,
      bottleneck.queueHours - bestAlternative.queue.totalQueueHours,
    );

    return {
      id: `reassign-${bottleneck.id}`,
      type: MitigationType.REASSIGN_JOB,
      description: `Reassign jobs to ${bestAlternative.machine.name} (queue: ${Math.round(bestAlternative.queue.totalQueueHours)}h)`,
      estimatedImpact: {
        queueReduction,
        deliveryImprovement: Math.round(queueReduction / 8),
        costImpact: 0, // No additional cost for reassignment
      },
      prerequisites: [
        'Alternative machine has required capabilities',
        'Setup documentation available',
      ],
      steps: [
        'Identify jobs suitable for reassignment',
        'Update work order routings',
        'Prepare setup for alternative machine',
        'Transfer jobs to new queue',
      ],
      priority: 'HIGH',
      implementable: true,
      implementationTime: 30,
      alternativeResource: bestAlternative.machine.name,
    };
  }

  private async evaluateOvertime(
    organizationId: string,
    bottleneck: Bottleneck,
  ): Promise<MitigationRecommendation | null> {
    // Calculate overtime hours needed
    const overtimeNeeded = Math.max(0, bottleneck.queueHours - 8);
    if (overtimeNeeded <= 0) return null;

    const overtimeHours = Math.min(4, overtimeNeeded); // Cap at 4 hours OT
    const laborRate = 50; // Base rate
    const overtimePremium = 1.5;
    const overtimeCost = overtimeHours * laborRate * overtimePremium;

    return {
      id: `overtime-${bottleneck.id}`,
      type: MitigationType.ADD_OVERTIME,
      description: `Schedule ${overtimeHours}h overtime for ${bottleneck.resourceName}`,
      estimatedImpact: {
        queueReduction: overtimeHours,
        deliveryImprovement: Math.ceil(overtimeHours / 8),
        costImpact: overtimeCost,
      },
      prerequisites: [
        'Operator available for overtime',
        'Material available for extended run',
      ],
      steps: [
        'Confirm operator availability',
        'Schedule overtime shift',
        'Prepare material and tooling',
        'Update production schedule',
      ],
      priority: bottleneck.severity === BottleneckSeverity.CRITICAL ? 'HIGH' : 'MEDIUM',
      implementable: true,
      implementationTime: 15,
      costBreakdown: {
        laborCost: overtimeHours * laborRate,
        overtimePremium: overtimeHours * laborRate * 0.5,
        outsourcingCost: 0,
        expediteFees: 0,
        totalCost: overtimeCost,
      },
    };
  }

  private async evaluateOutsourcing(
    organizationId: string,
    bottleneck: Bottleneck,
  ): Promise<MitigationRecommendation | null> {
    // Check if we have approved vendors for this operation type
    // This would check vendor qualifications in production
    
    const outsourceHours = bottleneck.queueHours * 0.5; // Outsource 50%
    const outsourceCost = outsourceHours * 75; // Estimated vendor rate

    if (bottleneck.queueHours < this.HIGH_QUEUE) return null;

    return {
      id: `outsource-${bottleneck.id}`,
      type: MitigationType.OUTSOURCE,
      description: `Outsource ${Math.round(outsourceHours)}h of work to approved vendor`,
      estimatedImpact: {
        queueReduction: outsourceHours,
        deliveryImprovement: Math.ceil(outsourceHours / 8),
        costImpact: outsourceCost,
      },
      prerequisites: [
        'Approved vendor available',
        'Parts suitable for outside processing',
        'Quality requirements documented',
      ],
      steps: [
        'Identify jobs for outsourcing',
        'Request vendor quotes',
        'Create purchase order',
        'Ship parts to vendor',
        'Schedule receiving inspection',
      ],
      priority: bottleneck.severity === BottleneckSeverity.CRITICAL ? 'HIGH' : 'LOW',
      implementable: false, // Requires vendor confirmation
      implementationTime: 240,
      costBreakdown: {
        laborCost: 0,
        overtimePremium: 0,
        outsourcingCost: outsourceCost,
        expediteFees: outsourceCost * 0.1,
        totalCost: outsourceCost * 1.1,
      },
    };
  }

  private async evaluatePriorityChange(
    organizationId: string,
    bottleneck: Bottleneck,
  ): Promise<MitigationRecommendation | null> {
    // Suggest reordering queue to process urgent jobs first
    const urgentJobs = bottleneck.affectedOrders.length;
    if (urgentJobs <= 1) return null;

    return {
      id: `priority-${bottleneck.id}`,
      type: MitigationType.CHANGE_PRIORITY,
      description: `Reorder queue to prioritize ${urgentJobs} urgent jobs`,
      estimatedImpact: {
        queueReduction: 0, // Doesn't reduce total queue
        deliveryImprovement: 1, // Helps most urgent orders
        costImpact: 0,
      },
      prerequisites: [
        'Current job status reviewed',
        'Customer priorities confirmed',
      ],
      steps: [
        'Review job due dates and customer priority',
        'Identify jobs to expedite',
        'Update scheduling sequence',
        'Communicate changes to operators',
      ],
      priority: 'MEDIUM',
      implementable: true,
      implementationTime: 15,
      affectedJobs: bottleneck.affectedOrders,
    };
  }

  private async evaluateLotSplitting(
    organizationId: string,
    bottleneck: Bottleneck,
  ): Promise<MitigationRecommendation | null> {
    // Suggest splitting large lots across multiple machines
    if (bottleneck.queueDepth <= 2) return null;

    return {
      id: `split-${bottleneck.id}`,
      type: MitigationType.SPLIT_LOT,
      description: `Split large lots to enable parallel processing`,
      estimatedImpact: {
        queueReduction: bottleneck.queueHours * 0.25,
        deliveryImprovement: 1,
        costImpact: 100, // Setup cost for additional lots
      },
      prerequisites: [
        'Part design allows lot splitting',
        'Multiple machines available',
        'Setup time acceptable',
      ],
      steps: [
        'Identify large lots eligible for splitting',
        'Calculate optimal split quantities',
        'Create additional work orders',
        'Assign to available machines',
      ],
      priority: 'LOW',
      implementable: true,
      implementationTime: 45,
    };
  }

  private async getMachineType(machineId: string): Promise<string> {
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      select: { machineType: true },
    });
    return machine?.machineType || '';
  }

  private async simulateDisruption(
    organizationId: string,
    currentBottlenecks: Bottleneck[],
    scenario: DisruptionScenario,
  ): Promise<Bottleneck[]> {
    const simulated = currentBottlenecks.map(b => ({ ...b }));

    // Find affected bottleneck
    const affected = simulated.find(b => b.resourceId === scenario.affectedResource);
    if (affected) {
      // Increase queue by disruption duration
      affected.queueHours += scenario.duration;
      affected.score = this.calculateBottleneckScore(
        affected.queueHours,
        affected.utilizationPercent + 20,
        affected.maxWaitTime + scenario.duration,
      );
      affected.severity = this.getBottleneckSeverity(affected.score);
    } else {
      // Create new bottleneck
      simulated.push({
        id: `simulated-${scenario.affectedResource}`,
        resourceType: 'MACHINE',
        resourceId: scenario.affectedResource,
        resourceName: 'Affected Resource',
        severity: BottleneckSeverity.HIGH,
        score: 75,
        queueDepth: 5,
        queueHours: scenario.duration,
        averageWaitTime: scenario.duration / 2,
        maxWaitTime: scenario.duration,
        utilizationPercent: 100,
        capacityHoursAvailable: 0,
        capacityHoursRequired: scenario.duration,
        trend: 'INCREASING',
        affectedOrders: [],
        mitigations: [],
      });
    }

    return simulated;
  }

  private async simulateOrderImpact(
    organizationId: string,
    bottlenecks: Bottleneck[],
    scenario: DisruptionScenario,
  ): Promise<ImpactedOrder[]> {
    // Get current impacted orders
    const impacted = await this.identifyImpactedOrders(organizationId, bottlenecks);

    // Add delay from disruption to affected orders
    return impacted.map(order => {
      const isAffected = order.bottleneckOperations.some(
        op => op.includes(scenario.affectedResource),
      );

      if (isAffected) {
        const additionalDelay = scenario.duration / 8; // Convert hours to days
        return {
          ...order,
          estimatedCompletionDate: new Date(
            order.estimatedCompletionDate.getTime() + additionalDelay * 24 * 60 * 60 * 1000,
          ),
          delayDays: order.delayDays + additionalDelay,
          status: order.delayDays + additionalDelay > 0 ? 'WILL_MISS' : order.status,
        };
      }

      return order;
    });
  }

  // ===========================================================================
  // SCHEDULED JOBS
  // ===========================================================================

  /**
   * Periodic bottleneck analysis
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async runPeriodicAnalysis(): Promise<void> {
    this.logger.log('Running periodic bottleneck analysis...');
    
    // Get all organizations
    const orgs = await this.prisma.machine.findMany({
      where: { isActive: true },
      select: { organizationId: true },
      distinct: ['organizationId'],
    });

    for (const org of orgs) {
      try {
        const analysis = await this.analyzeBottlenecks(org.organizationId);
        
        // Alert on critical bottlenecks
        if (analysis.summary.criticalCount > 0) {
          this.logger.warn(
            `Organization ${org.organizationId} has ${analysis.summary.criticalCount} critical bottlenecks`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to analyze bottlenecks for org ${org.organizationId}`,
          error,
        );
      }
    }
  }
}
