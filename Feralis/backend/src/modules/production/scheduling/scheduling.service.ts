import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateScheduleSlotDto,
  UpdateScheduleSlotDto,
  LockScheduleSlotDto,
  BulkScheduleDto,
  AutoScheduleDto,
  ScheduleQueryDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================================
  // SCHEDULE SLOT CRUD
  // ==========================================================================

  /**
   * Create a schedule slot
   */
  async createSlot(organizationId: string, dto: CreateScheduleSlotDto, userId?: string) {
    // Validate machine
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, organizationId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${dto.machineId} not found`);
    }

    // Validate operation
    const operation = await this.prisma.workOrderOperation.findFirst({
      where: {
        id: dto.operationId,
        workOrder: { organizationId },
      },
    });

    if (!operation) {
      throw new NotFoundException(`Operation ${dto.operationId} not found`);
    }

    // Check for conflicts
    const conflictingSlot = await this.findConflicts(
      dto.machineId,
      new Date(dto.scheduledStart),
      new Date(dto.scheduledEnd),
    );

    const slot = await this.prisma.productionSchedule.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        machineId: dto.machineId,
        operationId: dto.operationId,
        workOrderId: dto.workOrderId,
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        setupMinutes: dto.setupMinutes,
        runMinutes: dto.runMinutes,
        teardownMinutes: dto.teardownMinutes,
        priority: dto.priority ?? 0,
        sequenceNumber: dto.sequenceNumber,
        hasConflict: !!conflictingSlot,
        conflictReason: conflictingSlot
          ? `Overlaps with existing schedule ${conflictingSlot.id}`
          : null,
        scheduledBy: userId,
      },
      include: {
        machine: { select: { machineCode: true, name: true } },
        operation: { select: { operationNumber: true, name: true } },
        workOrder: { select: { workOrderNumber: true } },
      },
    });

    // Update operation scheduled times
    await this.prisma.workOrderOperation.update({
      where: { id: dto.operationId },
      data: {
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        machineId: dto.machineId,
      },
    });

    this.logger.log(
      `Scheduled op ${operation.operationNumber} on machine ${machine.machineCode} ` +
      `from ${dto.scheduledStart} to ${dto.scheduledEnd}`,
    );

    return slot;
  }

  /**
   * Update a schedule slot
   */
  async updateSlot(
    organizationId: string,
    slotId: string,
    dto: UpdateScheduleSlotDto,
    userId?: string,
  ) {
    const slot = await this.prisma.productionSchedule.findFirst({
      where: { id: slotId, organizationId },
    });

    if (!slot) {
      throw new NotFoundException(`Schedule slot ${slotId} not found`);
    }

    if (slot.isLocked) {
      throw new BadRequestException('Cannot update locked schedule slot');
    }

    if (slot.isStarted) {
      throw new BadRequestException('Cannot update started schedule slot');
    }

    // Check for conflicts if times changed
    let hasConflict = false;
    let conflictReason: string | null = null;

    if (dto.scheduledStart || dto.scheduledEnd || dto.machineId) {
      const machineId = dto.machineId || slot.machineId;
      const start = dto.scheduledStart ? new Date(dto.scheduledStart) : slot.scheduledStart;
      const end = dto.scheduledEnd ? new Date(dto.scheduledEnd) : slot.scheduledEnd;

      const conflict = await this.findConflicts(machineId, start, end, slotId);
      if (conflict) {
        hasConflict = true;
        conflictReason = `Overlaps with schedule ${conflict.id}`;
      }
    }

    const updated = await this.prisma.productionSchedule.update({
      where: { id: slotId },
      data: {
        ...(dto.machineId && { machineId: dto.machineId }),
        ...(dto.scheduledStart && { scheduledStart: new Date(dto.scheduledStart) }),
        ...(dto.scheduledEnd && { scheduledEnd: new Date(dto.scheduledEnd) }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.sequenceNumber !== undefined && { sequenceNumber: dto.sequenceNumber }),
        hasConflict,
        conflictReason,
      },
      include: {
        machine: { select: { machineCode: true, name: true } },
        operation: { select: { operationNumber: true, name: true } },
        workOrder: { select: { workOrderNumber: true } },
      },
    });

    // Update operation scheduled times
    if (dto.scheduledStart || dto.scheduledEnd || dto.machineId) {
      await this.prisma.workOrderOperation.update({
        where: { id: slot.operationId },
        data: {
          ...(dto.scheduledStart && { scheduledStart: new Date(dto.scheduledStart) }),
          ...(dto.scheduledEnd && { scheduledEnd: new Date(dto.scheduledEnd) }),
          ...(dto.machineId && { machineId: dto.machineId }),
        },
      });
    }

    return updated;
  }

  /**
   * Delete a schedule slot
   */
  async deleteSlot(organizationId: string, slotId: string, userId?: string) {
    const slot = await this.prisma.productionSchedule.findFirst({
      where: { id: slotId, organizationId },
    });

    if (!slot) {
      throw new NotFoundException(`Schedule slot ${slotId} not found`);
    }

    if (slot.isLocked) {
      throw new BadRequestException('Cannot delete locked schedule slot');
    }

    if (slot.isStarted) {
      throw new BadRequestException('Cannot delete started schedule slot');
    }

    await this.prisma.productionSchedule.delete({
      where: { id: slotId },
    });

    // Clear operation scheduled times
    await this.prisma.workOrderOperation.update({
      where: { id: slot.operationId },
      data: {
        scheduledStart: null,
        scheduledEnd: null,
      },
    });

    this.logger.log(`Deleted schedule slot ${slotId}`);
  }

  /**
   * Lock a schedule slot
   */
  async lockSlot(
    organizationId: string,
    slotId: string,
    dto: LockScheduleSlotDto,
    userId: string,
  ) {
    const slot = await this.prisma.productionSchedule.findFirst({
      where: { id: slotId, organizationId },
    });

    if (!slot) {
      throw new NotFoundException(`Schedule slot ${slotId} not found`);
    }

    return this.prisma.productionSchedule.update({
      where: { id: slotId },
      data: {
        isLocked: true,
        lockedBy: userId,
        lockedAt: new Date(),
        lockReason: dto.reason,
      },
    });
  }

  /**
   * Unlock a schedule slot
   */
  async unlockSlot(organizationId: string, slotId: string, userId: string) {
    const slot = await this.prisma.productionSchedule.findFirst({
      where: { id: slotId, organizationId },
    });

    if (!slot) {
      throw new NotFoundException(`Schedule slot ${slotId} not found`);
    }

    return this.prisma.productionSchedule.update({
      where: { id: slotId },
      data: {
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockReason: null,
      },
    });
  }

  /**
   * Find schedule slots
   */
  async findSlots(organizationId: string, query: ScheduleQueryDto) {
    const {
      facilityId,
      machineId,
      workOrderId,
      fromDate,
      toDate,
      isLocked,
      isCompleted,
      hasConflict,
      page = 1,
      limit = 50,
    } = query;

    const where: Prisma.ProductionScheduleWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(machineId && { machineId }),
      ...(workOrderId && { workOrderId }),
      ...(fromDate && { scheduledStart: { gte: new Date(fromDate) } }),
      ...(toDate && { scheduledEnd: { lte: new Date(toDate) } }),
      ...(isLocked !== undefined && { isLocked }),
      ...(isCompleted !== undefined && { isCompleted }),
      ...(hasConflict !== undefined && { hasConflict }),
    };

    const [slots, total] = await Promise.all([
      this.prisma.productionSchedule.findMany({
        where,
        include: {
          machine: { select: { id: true, machineCode: true, name: true, status: true } },
          operation: {
            select: {
              id: true,
              operationNumber: true,
              name: true,
              status: true,
              quantityRequired: true,
              quantityComplete: true,
            },
          },
          workOrder: {
            select: {
              id: true,
              workOrderNumber: true,
              priority: true,
              dueDate: true,
              part: { select: { partNumber: true, description: true } },
            },
          },
        },
        orderBy: [{ scheduledStart: 'asc' }, { priority: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.productionSchedule.count({ where }),
    ]);

    return { data: slots, total, page, limit };
  }

  // ==========================================================================
  // BULK SCHEDULING
  // ==========================================================================

  /**
   * Schedule multiple operations on a machine
   */
  async bulkSchedule(organizationId: string, dto: BulkScheduleDto, userId: string) {
    // Validate machine
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, organizationId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${dto.machineId} not found`);
    }

    // Get operations
    const operations = await this.prisma.workOrderOperation.findMany({
      where: {
        id: { in: dto.operationIds },
        workOrder: { organizationId },
      },
      include: {
        workOrder: { select: { id: true, priority: true, dueDate: true } },
      },
    });

    if (operations.length !== dto.operationIds.length) {
      throw new NotFoundException('Some operations not found');
    }

    // Sort by priority/due date if forward scheduling
    if (dto.mode === 'forward') {
      operations.sort((a, b) => {
        // Priority first (CRITICAL > URGENT > HIGH > NORMAL > LOW)
        const priorityOrder = { CRITICAL: 0, URGENT: 1, HIGH: 2, NORMAL: 3, LOW: 4 };
        const pA = priorityOrder[a.workOrder.priority] ?? 3;
        const pB = priorityOrder[b.workOrder.priority] ?? 3;
        if (pA !== pB) return pA - pB;
        
        // Then by due date
        return new Date(a.workOrder.dueDate).getTime() - new Date(b.workOrder.dueDate).getTime();
      });
    }

    // Calculate schedule
    let currentTime = new Date(dto.startDate);
    const scheduledSlots = [];

    for (const operation of operations) {
      const setupMinutes = Number(operation.setupTimeStandard || 0);
      const runMinutes = Number(operation.runTimeStandard || 0) * operation.quantityRequired;
      const teardownMinutes = Number(operation.teardownTimeStandard || 0);
      const totalMinutes = setupMinutes + runMinutes + teardownMinutes;

      const scheduledStart = new Date(currentTime);
      const scheduledEnd = new Date(currentTime.getTime() + totalMinutes * 60000);

      const slot = await this.createSlot(
        organizationId,
        {
          facilityId: machine.facilityId,
          machineId: dto.machineId,
          operationId: operation.id,
          workOrderId: operation.workOrderId,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          setupMinutes,
          runMinutes,
          teardownMinutes,
        },
        userId,
      );

      scheduledSlots.push(slot);
      currentTime = scheduledEnd;
    }

    this.logger.log(`Bulk scheduled ${scheduledSlots.length} operations on machine ${machine.machineCode}`);
    return scheduledSlots;
  }

  // ==========================================================================
  // AUTO SCHEDULING
  // ==========================================================================

  /**
   * Auto-schedule operations based on strategy
   */
  async autoSchedule(organizationId: string, dto: AutoScheduleDto, userId: string) {
    // Get unscheduled operations for released work orders
    const where: Prisma.WorkOrderOperationWhereInput = {
      workOrder: {
        organizationId,
        status: { in: ['RELEASED', 'IN_PROGRESS'] },
        ...(dto.workOrderIds?.length && { id: { in: dto.workOrderIds } }),
        ...(dto.facilityId && { facilityId: dto.facilityId }),
        dueDate: { lte: new Date(dto.horizonDate) },
      },
      status: { in: ['PENDING', 'READY'] },
      scheduledStart: null, // Not yet scheduled
    };

    const operations = await this.prisma.workOrderOperation.findMany({
      where,
      include: {
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            priority: true,
            dueDate: true,
            facilityId: true,
          },
        },
        workCenter: {
          include: {
            machines: {
              where: { isActive: true, status: { not: 'OFFLINE' } },
            },
          },
        },
      },
      orderBy: [
        { workOrder: { priority: 'desc' } },
        { workOrder: { dueDate: 'asc' } },
        { sequence: 'asc' },
      ],
    });

    // Apply scheduling strategy
    const sortedOps = this.applySchedulingStrategy(operations, dto.strategy || 'earliest_due_date');

    // Get machine availability
    const machineAvailability = new Map<string, Date>();

    // Initialize with existing schedule end times
    const existingSlots = await this.prisma.productionSchedule.findMany({
      where: {
        organizationId,
        isCompleted: false,
        scheduledEnd: { gte: new Date() },
      },
      orderBy: { scheduledEnd: 'desc' },
    });

    for (const slot of existingSlots) {
      const current = machineAvailability.get(slot.machineId);
      if (!current || slot.scheduledEnd > current) {
        machineAvailability.set(slot.machineId, slot.scheduledEnd);
      }
    }

    // Schedule each operation
    const scheduledSlots = [];
    const errors = [];

    for (const operation of sortedOps) {
      try {
        // Find best available machine
        const availableMachines = operation.workCenter.machines;
        
        if (availableMachines.length === 0) {
          errors.push({
            operationId: operation.id,
            error: `No available machines in work center ${operation.workCenter.code}`,
          });
          continue;
        }

        // Select machine with earliest availability
        let selectedMachine = availableMachines[0];
        let earliestStart = machineAvailability.get(selectedMachine.id) || new Date();

        for (const machine of availableMachines) {
          const availability = machineAvailability.get(machine.id) || new Date();
          if (availability < earliestStart) {
            earliestStart = availability;
            selectedMachine = machine;
          }
        }

        // Calculate times
        const setupMinutes = Number(operation.setupTimeStandard || 0);
        const runMinutes = Number(operation.runTimeStandard || 0) * operation.quantityRequired;
        const teardownMinutes = Number(operation.teardownTimeStandard || 0);
        const totalMinutes = setupMinutes + runMinutes + teardownMinutes;

        const scheduledStart = new Date(Math.max(earliestStart.getTime(), Date.now()));
        const scheduledEnd = new Date(scheduledStart.getTime() + totalMinutes * 60000);

        // Check if within horizon
        if (scheduledStart > new Date(dto.horizonDate)) {
          errors.push({
            operationId: operation.id,
            error: 'Cannot schedule within horizon',
          });
          continue;
        }

        // Create slot
        const slot = await this.createSlot(
          organizationId,
          {
            facilityId: operation.workOrder.facilityId,
            machineId: selectedMachine.id,
            operationId: operation.id,
            workOrderId: operation.workOrderId,
            scheduledStart: scheduledStart.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
            setupMinutes,
            runMinutes,
            teardownMinutes,
          },
          userId,
        );

        scheduledSlots.push(slot);

        // Update machine availability
        machineAvailability.set(selectedMachine.id, scheduledEnd);
      } catch (error) {
        errors.push({
          operationId: operation.id,
          error: error.message,
        });
      }
    }

    this.logger.log(`Auto-scheduled ${scheduledSlots.length} operations, ${errors.length} errors`);

    return {
      scheduled: scheduledSlots.length,
      errors: errors.length,
      slots: scheduledSlots,
      errorDetails: errors,
    };
  }

  // ==========================================================================
  // CAPACITY VIEW
  // ==========================================================================

  /**
   * Get machine capacity view for date range
   */
  async getMachineCapacity(
    organizationId: string,
    machineId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, organizationId },
      include: {
        workCenter: { select: { capacityHoursDay: true } },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    const dailyCapacity = Number(machine.workCenter?.capacityHoursDay || 8) * 60; // minutes

    // Get scheduled slots
    const slots = await this.prisma.productionSchedule.findMany({
      where: {
        machineId,
        scheduledStart: { gte: fromDate },
        scheduledEnd: { lte: toDate },
      },
      include: {
        operation: { select: { operationNumber: true, name: true } },
        workOrder: { select: { workOrderNumber: true, priority: true } },
      },
      orderBy: { scheduledStart: 'asc' },
    });

    // Calculate capacity by day
    const capacityByDay = new Map<string, { scheduled: number; slots: any[] }>();

    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      capacityByDay.set(dateKey, { scheduled: 0, slots: [] });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const slot of slots) {
      const dateKey = slot.scheduledStart.toISOString().split('T')[0];
      const entry = capacityByDay.get(dateKey);
      if (entry) {
        const durationMinutes =
          (slot.scheduledEnd.getTime() - slot.scheduledStart.getTime()) / 60000;
        entry.scheduled += durationMinutes;
        entry.slots.push(slot);
      }
    }

    return {
      machine: {
        id: machine.id,
        machineCode: machine.machineCode,
        name: machine.name,
        status: machine.status,
      },
      dailyCapacityMinutes: dailyCapacity,
      days: Array.from(capacityByDay.entries()).map(([date, data]) => ({
        date,
        availableMinutes: dailyCapacity,
        scheduledMinutes: Math.round(data.scheduled),
        utilizationPercent: Math.round((data.scheduled / dailyCapacity) * 100),
        slots: data.slots,
      })),
    };
  }

  /**
   * Get all machines capacity summary
   */
  async getCapacitySummary(
    organizationId: string,
    facilityId: string,
    date: Date,
  ) {
    const machines = await this.prisma.machine.findMany({
      where: {
        organizationId,
        facilityId,
        isActive: true,
      },
      include: {
        workCenter: { select: { code: true, capacityHoursDay: true } },
      },
    });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const slots = await this.prisma.productionSchedule.findMany({
      where: {
        organizationId,
        facilityId,
        scheduledStart: { lte: endOfDay },
        scheduledEnd: { gte: startOfDay },
      },
    });

    // Calculate utilization per machine
    const machineUtilization = machines.map((machine) => {
      const dailyCapacity = Number(machine.workCenter?.capacityHoursDay || 8) * 60;
      const machineSlots = slots.filter((s) => s.machineId === machine.id);
      const scheduledMinutes = machineSlots.reduce((sum, slot) => {
        const duration = (slot.scheduledEnd.getTime() - slot.scheduledStart.getTime()) / 60000;
        return sum + duration;
      }, 0);

      return {
        machineId: machine.id,
        machineCode: machine.machineCode,
        machineName: machine.name,
        status: machine.status,
        workCenter: machine.workCenter?.code,
        dailyCapacityMinutes: dailyCapacity,
        scheduledMinutes: Math.round(scheduledMinutes),
        utilizationPercent: Math.round((scheduledMinutes / dailyCapacity) * 100),
        jobCount: machineSlots.length,
      };
    });

    // Calculate totals
    const totalCapacity = machineUtilization.reduce((sum, m) => sum + m.dailyCapacityMinutes, 0);
    const totalScheduled = machineUtilization.reduce((sum, m) => sum + m.scheduledMinutes, 0);

    return {
      date: date.toISOString().split('T')[0],
      summary: {
        totalMachines: machines.length,
        totalCapacityMinutes: totalCapacity,
        totalScheduledMinutes: totalScheduled,
        overallUtilization: Math.round((totalScheduled / totalCapacity) * 100),
        totalJobs: slots.length,
      },
      machines: machineUtilization,
    };
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async findConflicts(
    machineId: string,
    start: Date,
    end: Date,
    excludeSlotId?: string,
  ) {
    return this.prisma.productionSchedule.findFirst({
      where: {
        machineId,
        ...(excludeSlotId && { id: { not: excludeSlotId } }),
        OR: [
          // New slot starts during existing slot
          {
            scheduledStart: { lte: start },
            scheduledEnd: { gt: start },
          },
          // New slot ends during existing slot
          {
            scheduledStart: { lt: end },
            scheduledEnd: { gte: end },
          },
          // New slot contains existing slot
          {
            scheduledStart: { gte: start },
            scheduledEnd: { lte: end },
          },
        ],
      },
    });
  }

  private applySchedulingStrategy(operations: any[], strategy: string) {
    switch (strategy) {
      case 'shortest_job_first':
        return [...operations].sort((a, b) => {
          const timeA = Number(a.setupTimeStandard || 0) + Number(a.runTimeStandard || 0) * a.quantityRequired;
          const timeB = Number(b.setupTimeStandard || 0) + Number(b.runTimeStandard || 0) * b.quantityRequired;
          return timeA - timeB;
        });

      case 'critical_ratio':
        return [...operations].sort((a, b) => {
          const now = Date.now();
          const dueA = new Date(a.workOrder.dueDate).getTime();
          const dueB = new Date(b.workOrder.dueDate).getTime();
          const timeA = Number(a.setupTimeStandard || 0) + Number(a.runTimeStandard || 0) * a.quantityRequired;
          const timeB = Number(b.setupTimeStandard || 0) + Number(b.runTimeStandard || 0) * b.quantityRequired;
          
          const ratioA = (dueA - now) / (timeA * 60000);
          const ratioB = (dueB - now) / (timeB * 60000);
          return ratioA - ratioB; // Lower ratio = more critical
        });

      case 'priority':
        const priorityOrder = { CRITICAL: 0, URGENT: 1, HIGH: 2, NORMAL: 3, LOW: 4 };
        return [...operations].sort((a, b) => {
          const pA = priorityOrder[a.workOrder.priority] ?? 3;
          const pB = priorityOrder[b.workOrder.priority] ?? 3;
          return pA - pB;
        });

      case 'earliest_due_date':
      default:
        return [...operations].sort((a, b) => {
          return new Date(a.workOrder.dueDate).getTime() - new Date(b.workOrder.dueDate).getTime();
        });
    }
  }
}
