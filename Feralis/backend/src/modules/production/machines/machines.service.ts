import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateMachineDto,
  UpdateMachineDto,
  UpdateMachineStatusDto,
  MachineQueryDto,
  MachineStatus,
  CreateMachineAlarmDto,
  AcknowledgeAlarmDto,
  MachineAlarmQueryDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  CompleteMaintenanceDto,
  MaintenanceStatus,
  CreateDowntimeDto,
  EndDowntimeDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MachinesService {
  private readonly logger = new Logger(MachinesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================================
  // MACHINE CRUD
  // ==========================================================================

  /**
   * Create a new machine
   */
  async create(organizationId: string, dto: CreateMachineDto, userId?: string) {
    // Check for duplicate machine code
    const existing = await this.prisma.machine.findFirst({
      where: {
        organizationId,
        machineCode: dto.machineCode,
      },
    });

    if (existing) {
      throw new ConflictException(`Machine with code ${dto.machineCode} already exists`);
    }

    // Validate work center if provided
    if (dto.workCenterId) {
      const workCenter = await this.prisma.workCenter.findFirst({
        where: { id: dto.workCenterId, organizationId },
      });
      if (!workCenter) {
        throw new NotFoundException(`Work center ${dto.workCenterId} not found`);
      }
    }

    const machine = await this.prisma.machine.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        workCenterId: dto.workCenterId,
        machineCode: dto.machineCode,
        name: dto.name,
        description: dto.description,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        machineType: dto.machineType,
        controlType: dto.controlType,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        installDate: dto.installDate ? new Date(dto.installDate) : undefined,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : undefined,
        hourlyRate: dto.hourlyRate,
        setupRate: dto.setupRate,
        locationX: dto.locationX,
        locationY: dto.locationY,
        floorSection: dto.floorSection,
        telemetryEnabled: dto.telemetryEnabled ?? false,
        telemetryEndpoint: dto.telemetryEndpoint,
        telemetryProtocol: dto.telemetryProtocol,
        maintenanceIntervalDays: dto.maintenanceIntervalDays,
        specifications: dto.specifications ?? {},
        capabilities: dto.capabilities ?? {},
        createdBy: userId,
      },
      include: {
        facility: true,
        workCenter: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'MACHINE',
      entityId: machine.id,
      newValues: machine,
    });

    this.logger.log(`Created machine ${machine.machineCode} (${machine.id})`);
    return machine;
  }

  /**
   * Find all machines with filtering
   */
  async findAll(organizationId: string, query: MachineQueryDto) {
    const {
      facilityId,
      workCenterId,
      machineType,
      status,
      isActive,
      telemetryEnabled,
      search,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.MachineWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(workCenterId && { workCenterId }),
      ...(machineType && { machineType }),
      ...(status && { status }),
      ...(isActive !== undefined && { isActive }),
      ...(telemetryEnabled !== undefined && { telemetryEnabled }),
      ...(search && {
        OR: [
          { machineCode: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [machines, total] = await Promise.all([
      this.prisma.machine.findMany({
        where,
        include: {
          facility: true,
          workCenter: true,
          currentOperator: {
            select: { id: true, firstName: true, lastName: true },
          },
          currentWorkOrder: {
            select: { id: true, workOrderNumber: true },
          },
        },
        orderBy: { machineCode: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.machine.count({ where }),
    ]);

    return { data: machines, total, page, limit };
  }

  /**
   * Find a single machine by ID
   */
  async findOne(organizationId: string, id: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, organizationId },
      include: {
        facility: true,
        workCenter: true,
        currentOperator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        currentWorkOrder: {
          include: { part: true },
        },
        currentOperation: true,
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    return machine;
  }

  /**
   * Update a machine
   */
  async update(organizationId: string, id: string, dto: UpdateMachineDto, userId?: string) {
    const existing = await this.prisma.machine.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    // Check for duplicate code if changing
    if (dto.machineCode && dto.machineCode !== existing.machineCode) {
      const duplicate = await this.prisma.machine.findFirst({
        where: {
          organizationId,
          machineCode: dto.machineCode,
          id: { not: id },
        },
      });
      if (duplicate) {
        throw new ConflictException(`Machine with code ${dto.machineCode} already exists`);
      }
    }

    const machine = await this.prisma.machine.update({
      where: { id },
      data: {
        ...(dto.facilityId && { facilityId: dto.facilityId }),
        ...(dto.workCenterId !== undefined && { workCenterId: dto.workCenterId }),
        ...(dto.machineCode && { machineCode: dto.machineCode }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.manufacturer !== undefined && { manufacturer: dto.manufacturer }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber }),
        ...(dto.machineType && { machineType: dto.machineType }),
        ...(dto.controlType !== undefined && { controlType: dto.controlType }),
        ...(dto.purchaseDate !== undefined && {
          purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        }),
        ...(dto.installDate !== undefined && {
          installDate: dto.installDate ? new Date(dto.installDate) : null,
        }),
        ...(dto.warrantyExpiry !== undefined && {
          warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        }),
        ...(dto.hourlyRate !== undefined && { hourlyRate: dto.hourlyRate }),
        ...(dto.setupRate !== undefined && { setupRate: dto.setupRate }),
        ...(dto.locationX !== undefined && { locationX: dto.locationX }),
        ...(dto.locationY !== undefined && { locationY: dto.locationY }),
        ...(dto.floorSection !== undefined && { floorSection: dto.floorSection }),
        ...(dto.telemetryEnabled !== undefined && { telemetryEnabled: dto.telemetryEnabled }),
        ...(dto.telemetryEndpoint !== undefined && { telemetryEndpoint: dto.telemetryEndpoint }),
        ...(dto.telemetryProtocol !== undefined && { telemetryProtocol: dto.telemetryProtocol }),
        ...(dto.maintenanceIntervalDays !== undefined && {
          maintenanceIntervalDays: dto.maintenanceIntervalDays,
        }),
        ...(dto.specifications && { specifications: dto.specifications }),
        ...(dto.capabilities && { capabilities: dto.capabilities }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        updatedBy: userId,
      },
      include: {
        facility: true,
        workCenter: true,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'MACHINE',
      entityId: id,
      previousValues: existing,
      newValues: machine,
    });

    this.logger.log(`Updated machine ${machine.machineCode} (${machine.id})`);
    return machine;
  }

  /**
   * Update machine status (for shop floor operations)
   */
  async updateStatus(
    organizationId: string,
    id: string,
    dto: UpdateMachineStatusDto,
    userId?: string,
  ) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, organizationId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    const previousStatus = machine.status;

    const updated = await this.prisma.machine.update({
      where: { id },
      data: {
        status: dto.status,
        statusSince: new Date(),
        currentOperatorId: dto.operatorId,
        currentWorkOrderId: dto.workOrderId,
        currentOperationId: dto.operationId,
        updatedBy: userId,
      },
      include: {
        currentOperator: {
          select: { id: true, firstName: true, lastName: true },
        },
        currentWorkOrder: {
          select: { id: true, workOrderNumber: true },
        },
      },
    });

    // If transitioning to RUNNING, increment run hours tracking
    if (dto.status === MachineStatus.RUNNING && previousStatus !== MachineStatus.RUNNING) {
      // Start tracking run time - handled by telemetry or periodic job
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: 'STATUS_CHANGE',
      entityType: 'MACHINE',
      entityId: id,
      previousValues: { status: previousStatus },
      newValues: { status: dto.status },
    });

    this.logger.log(`Machine ${machine.machineCode} status changed: ${previousStatus} -> ${dto.status}`);
    return updated;
  }

  /**
   * Delete a machine
   */
  async delete(organizationId: string, id: string, userId?: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            operations: true,
            laborEntries: true,
            scheduleSlots: true,
          },
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${id} not found`);
    }

    // Check for active dependencies
    if (machine._count.operations > 0 || machine._count.laborEntries > 0) {
      throw new ConflictException('Cannot delete machine with production history. Deactivate instead.');
    }

    await this.prisma.machine.delete({ where: { id } });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'MACHINE',
      entityId: id,
      previousValues: machine,
    });

    this.logger.log(`Deleted machine ${machine.machineCode} (${id})`);
  }

  // ==========================================================================
  // MACHINE ALARMS
  // ==========================================================================

  /**
   * Create/record a machine alarm
   */
  async createAlarm(organizationId: string, dto: CreateMachineAlarmDto, userId?: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, organizationId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${dto.machineId} not found`);
    }

    const alarm = await this.prisma.machineAlarm.create({
      data: {
        machineId: dto.machineId,
        alarmCode: dto.alarmCode,
        alarmText: dto.alarmText,
        severity: dto.severity,
        triggeredAt: new Date(),
        workOrderId: dto.workOrderId,
        operationId: dto.operationId,
        metadata: dto.metadata ?? {},
      },
      include: {
        machine: true,
      },
    });

    this.logger.warn(`Machine alarm: ${machine.machineCode} - ${dto.alarmCode}: ${dto.alarmText}`);
    return alarm;
  }

  /**
   * Acknowledge an alarm
   */
  async acknowledgeAlarm(
    organizationId: string,
    alarmId: string,
    dto: AcknowledgeAlarmDto,
    userId: string,
  ) {
    const alarm = await this.prisma.machineAlarm.findFirst({
      where: {
        id: alarmId,
        machine: { organizationId },
      },
    });

    if (!alarm) {
      throw new NotFoundException(`Alarm ${alarmId} not found`);
    }

    if (alarm.state !== 'ACTIVE') {
      throw new BadRequestException('Alarm is not in ACTIVE state');
    }

    const updated = await this.prisma.machineAlarm.update({
      where: { id: alarmId },
      data: {
        state: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
        notes: dto.notes,
      },
    });

    this.logger.log(`Alarm ${alarmId} acknowledged by user ${userId}`);
    return updated;
  }

  /**
   * Clear an alarm
   */
  async clearAlarm(organizationId: string, alarmId: string, userId?: string) {
    const alarm = await this.prisma.machineAlarm.findFirst({
      where: {
        id: alarmId,
        machine: { organizationId },
      },
    });

    if (!alarm) {
      throw new NotFoundException(`Alarm ${alarmId} not found`);
    }

    const updated = await this.prisma.machineAlarm.update({
      where: { id: alarmId },
      data: {
        state: 'CLEARED',
        clearedAt: new Date(),
      },
    });

    this.logger.log(`Alarm ${alarmId} cleared`);
    return updated;
  }

  /**
   * Get machine alarms
   */
  async getAlarms(organizationId: string, query: MachineAlarmQueryDto) {
    const { machineId, severity, state, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.MachineAlarmWhereInput = {
      machine: { organizationId },
      ...(machineId && { machineId }),
      ...(severity && { severity }),
      ...(state && { state }),
      ...(fromDate && { triggeredAt: { gte: new Date(fromDate) } }),
      ...(toDate && { triggeredAt: { lte: new Date(toDate) } }),
    };

    const [alarms, total] = await Promise.all([
      this.prisma.machineAlarm.findMany({
        where,
        include: {
          machine: { select: { id: true, machineCode: true, name: true } },
          acknowledger: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { triggeredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.machineAlarm.count({ where }),
    ]);

    return { data: alarms, total, page, limit };
  }

  // ==========================================================================
  // MACHINE MAINTENANCE
  // ==========================================================================

  /**
   * Schedule maintenance
   */
  async createMaintenance(organizationId: string, dto: CreateMaintenanceDto, userId?: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, organizationId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${dto.machineId} not found`);
    }

    const maintenance = await this.prisma.machineMaintenance.create({
      data: {
        machineId: dto.machineId,
        maintenanceType: dto.maintenanceType,
        title: dto.title,
        description: dto.description,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        assignedTo: dto.assignedTo,
        createdBy: userId,
      },
      include: {
        machine: true,
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Scheduled maintenance ${maintenance.id} for machine ${machine.machineCode}`);
    return maintenance;
  }

  /**
   * Start maintenance
   */
  async startMaintenance(organizationId: string, maintenanceId: string, userId: string) {
    const maintenance = await this.prisma.machineMaintenance.findFirst({
      where: {
        id: maintenanceId,
        machine: { organizationId },
      },
      include: { machine: true },
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance record ${maintenanceId} not found`);
    }

    if (maintenance.status !== 'SCHEDULED' && maintenance.status !== 'OVERDUE') {
      throw new BadRequestException(`Cannot start maintenance in ${maintenance.status} status`);
    }

    // Update maintenance record
    const updated = await this.prisma.machineMaintenance.update({
      where: { id: maintenanceId },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        performedBy: userId,
      },
    });

    // Update machine status
    await this.updateStatus(
      organizationId,
      maintenance.machineId,
      { status: MachineStatus.MAINTENANCE },
      userId,
    );

    this.logger.log(`Started maintenance ${maintenanceId} on machine ${maintenance.machine.machineCode}`);
    return updated;
  }

  /**
   * Complete maintenance
   */
  async completeMaintenance(
    organizationId: string,
    maintenanceId: string,
    dto: CompleteMaintenanceDto,
    userId: string,
  ) {
    const maintenance = await this.prisma.machineMaintenance.findFirst({
      where: {
        id: maintenanceId,
        machine: { organizationId },
      },
      include: { machine: true },
    });

    if (!maintenance) {
      throw new NotFoundException(`Maintenance record ${maintenanceId} not found`);
    }

    if (maintenance.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Maintenance must be in progress to complete');
    }

    // Calculate total cost
    const totalCost =
      (dto.laborCost || 0) + (dto.partsCost || 0);

    // Calculate duration if started
    let durationMinutes = dto.durationMinutes;
    if (!durationMinutes && maintenance.startedAt) {
      durationMinutes = Math.round(
        (new Date().getTime() - maintenance.startedAt.getTime()) / 60000,
      );
    }

    // Update maintenance record
    const updated = await this.prisma.machineMaintenance.update({
      where: { id: maintenanceId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        performedBy: userId,
        durationMinutes,
        laborCost: dto.laborCost,
        partsCost: dto.partsCost,
        totalCost,
        partsReplaced: dto.partsReplaced,
        workPerformed: dto.workPerformed,
        findings: dto.findings,
        requiresFollowUp: dto.requiresFollowUp ?? false,
        followUpNotes: dto.followUpNotes,
        meterReadingAfter: dto.meterReadingAfter,
      },
    });

    // Update machine - set next maintenance date
    const nextMaintenanceDate = maintenance.machine.maintenanceIntervalDays
      ? new Date(Date.now() + maintenance.machine.maintenanceIntervalDays * 24 * 60 * 60 * 1000)
      : undefined;

    await this.prisma.machine.update({
      where: { id: maintenance.machineId },
      data: {
        status: 'IDLE',
        statusSince: new Date(),
        lastMaintenanceDate: new Date(),
        nextMaintenanceDate,
      },
    });

    this.logger.log(`Completed maintenance ${maintenanceId} on machine ${maintenance.machine.machineCode}`);
    return updated;
  }

  /**
   * Get maintenance records for a machine
   */
  async getMaintenance(organizationId: string, machineId: string, status?: MaintenanceStatus) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: machineId, organizationId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${machineId} not found`);
    }

    return this.prisma.machineMaintenance.findMany({
      where: {
        machineId,
        ...(status && { status }),
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
        performer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  // ==========================================================================
  // MACHINE DOWNTIME
  // ==========================================================================

  /**
   * Start downtime tracking
   */
  async startDowntime(organizationId: string, dto: CreateDowntimeDto, userId?: string) {
    const machine = await this.prisma.machine.findFirst({
      where: { id: dto.machineId, organizationId },
    });

    if (!machine) {
      throw new NotFoundException(`Machine ${dto.machineId} not found`);
    }

    // Check for active downtime
    const activeDowntime = await this.prisma.machineDowntime.findFirst({
      where: {
        machineId: dto.machineId,
        endTime: null,
      },
    });

    if (activeDowntime) {
      throw new BadRequestException('Machine already has active downtime record');
    }

    const downtime = await this.prisma.machineDowntime.create({
      data: {
        machineId: dto.machineId,
        downtimeType: dto.downtimeType,
        reasonCode: dto.reasonCode,
        reasonDescription: dto.reasonDescription,
        startTime: new Date(),
        workOrderId: dto.workOrderId,
        operationId: dto.operationId,
        partsAffected: dto.partsAffected,
        reportedBy: userId,
      },
    });

    // Update machine status if unplanned
    if (dto.downtimeType === 'UNPLANNED') {
      await this.updateStatus(
        organizationId,
        dto.machineId,
        { status: MachineStatus.BREAKDOWN },
        userId,
      );
    }

    this.logger.log(`Started downtime tracking for machine ${machine.machineCode}: ${dto.reasonCode}`);
    return downtime;
  }

  /**
   * End downtime tracking
   */
  async endDowntime(
    organizationId: string,
    downtimeId: string,
    dto: EndDowntimeDto,
    userId?: string,
  ) {
    const downtime = await this.prisma.machineDowntime.findFirst({
      where: {
        id: downtimeId,
        machine: { organizationId },
      },
      include: { machine: true },
    });

    if (!downtime) {
      throw new NotFoundException(`Downtime record ${downtimeId} not found`);
    }

    if (downtime.endTime) {
      throw new BadRequestException('Downtime already ended');
    }

    const endTime = new Date();
    const durationMinutes = (endTime.getTime() - downtime.startTime.getTime()) / 60000;

    const updated = await this.prisma.machineDowntime.update({
      where: { id: downtimeId },
      data: {
        endTime,
        durationMinutes,
        rootCause: dto.rootCause,
        resolution: dto.resolution,
        preventiveAction: dto.preventiveAction,
      },
    });

    // Reset machine status
    await this.updateStatus(
      organizationId,
      downtime.machineId,
      { status: MachineStatus.IDLE },
      userId,
    );

    this.logger.log(
      `Ended downtime for machine ${downtime.machine.machineCode}: ${durationMinutes.toFixed(1)} minutes`,
    );
    return updated;
  }

  /**
   * Get downtime records
   */
  async getDowntime(
    organizationId: string,
    machineId: string,
    fromDate?: Date,
    toDate?: Date,
  ) {
    return this.prisma.machineDowntime.findMany({
      where: {
        machineId,
        machine: { organizationId },
        ...(fromDate && { startTime: { gte: fromDate } }),
        ...(toDate && { startTime: { lte: toDate } }),
      },
      include: {
        reporter: { select: { id: true, firstName: true, lastName: true } },
        workOrder: { select: { id: true, workOrderNumber: true } },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  // ==========================================================================
  // MACHINE DASHBOARD / FLOOR STATUS
  // ==========================================================================

  /**
   * Get shop floor machine status overview
   */
  async getFloorStatus(organizationId: string, facilityId?: string) {
    const where: Prisma.MachineWhereInput = {
      organizationId,
      isActive: true,
      ...(facilityId && { facilityId }),
    };

    const machines = await this.prisma.machine.findMany({
      where,
      include: {
        workCenter: { select: { id: true, code: true, name: true } },
        currentOperator: { select: { id: true, firstName: true, lastName: true } },
        currentWorkOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            part: { select: { partNumber: true, description: true } },
          },
        },
        currentOperation: {
          select: {
            id: true,
            operationNumber: true,
            name: true,
            quantityRequired: true,
            quantityComplete: true,
          },
        },
      },
      orderBy: [{ workCenterId: 'asc' }, { machineCode: 'asc' }],
    });

    // Group by status
    const statusCounts = machines.reduce(
      (acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Group by work center
    const byWorkCenter = machines.reduce(
      (acc, m) => {
        const wcId = m.workCenterId || 'unassigned';
        if (!acc[wcId]) {
          acc[wcId] = {
            workCenter: m.workCenter,
            machines: [],
          };
        }
        acc[wcId].machines.push(m);
        return acc;
      },
      {} as Record<string, { workCenter: any; machines: any[] }>,
    );

    return {
      totalMachines: machines.length,
      statusCounts,
      byWorkCenter: Object.values(byWorkCenter),
      machines,
    };
  }

  /**
   * Get OEE (Overall Equipment Effectiveness) for a machine
   */
  async getOEE(
    organizationId: string,
    machineId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const machine = await this.findOne(organizationId, machineId);

    // Get labor entries for the period
    const laborEntries = await this.prisma.laborEntry.findMany({
      where: {
        machineId,
        startTime: { gte: fromDate },
        endTime: { lte: toDate },
      },
    });

    // Get downtime for the period
    const downtimes = await this.prisma.machineDowntime.findMany({
      where: {
        machineId,
        startTime: { gte: fromDate },
        endTime: { lte: toDate },
      },
    });

    // Calculate metrics
    const plannedProductionTime = (toDate.getTime() - fromDate.getTime()) / 60000; // minutes
    const totalDowntimeMinutes = downtimes.reduce(
      (sum, d) => sum + Number(d.durationMinutes || 0),
      0,
    );
    const runTime = plannedProductionTime - totalDowntimeMinutes;

    const totalGoodParts = laborEntries.reduce((sum, l) => sum + l.quantityGood, 0);
    const totalScrapParts = laborEntries.reduce((sum, l) => sum + l.quantityScrap, 0);
    const totalParts = totalGoodParts + totalScrapParts;

    // OEE Components
    const availability = plannedProductionTime > 0 ? runTime / plannedProductionTime : 0;
    const performance = 1; // Would need ideal cycle time to calculate properly
    const quality = totalParts > 0 ? totalGoodParts / totalParts : 1;
    const oee = availability * performance * quality;

    return {
      machine: {
        id: machine.id,
        machineCode: machine.machineCode,
        name: machine.name,
      },
      period: { fromDate, toDate },
      metrics: {
        availability: Math.round(availability * 100),
        performance: Math.round(performance * 100),
        quality: Math.round(quality * 100),
        oee: Math.round(oee * 100),
      },
      details: {
        plannedProductionMinutes: Math.round(plannedProductionTime),
        runTimeMinutes: Math.round(runTime),
        downtimeMinutes: Math.round(totalDowntimeMinutes),
        totalPartsProduced: totalParts,
        goodParts: totalGoodParts,
        scrapParts: totalScrapParts,
      },
    };
  }
}
