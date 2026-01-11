import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateWorkCenterDto,
  UpdateWorkCenterDto,
  WorkCenterQueryDto,
  WorkCenterResponseDto,
} from '../production/dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkCentersService {
  private readonly logger = new Logger(WorkCentersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create a new work center
   */
  async create(
    organizationId: string,
    dto: CreateWorkCenterDto,
    userId?: string,
  ): Promise<WorkCenterResponseDto> {
    // Check for duplicate code
    const existing = await this.prisma.workCenter.findFirst({
      where: {
        organizationId,
        code: dto.code,
      },
    });

    if (existing) {
      throw new ConflictException(`Work center with code ${dto.code} already exists`);
    }

    // Create work center
    const workCenter = await this.prisma.workCenter.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        hourlyRate: dto.hourlyRate,
        setupRate: dto.setupRate,
        overheadRate: dto.overheadRate,
        capacityHoursDay: dto.capacityHoursDay,
        defaultEfficiency: dto.defaultEfficiency ?? 100,
        inputQueueMax: dto.inputQueueMax,
        outputQueueMax: dto.outputQueueMax,
        createdBy: userId,
      },
      include: {
        facility: true,
        _count: {
          select: { machines: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'WORK_CENTER',
      entityId: workCenter.id,
      newValues: workCenter,
    });

    this.logger.log(`Created work center ${workCenter.code} (${workCenter.id})`);

    return this.mapToResponse(workCenter);
  }

  /**
   * Find all work centers with filtering and pagination
   */
  async findAll(
    organizationId: string,
    query: WorkCenterQueryDto,
  ): Promise<{ data: WorkCenterResponseDto[]; total: number; page: number; limit: number }> {
    const { facilityId, isActive, search, page = 1, limit = 20 } = query;

    const where: Prisma.WorkCenterWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [workCenters, total] = await Promise.all([
      this.prisma.workCenter.findMany({
        where,
        include: {
          facility: true,
          _count: {
            select: { machines: true },
          },
        },
        orderBy: { code: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workCenter.count({ where }),
    ]);

    return {
      data: workCenters.map(wc => this.mapToResponse(wc)),
      total,
      page,
      limit,
    };
  }

  /**
   * Find a single work center by ID
   */
  async findOne(organizationId: string, id: string): Promise<WorkCenterResponseDto> {
    const workCenter = await this.prisma.workCenter.findFirst({
      where: { id, organizationId },
      include: {
        facility: true,
        machines: {
          where: { isActive: true },
          select: {
            id: true,
            machineCode: true,
            name: true,
            machineType: true,
            status: true,
          },
        },
        _count: {
          select: { machines: true, operations: true },
        },
      },
    });

    if (!workCenter) {
      throw new NotFoundException(`Work center ${id} not found`);
    }

    return this.mapToResponse(workCenter);
  }

  /**
   * Update a work center
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateWorkCenterDto,
    userId?: string,
  ): Promise<WorkCenterResponseDto> {
    const existing = await this.prisma.workCenter.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Work center ${id} not found`);
    }

    // Check for duplicate code if changing
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.prisma.workCenter.findFirst({
        where: {
          organizationId,
          code: dto.code,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Work center with code ${dto.code} already exists`);
      }
    }

    const workCenter = await this.prisma.workCenter.update({
      where: { id },
      data: {
        ...(dto.facilityId && { facilityId: dto.facilityId }),
        ...(dto.code && { code: dto.code }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
        ...(dto.setupRate !== undefined && { setupRate: dto.setupRate }),
        ...(dto.overheadRate !== undefined && { overheadRate: dto.overheadRate }),
        ...(dto.capacityHoursDay !== undefined && { capacityHoursDay: dto.capacityHoursDay }),
        ...(dto.defaultEfficiency !== undefined && { defaultEfficiency: dto.defaultEfficiency }),
        ...(dto.inputQueueMax !== undefined && { inputQueueMax: dto.inputQueueMax }),
        ...(dto.outputQueueMax !== undefined && { outputQueueMax: dto.outputQueueMax }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedBy: userId,
      },
      include: {
        facility: true,
        _count: {
          select: { machines: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'WORK_CENTER',
      entityId: id,
      previousValues: existing,
      newValues: workCenter,
    });

    this.logger.log(`Updated work center ${workCenter.code} (${workCenter.id})`);

    return this.mapToResponse(workCenter);
  }

  /**
   * Delete a work center
   */
  async delete(organizationId: string, id: string, userId?: string): Promise<void> {
    const workCenter = await this.prisma.workCenter.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: { machines: true, operations: true },
        },
      },
    });

    if (!workCenter) {
      throw new NotFoundException(`Work center ${id} not found`);
    }

    // Check for dependencies
    if (workCenter._count.machines > 0) {
      throw new ConflictException(
        `Cannot delete work center with ${workCenter._count.machines} machines assigned`,
      );
    }

    if (workCenter._count.operations > 0) {
      throw new ConflictException(
        `Cannot delete work center with ${workCenter._count.operations} operations assigned`,
      );
    }

    await this.prisma.workCenter.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'WORK_CENTER',
      entityId: id,
      previousValues: workCenter,
    });

    this.logger.log(`Deleted work center ${workCenter.code} (${id})`);
  }

  /**
   * Get work center capacity and utilization
   */
  async getCapacity(
    organizationId: string,
    id: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<{
    workCenter: WorkCenterResponseDto;
    capacity: {
      date: string;
      availableHours: number;
      scheduledHours: number;
      utilizationPercent: number;
    }[];
  }> {
    const workCenter = await this.findOne(organizationId, id);

    // Get scheduled operations for this work center in date range
    const schedules = await this.prisma.productionSchedule.findMany({
      where: {
        organizationId,
        operation: {
          workCenterId: id,
        },
        scheduledStart: { gte: fromDate },
        scheduledEnd: { lte: toDate },
        isCompleted: false,
      },
      include: {
        operation: true,
      },
    });

    // Calculate capacity by day
    const capacityByDay = new Map<string, { scheduled: number }>();
    const dailyCapacity = Number(workCenter.capacityHoursDay || 8);

    // Initialize days
    const currentDate = new Date(fromDate);
    while (currentDate <= toDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      capacityByDay.set(dateKey, { scheduled: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Sum scheduled time by day
    for (const schedule of schedules) {
      const dateKey = schedule.scheduledStart.toISOString().split('T')[0];
      const entry = capacityByDay.get(dateKey);
      if (entry) {
        const durationMinutes =
          (schedule.setupMinutes || 0) +
          (schedule.runMinutes || 0) +
          (schedule.teardownMinutes || 0);
        entry.scheduled += durationMinutes / 60;
      }
    }

    const capacity = Array.from(capacityByDay.entries()).map(([date, data]) => ({
      date,
      availableHours: dailyCapacity,
      scheduledHours: Math.round(data.scheduled * 100) / 100,
      utilizationPercent: Math.round((data.scheduled / dailyCapacity) * 100),
    }));

    return {
      workCenter,
      capacity,
    };
  }

  /**
   * Get work center queue (pending operations)
   */
  async getQueue(
    organizationId: string,
    id: string,
  ): Promise<{
    workCenter: WorkCenterResponseDto;
    inputQueue: any[];
    inProgress: any[];
    outputQueue: any[];
  }> {
    const workCenter = await this.findOne(organizationId, id);

    // Get operations in different states
    const [inputQueue, inProgress] = await Promise.all([
      this.prisma.workOrderOperation.findMany({
        where: {
          workCenterId: id,
          status: { in: ['PENDING', 'READY'] },
          workOrder: {
            organizationId,
            status: { in: ['RELEASED', 'IN_PROGRESS'] },
          },
        },
        include: {
          workOrder: {
            include: { part: true },
          },
          machine: true,
        },
        orderBy: [
          { workOrder: { priority: 'desc' } },
          { workOrder: { dueDate: 'asc' } },
          { sequence: 'asc' },
        ],
      }),
      this.prisma.workOrderOperation.findMany({
        where: {
          workCenterId: id,
          status: 'IN_PROGRESS',
          workOrder: {
            organizationId,
          },
        },
        include: {
          workOrder: {
            include: { part: true },
          },
          machine: true,
          assignedOperator: true,
        },
      }),
    ]);

    return {
      workCenter,
      inputQueue,
      inProgress,
      outputQueue: [], // Operations complete at this work center waiting for next
    };
  }

  /**
   * Map database entity to response DTO
   */
  private mapToResponse(workCenter: any): WorkCenterResponseDto {
    return {
      id: workCenter.id,
      organizationId: workCenter.organizationId,
      facilityId: workCenter.facilityId,
      code: workCenter.code,
      name: workCenter.name,
      description: workCenter.description,
      hourlyRate: workCenter.hourlyRate ? Number(workCenter.hourlyRate) : undefined,
      setupRate: workCenter.setupRate ? Number(workCenter.setupRate) : undefined,
      overheadRate: workCenter.overheadRate ? Number(workCenter.overheadRate) : undefined,
      capacityHoursDay: workCenter.capacityHoursDay
        ? Number(workCenter.capacityHoursDay)
        : undefined,
      defaultEfficiency: Number(workCenter.defaultEfficiency),
      inputQueueMax: workCenter.inputQueueMax,
      outputQueueMax: workCenter.outputQueueMax,
      isActive: workCenter.isActive,
      createdAt: workCenter.createdAt,
      updatedAt: workCenter.updatedAt,
      machineCount: workCenter._count?.machines,
    };
  }
}
