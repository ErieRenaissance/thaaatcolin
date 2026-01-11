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
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  WorkOrderQueryDto,
  WorkOrderStatus,
  OperationStatus,
  PriorityLevel,
  ReleaseWorkOrderDto,
  HoldWorkOrderDto,
  CloseWorkOrderDto,
  CreateWorkOrderOperationDto,
  UpdateWorkOrderOperationDto,
  StartOperationDto,
  RecordProductionDto,
  CompleteOperationDto,
  FirstPieceApprovalDto,
  OperatorDispatchListQueryDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class WorkOrdersService {
  private readonly logger = new Logger(WorkOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================================
  // WORK ORDER NUMBER GENERATION
  // ==========================================================================

  private async generateWorkOrderNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `WO${year}`;

    // Find the highest number for this year
    const lastWO = await this.prisma.workOrder.findFirst({
      where: {
        organizationId,
        workOrderNumber: { startsWith: prefix },
      },
      orderBy: { workOrderNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastWO) {
      const lastNum = parseInt(lastWO.workOrderNumber.slice(4), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  // ==========================================================================
  // WORK ORDER CRUD
  // ==========================================================================

  /**
   * Create a new work order
   */
  async create(organizationId: string, dto: CreateWorkOrderDto, userId?: string) {
    // Validate part exists
    const part = await this.prisma.part.findFirst({
      where: { id: dto.partId, organizationId },
      include: {
        operations: { orderBy: { operationNumber: 'asc' } },
      },
    });

    if (!part) {
      throw new NotFoundException(`Part ${dto.partId} not found`);
    }

    // Validate part revision if provided
    if (dto.partRevisionId) {
      const revision = await this.prisma.partRevision.findFirst({
        where: { id: dto.partRevisionId, partId: dto.partId },
      });
      if (!revision) {
        throw new NotFoundException(`Part revision ${dto.partRevisionId} not found`);
      }
    }

    // Generate work order number
    const workOrderNumber = await this.generateWorkOrderNumber(organizationId);

    // Build operations from DTO or part master
    const operationsToCreate = dto.operations?.length
      ? dto.operations
      : part.operations.map((op, index) => ({
          sequence: index + 1,
          operationNumber: op.operationNumber,
          name: op.name,
          description: op.description,
          workCenterId: op.workCenterId,
          setupTimeStandard: Number(op.setupTimeMinutes || 0),
          runTimeStandard: Number(op.runTimeMinutes || 0),
          inspectionRequired: op.inspectionRequired,
        }));

    // Validate work centers exist
    for (const op of operationsToCreate) {
      const wc = await this.prisma.workCenter.findFirst({
        where: { id: op.workCenterId, organizationId },
      });
      if (!wc) {
        throw new NotFoundException(`Work center ${op.workCenterId} not found`);
      }
    }

    // Calculate estimated hours
    const estimatedSetupHours = operationsToCreate.reduce(
      (sum, op) => sum + (op.setupTimeStandard || 0),
      0,
    ) / 60;
    const estimatedRunHours = operationsToCreate.reduce(
      (sum, op) => sum + (op.runTimeStandard || 0) * dto.quantityOrdered,
      0,
    ) / 60;

    // Create work order with operations
    const workOrder = await this.prisma.workOrder.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        workOrderNumber,
        orderLineId: dto.orderLineId,
        partId: dto.partId,
        partRevisionId: dto.partRevisionId,
        parentWorkOrderId: dto.parentWorkOrderId,
        priority: dto.priority ?? PriorityLevel.NORMAL,
        quantityOrdered: dto.quantityOrdered,
        quantityRemaining: dto.quantityOrdered,
        dueDate: new Date(dto.dueDate),
        scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : undefined,
        scheduledComplete: dto.scheduledComplete ? new Date(dto.scheduledComplete) : undefined,
        estimatedSetupHours,
        estimatedRunHours,
        operationCount: operationsToCreate.length,
        notes: dto.notes,
        productionNotes: dto.productionNotes,
        createdBy: userId,
        operations: {
          create: operationsToCreate.map((op) => ({
            sequence: op.sequence,
            operationNumber: op.operationNumber,
            name: op.name,
            description: op.description,
            instructions: op.instructions,
            workCenterId: op.workCenterId,
            machineId: op.machineId,
            setupTimeStandard: op.setupTimeStandard ?? 0,
            runTimeStandard: op.runTimeStandard ?? 0,
            teardownTimeStandard: op.teardownTimeStandard ?? 0,
            quantityRequired: dto.quantityOrdered,
            ncProgramName: op.ncProgramName,
            ncProgramRevision: op.ncProgramRevision,
            toolingRequired: op.toolingRequired,
            inspectionRequired: op.inspectionRequired ?? false,
            firstPieceRequired: op.firstPieceRequired ?? false,
            setupNotes: op.setupNotes,
            qualityNotes: op.qualityNotes,
          })),
        },
      },
      include: {
        part: true,
        partRevision: true,
        operations: {
          include: { workCenter: true, machine: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    // Update order line if linked
    if (dto.orderLineId) {
      await this.prisma.orderLine.update({
        where: { id: dto.orderLineId },
        data: { status: 'IN_PRODUCTION' },
      });
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'WORK_ORDER',
      entityId: workOrder.id,
      newValues: { workOrderNumber, quantityOrdered: dto.quantityOrdered },
    });

    this.logger.log(`Created work order ${workOrderNumber} for ${dto.quantityOrdered}x ${part.partNumber}`);
    return workOrder;
  }

  /**
   * Find all work orders with filtering
   */
  async findAll(organizationId: string, query: WorkOrderQueryDto) {
    const {
      facilityId,
      partId,
      orderLineId,
      status,
      statuses,
      priority,
      dueDateFrom,
      dueDateTo,
      search,
      includeOperations,
      sortBy = 'dueDate',
      sortOrder = 'asc',
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.WorkOrderWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(partId && { partId }),
      ...(orderLineId && { orderLineId }),
      ...(status && { status }),
      ...(statuses?.length && { status: { in: statuses } }),
      ...(priority && { priority }),
      ...(dueDateFrom && { dueDate: { gte: new Date(dueDateFrom) } }),
      ...(dueDateTo && { dueDate: { lte: new Date(dueDateTo) } }),
      ...(search && {
        OR: [
          { workOrderNumber: { contains: search, mode: 'insensitive' } },
          { part: { partNumber: { contains: search, mode: 'insensitive' } } },
          { part: { description: { contains: search, mode: 'insensitive' } } },
        ],
      }),
    };

    const orderBy: Prisma.WorkOrderOrderByWithRelationInput = {};
    if (sortBy === 'priority') {
      // Custom priority ordering
      orderBy.priority = sortOrder;
    } else {
      orderBy[sortBy] = sortOrder;
    }

    const [workOrders, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        include: {
          part: { select: { id: true, partNumber: true, description: true } },
          partRevision: { select: { id: true, revision: true } },
          orderLine: {
            select: {
              id: true,
              lineNumber: true,
              order: { select: { id: true, orderNumber: true } },
            },
          },
          ...(includeOperations && {
            operations: {
              include: { workCenter: true, machine: true },
              orderBy: { sequence: 'asc' },
            },
          }),
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.workOrder.count({ where }),
    ]);

    return { data: workOrders, total, page, limit };
  }

  /**
   * Find a single work order by ID
   */
  async findOne(organizationId: string, id: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: {
        part: true,
        partRevision: true,
        orderLine: {
          include: {
            order: { select: { id: true, orderNumber: true, customerId: true } },
          },
        },
        operations: {
          include: {
            workCenter: true,
            machine: true,
            assignedOperator: { select: { id: true, firstName: true, lastName: true } },
            laborEntries: {
              where: { isActive: true },
              include: {
                operator: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
        childWorkOrders: {
          select: { id: true, workOrderNumber: true, status: true, quantityOrdered: true },
        },
        parentWorkOrder: {
          select: { id: true, workOrderNumber: true },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    return workOrder;
  }

  /**
   * Find work order by number
   */
  async findByNumber(organizationId: string, workOrderNumber: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { organizationId, workOrderNumber },
      include: {
        part: true,
        operations: {
          include: { workCenter: true },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${workOrderNumber} not found`);
    }

    return workOrder;
  }

  /**
   * Update a work order
   */
  async update(organizationId: string, id: string, dto: UpdateWorkOrderDto, userId?: string) {
    const existing = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    // Cannot update closed/cancelled work orders
    if (['CLOSED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot update ${existing.status} work order`);
    }

    const workOrder = await this.prisma.workOrder.update({
      where: { id },
      data: {
        ...(dto.priority && { priority: dto.priority }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.scheduledStart !== undefined && {
          scheduledStart: dto.scheduledStart ? new Date(dto.scheduledStart) : null,
        }),
        ...(dto.scheduledComplete !== undefined && {
          scheduledComplete: dto.scheduledComplete ? new Date(dto.scheduledComplete) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.productionNotes !== undefined && { productionNotes: dto.productionNotes }),
        ...(dto.qualityNotes !== undefined && { qualityNotes: dto.qualityNotes }),
        updatedBy: userId,
      },
      include: {
        part: true,
        operations: { orderBy: { sequence: 'asc' } },
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'WORK_ORDER',
      entityId: id,
      previousValues: existing,
      newValues: dto,
    });

    return workOrder;
  }

  // ==========================================================================
  // WORK ORDER LIFECYCLE
  // ==========================================================================

  /**
   * Release work order to production
   */
  async release(
    organizationId: string,
    id: string,
    dto: ReleaseWorkOrderDto,
    userId: string,
  ) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: { operations: true },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    if (workOrder.status !== WorkOrderStatus.CREATED) {
      throw new BadRequestException(`Work order must be in CREATED status to release`);
    }

    if (workOrder.operations.length === 0) {
      throw new BadRequestException('Work order must have at least one operation');
    }

    // TODO: Check material availability if not force release
    // if (!dto.forceRelease) { ... }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.RELEASED,
        releasedAt: new Date(),
        releasedBy: userId,
        operations: {
          updateMany: {
            where: { sequence: 1 },
            data: { status: OperationStatus.READY },
          },
        },
      },
      include: { part: true, operations: true },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'RELEASE',
      entityType: 'WORK_ORDER',
      entityId: id,
      newValues: { status: 'RELEASED', releasedAt: updated.releasedAt },
    });

    this.logger.log(`Released work order ${workOrder.workOrderNumber}`);
    return updated;
  }

  /**
   * Put work order on hold
   */
  async hold(
    organizationId: string,
    id: string,
    dto: HoldWorkOrderDto,
    userId: string,
  ) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    if (!['RELEASED', 'IN_PROGRESS'].includes(workOrder.status)) {
      throw new BadRequestException('Can only hold RELEASED or IN_PROGRESS work orders');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.ON_HOLD,
        notes: workOrder.notes
          ? `${workOrder.notes}\n\nHOLD: ${dto.reason}`
          : `HOLD: ${dto.reason}`,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'HOLD',
      entityType: 'WORK_ORDER',
      entityId: id,
      newValues: { status: 'ON_HOLD', reason: dto.reason },
    });

    this.logger.log(`Work order ${workOrder.workOrderNumber} placed on hold: ${dto.reason}`);
    return updated;
  }

  /**
   * Resume work order from hold
   */
  async resume(organizationId: string, id: string, userId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: { operations: true },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    if (workOrder.status !== WorkOrderStatus.ON_HOLD) {
      throw new BadRequestException('Work order is not on hold');
    }

    // Determine new status based on progress
    const hasStarted = workOrder.operations.some(
      (op) => op.status === OperationStatus.IN_PROGRESS || op.status === OperationStatus.COMPLETE,
    );

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: hasStarted ? WorkOrderStatus.IN_PROGRESS : WorkOrderStatus.RELEASED,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'RESUME',
      entityType: 'WORK_ORDER',
      entityId: id,
      newValues: { status: updated.status },
    });

    this.logger.log(`Work order ${workOrder.workOrderNumber} resumed`);
    return updated;
  }

  /**
   * Complete work order
   */
  async complete(organizationId: string, id: string, userId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: { operations: true },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    // Check all operations are complete
    const incompleteOps = workOrder.operations.filter(
      (op) => op.status !== OperationStatus.COMPLETE && op.status !== OperationStatus.SKIPPED,
    );

    if (incompleteOps.length > 0) {
      throw new BadRequestException(
        `Cannot complete work order with ${incompleteOps.length} incomplete operations`,
      );
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.COMPLETE,
        actualComplete: new Date(),
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMPLETE',
      entityType: 'WORK_ORDER',
      entityId: id,
      newValues: { status: 'COMPLETE', actualComplete: updated.actualComplete },
    });

    this.logger.log(`Completed work order ${workOrder.workOrderNumber}`);
    return updated;
  }

  /**
   * Close work order (finalize)
   */
  async close(
    organizationId: string,
    id: string,
    dto: CloseWorkOrderDto,
    userId: string,
  ) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: {
        operations: true,
        laborEntries: { where: { isActive: true } },
      },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    // Check for active labor
    if (workOrder.laborEntries.length > 0 && !dto.forceClose) {
      throw new BadRequestException('Cannot close work order with active labor entries');
    }

    // Calculate actual costs
    const laborEntries = await this.prisma.laborEntry.findMany({
      where: { workOrderId: id },
    });

    const actualLaborCost = laborEntries.reduce(
      (sum, entry) => sum + Number(entry.laborCost || 0),
      0,
    );

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.CLOSED,
        closedAt: new Date(),
        closedBy: userId,
        actualLaborCost,
        totalActualCost: actualLaborCost, // + material + machine costs
        ...(dto.notes && {
          notes: workOrder.notes ? `${workOrder.notes}\n\nCLOSED: ${dto.notes}` : dto.notes,
        }),
      },
    });

    // Update order line if linked
    if (workOrder.orderLineId) {
      // Check if all work orders for this line are complete
      const remainingWOs = await this.prisma.workOrder.count({
        where: {
          orderLineId: workOrder.orderLineId,
          status: { notIn: ['CLOSED', 'CANCELLED'] },
        },
      });

      if (remainingWOs === 0) {
        await this.prisma.orderLine.update({
          where: { id: workOrder.orderLineId },
          data: { status: 'COMPLETE' },
        });
      }
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CLOSE',
      entityType: 'WORK_ORDER',
      entityId: id,
      newValues: { status: 'CLOSED', closedAt: updated.closedAt },
    });

    this.logger.log(`Closed work order ${workOrder.workOrderNumber}`);
    return updated;
  }

  /**
   * Cancel work order
   */
  async cancel(organizationId: string, id: string, reason: string, userId: string) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, organizationId },
      include: { laborEntries: { where: { isActive: true } } },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${id} not found`);
    }

    if (['CLOSED', 'CANCELLED'].includes(workOrder.status)) {
      throw new BadRequestException(`Work order is already ${workOrder.status}`);
    }

    // Check for active labor
    if (workOrder.laborEntries.length > 0) {
      throw new BadRequestException('Cannot cancel work order with active labor entries');
    }

    const updated = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.CANCELLED,
        closedAt: new Date(),
        closedBy: userId,
        notes: workOrder.notes
          ? `${workOrder.notes}\n\nCANCELLED: ${reason}`
          : `CANCELLED: ${reason}`,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CANCEL',
      entityType: 'WORK_ORDER',
      entityId: id,
      newValues: { status: 'CANCELLED', reason },
    });

    this.logger.log(`Cancelled work order ${workOrder.workOrderNumber}: ${reason}`);
    return updated;
  }

  // ==========================================================================
  // OPERATION MANAGEMENT
  // ==========================================================================

  /**
   * Add operation to work order
   */
  async addOperation(
    organizationId: string,
    workOrderId: string,
    dto: CreateWorkOrderOperationDto,
    userId?: string,
  ) {
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, organizationId },
    });

    if (!workOrder) {
      throw new NotFoundException(`Work order ${workOrderId} not found`);
    }

    if (['CLOSED', 'CANCELLED', 'COMPLETE'].includes(workOrder.status)) {
      throw new BadRequestException(`Cannot add operations to ${workOrder.status} work order`);
    }

    const operation = await this.prisma.workOrderOperation.create({
      data: {
        workOrderId,
        sequence: dto.sequence,
        operationNumber: dto.operationNumber,
        name: dto.name,
        description: dto.description,
        instructions: dto.instructions,
        workCenterId: dto.workCenterId,
        machineId: dto.machineId,
        setupTimeStandard: dto.setupTimeStandard ?? 0,
        runTimeStandard: dto.runTimeStandard ?? 0,
        teardownTimeStandard: dto.teardownTimeStandard ?? 0,
        quantityRequired: workOrder.quantityOrdered,
        ncProgramName: dto.ncProgramName,
        ncProgramRevision: dto.ncProgramRevision,
        toolingRequired: dto.toolingRequired,
        inspectionRequired: dto.inspectionRequired ?? false,
        firstPieceRequired: dto.firstPieceRequired ?? false,
        setupNotes: dto.setupNotes,
        qualityNotes: dto.qualityNotes,
      },
    });

    // Update operation count
    await this.prisma.workOrder.update({
      where: { id: workOrderId },
      data: { operationCount: { increment: 1 } },
    });

    return operation;
  }

  /**
   * Update operation
   */
  async updateOperation(
    organizationId: string,
    operationId: string,
    dto: UpdateWorkOrderOperationDto,
    userId?: string,
  ) {
    const operation = await this.prisma.workOrderOperation.findFirst({
      where: {
        id: operationId,
        workOrder: { organizationId },
      },
    });

    if (!operation) {
      throw new NotFoundException(`Operation ${operationId} not found`);
    }

    return this.prisma.workOrderOperation.update({
      where: { id: operationId },
      data: {
        ...(dto.sequence !== undefined && { sequence: dto.sequence }),
        ...(dto.operationNumber !== undefined && { operationNumber: dto.operationNumber }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.instructions !== undefined && { instructions: dto.instructions }),
        ...(dto.workCenterId && { workCenterId: dto.workCenterId }),
        ...(dto.machineId !== undefined && { machineId: dto.machineId }),
        ...(dto.assignedOperatorId !== undefined && { assignedOperatorId: dto.assignedOperatorId }),
        ...(dto.status && { status: dto.status }),
        ...(dto.setupTimeStandard !== undefined && { setupTimeStandard: dto.setupTimeStandard }),
        ...(dto.runTimeStandard !== undefined && { runTimeStandard: dto.runTimeStandard }),
        ...(dto.setupTimeActual !== undefined && { setupTimeActual: dto.setupTimeActual }),
        ...(dto.runTimeActual !== undefined && { runTimeActual: dto.runTimeActual }),
        ...(dto.quantityComplete !== undefined && { quantityComplete: dto.quantityComplete }),
        ...(dto.quantityScrapped !== undefined && { quantityScrapped: dto.quantityScrapped }),
        ...(dto.toolingVerified !== undefined && { toolingVerified: dto.toolingVerified }),
        ...(dto.firstPieceComplete !== undefined && { firstPieceComplete: dto.firstPieceComplete }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  // ==========================================================================
  // SHOP FLOOR OPERATIONS
  // ==========================================================================

  /**
   * Get operator dispatch list
   */
  async getDispatchList(organizationId: string, query: OperatorDispatchListQueryDto) {
    const { workCenterId, machineId, readyOnly } = query;

    const where: Prisma.WorkOrderOperationWhereInput = {
      workOrder: {
        organizationId,
        status: { in: [WorkOrderStatus.RELEASED, WorkOrderStatus.IN_PROGRESS] },
      },
      status: readyOnly
        ? { in: [OperationStatus.READY] }
        : { in: [OperationStatus.PENDING, OperationStatus.READY, OperationStatus.IN_PROGRESS] },
      ...(workCenterId && { workCenterId }),
      ...(machineId && { machineId }),
    };

    const operations = await this.prisma.workOrderOperation.findMany({
      where,
      include: {
        workOrder: {
          include: {
            part: { select: { partNumber: true, description: true } },
          },
        },
        workCenter: { select: { code: true, name: true } },
        machine: { select: { machineCode: true, name: true } },
        assignedOperator: { select: { firstName: true, lastName: true } },
      },
      orderBy: [
        { workOrder: { priority: 'desc' } },
        { workOrder: { dueDate: 'asc' } },
        { sequence: 'asc' },
      ],
    });

    // Determine readiness for each operation
    return operations.map((op) => {
      // Check if previous operation is complete
      const isReady =
        op.status === OperationStatus.READY ||
        op.status === OperationStatus.IN_PROGRESS;

      // Check blockers
      let blockedReason: string | undefined;
      if (op.firstPieceRequired && !op.firstPieceComplete && op.quantityComplete > 0) {
        blockedReason = 'First piece approval required';
      }

      return {
        operation: op,
        workOrder: op.workOrder,
        part: op.workOrder.part,
        machine: op.machine,
        estimatedStart: op.scheduledStart,
        estimatedDuration:
          (op.setupTimeStandard || 0) +
          (op.runTimeStandard || 0) * op.quantityRequired,
        priority: this.getPriorityScore(op.workOrder),
        isReady,
        blockedReason,
      };
    });
  }

  /**
   * Start operation (shop floor)
   */
  async startOperation(
    organizationId: string,
    dto: StartOperationDto,
    userId: string,
  ) {
    const operation = await this.prisma.workOrderOperation.findFirst({
      where: {
        id: dto.operationId,
        workOrder: { organizationId },
      },
      include: { workOrder: true },
    });

    if (!operation) {
      throw new NotFoundException(`Operation ${dto.operationId} not found`);
    }

    if (operation.status === OperationStatus.COMPLETE) {
      throw new BadRequestException('Operation is already complete');
    }

    if (operation.status === OperationStatus.IN_PROGRESS) {
      throw new BadRequestException('Operation is already in progress');
    }

    // Update operation status
    const updated = await this.prisma.workOrderOperation.update({
      where: { id: dto.operationId },
      data: {
        status: OperationStatus.IN_PROGRESS,
        actualStart: operation.actualStart || new Date(),
        machineId: dto.machineId,
      },
    });

    // Update work order status if first operation started
    if (operation.workOrder.status === WorkOrderStatus.RELEASED) {
      await this.prisma.workOrder.update({
        where: { id: operation.workOrderId },
        data: {
          status: WorkOrderStatus.IN_PROGRESS,
          actualStart: new Date(),
          currentOperation: operation.operationNumber,
        },
      });
    }

    // Create labor entry
    await this.prisma.laborEntry.create({
      data: {
        organizationId,
        workOrderId: operation.workOrderId,
        operationId: dto.operationId,
        machineId: dto.machineId,
        operatorId: userId,
        activityType: dto.isSetup ? 'SETUP' : 'RUN',
        startTime: new Date(),
        notes: dto.notes,
      },
    });

    // Update machine status if provided
    if (dto.machineId) {
      await this.prisma.machine.update({
        where: { id: dto.machineId },
        data: {
          status: dto.isSetup ? 'SETUP' : 'RUNNING',
          statusSince: new Date(),
          currentOperatorId: userId,
          currentWorkOrderId: operation.workOrderId,
          currentOperationId: dto.operationId,
        },
      });
    }

    this.logger.log(
      `Started operation ${operation.operationNumber} on WO ${operation.workOrder.workOrderNumber}`,
    );
    return updated;
  }

  /**
   * Record production (shop floor)
   */
  async recordProduction(
    organizationId: string,
    dto: RecordProductionDto,
    userId: string,
  ) {
    const operation = await this.prisma.workOrderOperation.findFirst({
      where: {
        id: dto.operationId,
        workOrder: { organizationId },
      },
      include: { workOrder: true },
    });

    if (!operation) {
      throw new NotFoundException(`Operation ${dto.operationId} not found`);
    }

    // Update operation quantities
    const updated = await this.prisma.workOrderOperation.update({
      where: { id: dto.operationId },
      data: {
        quantityComplete: { increment: dto.quantityGood },
        quantityScrapped: { increment: dto.quantityScrap || 0 },
        quantityRework: { increment: dto.quantityRework || 0 },
      },
    });

    // Update work order quantities
    await this.prisma.workOrder.update({
      where: { id: operation.workOrderId },
      data: {
        quantityComplete: { increment: dto.quantityGood },
        quantityScrapped: { increment: dto.quantityScrap || 0 },
        quantityRemaining: { decrement: dto.quantityGood + (dto.quantityScrap || 0) },
      },
    });

    // Update active labor entry
    const activeLaborEntry = await this.prisma.laborEntry.findFirst({
      where: {
        operationId: dto.operationId,
        operatorId: userId,
        isActive: true,
      },
    });

    if (activeLaborEntry) {
      await this.prisma.laborEntry.update({
        where: { id: activeLaborEntry.id },
        data: {
          quantityGood: { increment: dto.quantityGood },
          quantityScrap: { increment: dto.quantityScrap || 0 },
          quantityRework: { increment: dto.quantityRework || 0 },
          ...(dto.scrapReasonCode && { scrapReasonCode: dto.scrapReasonCode }),
          ...(dto.scrapNotes && { scrapNotes: dto.scrapNotes }),
        },
      });
    }

    // Create scrap record if scrap reported
    if (dto.quantityScrap && dto.quantityScrap > 0) {
      await this.prisma.scrapRecord.create({
        data: {
          organizationId,
          workOrderId: operation.workOrderId,
          operationId: dto.operationId,
          laborEntryId: activeLaborEntry?.id,
          quantity: dto.quantityScrap,
          reasonCode: dto.scrapReasonCode || 'UNKNOWN',
          reasonDescription: dto.scrapNotes,
          reportedBy: userId,
          reportedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `Recorded production on op ${operation.operationNumber}: ${dto.quantityGood} good, ${dto.quantityScrap || 0} scrap`,
    );
    return updated;
  }

  /**
   * Complete operation (shop floor)
   */
  async completeOperation(
    organizationId: string,
    dto: CompleteOperationDto,
    userId: string,
  ) {
    const operation = await this.prisma.workOrderOperation.findFirst({
      where: {
        id: dto.operationId,
        workOrder: { organizationId },
      },
      include: {
        workOrder: { include: { operations: { orderBy: { sequence: 'asc' } } } },
      },
    });

    if (!operation) {
      throw new NotFoundException(`Operation ${dto.operationId} not found`);
    }

    // Record final quantities if provided
    if (dto.quantityGood !== undefined || dto.quantityScrap !== undefined) {
      await this.recordProduction(
        organizationId,
        {
          operationId: dto.operationId,
          quantityGood: dto.quantityGood || 0,
          quantityScrap: dto.quantityScrap,
        },
        userId,
      );
    }

    // Calculate actual times
    const laborEntries = await this.prisma.laborEntry.findMany({
      where: { operationId: dto.operationId },
    });

    const setupTime = laborEntries
      .filter((e) => e.activityType === 'SETUP')
      .reduce((sum, e) => sum + Number(e.durationMinutes || 0), 0);

    const runTime = laborEntries
      .filter((e) => e.activityType === 'RUN')
      .reduce((sum, e) => sum + Number(e.durationMinutes || 0), 0);

    // Update operation
    const updated = await this.prisma.workOrderOperation.update({
      where: { id: dto.operationId },
      data: {
        status: OperationStatus.COMPLETE,
        actualEnd: new Date(),
        setupTimeActual: setupTime,
        runTimeActual: runTime,
        notes: dto.notes,
      },
    });

    // End active labor entries
    await this.prisma.laborEntry.updateMany({
      where: {
        operationId: dto.operationId,
        isActive: true,
      },
      data: {
        endTime: new Date(),
        isActive: false,
      },
    });

    // Set next operation to READY
    const nextOp = operation.workOrder.operations.find(
      (op) => op.sequence === operation.sequence + 1,
    );

    if (nextOp) {
      await this.prisma.workOrderOperation.update({
        where: { id: nextOp.id },
        data: { status: OperationStatus.READY },
      });

      await this.prisma.workOrder.update({
        where: { id: operation.workOrderId },
        data: { currentOperation: nextOp.operationNumber },
      });
    } else {
      // All operations complete - check if work order can be completed
      const allComplete = operation.workOrder.operations.every(
        (op) =>
          op.id === operation.id ||
          op.status === OperationStatus.COMPLETE ||
          op.status === OperationStatus.SKIPPED,
      );

      if (allComplete) {
        await this.prisma.workOrder.update({
          where: { id: operation.workOrderId },
          data: {
            status: WorkOrderStatus.COMPLETE,
            actualComplete: new Date(),
          },
        });
      }
    }

    // Update machine status
    const machineId = operation.machineId;
    if (machineId) {
      await this.prisma.machine.update({
        where: { id: machineId },
        data: {
          status: 'IDLE',
          statusSince: new Date(),
          currentOperatorId: null,
          currentWorkOrderId: null,
          currentOperationId: null,
        },
      });
    }

    this.logger.log(
      `Completed operation ${operation.operationNumber} on WO ${operation.workOrder.workOrderNumber}`,
    );
    return updated;
  }

  /**
   * First piece approval
   */
  async firstPieceApproval(
    organizationId: string,
    dto: FirstPieceApprovalDto,
    userId: string,
  ) {
    const operation = await this.prisma.workOrderOperation.findFirst({
      where: {
        id: dto.operationId,
        workOrder: { organizationId },
      },
    });

    if (!operation) {
      throw new NotFoundException(`Operation ${dto.operationId} not found`);
    }

    if (!operation.firstPieceRequired) {
      throw new BadRequestException('First piece inspection not required for this operation');
    }

    const updated = await this.prisma.workOrderOperation.update({
      where: { id: dto.operationId },
      data: {
        firstPieceComplete: dto.approved,
        qualityNotes: dto.notes,
        metadata: dto.measurementData
          ? { ...((operation.metadata as object) || {}), firstPieceMeasurements: dto.measurementData }
          : undefined,
      },
    });

    if (!dto.approved) {
      // Could trigger hold or notification
      this.logger.warn(
        `First piece REJECTED for operation ${operation.operationNumber}`,
      );
    }

    return updated;
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private getPriorityScore(workOrder: any): number {
    const priorityMap = {
      CRITICAL: 100,
      URGENT: 80,
      HIGH: 60,
      NORMAL: 40,
      LOW: 20,
    };

    const basePriority = priorityMap[workOrder.priority] || 40;

    // Add urgency based on due date
    const daysUntilDue = Math.ceil(
      (new Date(workOrder.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    let urgencyBonus = 0;
    if (daysUntilDue < 0) urgencyBonus = 50; // Overdue
    else if (daysUntilDue <= 1) urgencyBonus = 30;
    else if (daysUntilDue <= 3) urgencyBonus = 15;
    else if (daysUntilDue <= 7) urgencyBonus = 5;

    return basePriority + urgencyBonus;
  }
}
