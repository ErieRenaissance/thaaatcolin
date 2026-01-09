import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  StartLaborEntryDto,
  EndLaborEntryDto,
  CreateManualLaborEntryDto,
  UpdateLaborEntryDto,
  LaborEntryQueryDto,
  CreateScrapRecordDto,
  UpdateScrapRecordDto,
  ScrapRecordQueryDto,
  LaborActivityType,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class LaborService {
  private readonly logger = new Logger(LaborService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================================
  // LABOR ENTRY OPERATIONS
  // ==========================================================================

  /**
   * Start a labor entry (clock in to operation)
   */
  async startLaborEntry(organizationId: string, dto: StartLaborEntryDto, userId: string) {
    // Validate operation exists
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

    // Check for existing active labor entry for this user
    const existingActive = await this.prisma.laborEntry.findFirst({
      where: {
        operatorId: userId,
        isActive: true,
      },
      include: {
        workOrder: { select: { workOrderNumber: true } },
        operation: { select: { operationNumber: true, name: true } },
      },
    });

    if (existingActive) {
      throw new BadRequestException(
        `Already clocked in to WO ${existingActive.workOrder.workOrderNumber} ` +
        `Op ${existingActive.operation.operationNumber}. Please clock out first.`,
      );
    }

    // Get operator's labor rate
    const operator = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const laborEntry = await this.prisma.laborEntry.create({
      data: {
        organizationId,
        workOrderId: dto.workOrderId,
        operationId: dto.operationId,
        machineId: dto.machineId,
        operatorId: userId,
        activityType: dto.activityType,
        startTime: new Date(),
        laborRate: operator?.metadata?.['laborRate'] || null,
        notes: dto.notes,
      },
      include: {
        workOrder: { select: { workOrderNumber: true } },
        operation: { select: { operationNumber: true, name: true } },
        machine: { select: { machineCode: true, name: true } },
      },
    });

    this.logger.log(
      `User ${userId} clocked in to WO ${operation.workOrder.workOrderNumber} ` +
      `Op ${operation.operationNumber} (${dto.activityType})`,
    );

    return laborEntry;
  }

  /**
   * End a labor entry (clock out)
   */
  async endLaborEntry(organizationId: string, laborEntryId: string, dto: EndLaborEntryDto, userId: string) {
    const laborEntry = await this.prisma.laborEntry.findFirst({
      where: {
        id: laborEntryId,
        organizationId,
      },
      include: {
        workOrder: { select: { workOrderNumber: true } },
        operation: { select: { operationNumber: true, name: true } },
      },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry ${laborEntryId} not found`);
    }

    if (!laborEntry.isActive) {
      throw new BadRequestException('Labor entry is already ended');
    }

    // Calculate duration
    const endTime = new Date();
    const durationMs = endTime.getTime() - laborEntry.startTime.getTime();
    const durationMinutes = durationMs / 60000 - (dto.breakMinutes || 0);

    // Calculate labor cost
    const laborCost = laborEntry.laborRate
      ? (durationMinutes / 60) * Number(laborEntry.laborRate)
      : null;

    const updated = await this.prisma.laborEntry.update({
      where: { id: laborEntryId },
      data: {
        endTime,
        durationMinutes,
        breakMinutes: dto.breakMinutes || 0,
        quantityGood: dto.quantityGood || 0,
        quantityScrap: dto.quantityScrap || 0,
        quantityRework: dto.quantityRework || 0,
        scrapReasonCode: dto.scrapReasonCode,
        scrapNotes: dto.scrapNotes,
        laborCost,
        notes: dto.notes || laborEntry.notes,
        isActive: false,
      },
      include: {
        workOrder: { select: { workOrderNumber: true } },
        operation: { select: { operationNumber: true, name: true } },
        machine: { select: { machineCode: true, name: true } },
        operator: { select: { firstName: true, lastName: true } },
      },
    });

    // Update operation quantities if production recorded
    if (dto.quantityGood || dto.quantityScrap) {
      await this.prisma.workOrderOperation.update({
        where: { id: laborEntry.operationId },
        data: {
          quantityComplete: { increment: dto.quantityGood || 0 },
          quantityScrapped: { increment: dto.quantityScrap || 0 },
          quantityRework: { increment: dto.quantityRework || 0 },
        },
      });

      // Update work order quantities
      await this.prisma.workOrder.update({
        where: { id: laborEntry.workOrderId },
        data: {
          quantityComplete: { increment: dto.quantityGood || 0 },
          quantityScrapped: { increment: dto.quantityScrap || 0 },
          quantityRemaining: { decrement: (dto.quantityGood || 0) + (dto.quantityScrap || 0) },
        },
      });
    }

    // Create scrap record if scrap reported
    if (dto.quantityScrap && dto.quantityScrap > 0) {
      await this.prisma.scrapRecord.create({
        data: {
          organizationId,
          workOrderId: laborEntry.workOrderId,
          operationId: laborEntry.operationId,
          laborEntryId,
          quantity: dto.quantityScrap,
          reasonCode: dto.scrapReasonCode || 'UNKNOWN',
          reasonDescription: dto.scrapNotes,
          reportedBy: userId,
          reportedAt: new Date(),
        },
      });
    }

    this.logger.log(
      `User ${userId} clocked out of WO ${laborEntry.workOrder.workOrderNumber} ` +
      `Op ${laborEntry.operation.operationNumber}: ${durationMinutes.toFixed(1)} min`,
    );

    return updated;
  }

  /**
   * Get current active labor entry for user
   */
  async getActiveEntry(organizationId: string, userId: string) {
    return this.prisma.laborEntry.findFirst({
      where: {
        organizationId,
        operatorId: userId,
        isActive: true,
      },
      include: {
        workOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            part: { select: { partNumber: true, description: true } },
          },
        },
        operation: {
          select: {
            id: true,
            operationNumber: true,
            name: true,
            quantityRequired: true,
            quantityComplete: true,
          },
        },
        machine: { select: { id: true, machineCode: true, name: true } },
      },
    });
  }

  /**
   * Create manual labor entry (for corrections/historical entry)
   */
  async createManualEntry(
    organizationId: string,
    dto: CreateManualLaborEntryDto,
    createdBy: string,
  ) {
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

    // Calculate duration
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000 - (dto.breakMinutes || 0);

    if (durationMinutes <= 0) {
      throw new BadRequestException('End time must be after start time');
    }

    // Get operator's labor rate
    const operator = await this.prisma.user.findUnique({
      where: { id: dto.operatorId },
    });

    const laborRate = operator?.metadata?.['laborRate'] || null;
    const laborCost = laborRate ? (durationMinutes / 60) * Number(laborRate) : null;

    const laborEntry = await this.prisma.laborEntry.create({
      data: {
        organizationId,
        workOrderId: dto.workOrderId,
        operationId: dto.operationId,
        machineId: dto.machineId,
        operatorId: dto.operatorId,
        activityType: dto.activityType,
        startTime,
        endTime,
        durationMinutes,
        breakMinutes: dto.breakMinutes || 0,
        quantityGood: dto.quantityGood || 0,
        quantityScrap: dto.quantityScrap || 0,
        quantityRework: dto.quantityRework || 0,
        scrapReasonCode: dto.scrapReasonCode,
        laborRate,
        laborCost,
        notes: dto.notes,
        isActive: false,
        metadata: { manualEntry: true, createdBy },
      },
    });

    await this.auditService.log({
      organizationId,
      userId: createdBy,
      action: 'CREATE',
      entityType: 'LABOR_ENTRY',
      entityId: laborEntry.id,
      newValues: { ...dto, manualEntry: true },
    });

    return laborEntry;
  }

  /**
   * Update labor entry (corrections)
   */
  async updateEntry(
    organizationId: string,
    laborEntryId: string,
    dto: UpdateLaborEntryDto,
    userId: string,
  ) {
    const laborEntry = await this.prisma.laborEntry.findFirst({
      where: {
        id: laborEntryId,
        organizationId,
      },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry ${laborEntryId} not found`);
    }

    // Recalculate duration if times changed
    let durationMinutes = laborEntry.durationMinutes;
    const startTime = dto.startTime ? new Date(dto.startTime) : laborEntry.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : laborEntry.endTime;
    const breakMinutes = dto.breakMinutes ?? Number(laborEntry.breakMinutes);

    if (startTime && endTime) {
      durationMinutes = new Prisma.Decimal(
        (endTime.getTime() - startTime.getTime()) / 60000 - breakMinutes,
      );
    }

    // Recalculate labor cost
    const laborCost = laborEntry.laborRate
      ? (Number(durationMinutes) / 60) * Number(laborEntry.laborRate)
      : null;

    const updated = await this.prisma.laborEntry.update({
      where: { id: laborEntryId },
      data: {
        ...(dto.startTime && { startTime }),
        ...(dto.endTime && { endTime }),
        ...(dto.breakMinutes !== undefined && { breakMinutes: dto.breakMinutes }),
        durationMinutes,
        laborCost,
        ...(dto.quantityGood !== undefined && { quantityGood: dto.quantityGood }),
        ...(dto.quantityScrap !== undefined && { quantityScrap: dto.quantityScrap }),
        ...(dto.quantityRework !== undefined && { quantityRework: dto.quantityRework }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'UPDATE',
      entityType: 'LABOR_ENTRY',
      entityId: laborEntryId,
      previousValues: laborEntry,
      newValues: dto,
    });

    return updated;
  }

  /**
   * Delete labor entry
   */
  async deleteEntry(organizationId: string, laborEntryId: string, userId: string) {
    const laborEntry = await this.prisma.laborEntry.findFirst({
      where: {
        id: laborEntryId,
        organizationId,
      },
    });

    if (!laborEntry) {
      throw new NotFoundException(`Labor entry ${laborEntryId} not found`);
    }

    if (laborEntry.isActive) {
      throw new BadRequestException('Cannot delete active labor entry. End it first.');
    }

    await this.prisma.laborEntry.delete({
      where: { id: laborEntryId },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'DELETE',
      entityType: 'LABOR_ENTRY',
      entityId: laborEntryId,
      previousValues: laborEntry,
    });
  }

  /**
   * Find labor entries with filtering
   */
  async findEntries(organizationId: string, query: LaborEntryQueryDto) {
    const {
      workOrderId,
      operationId,
      machineId,
      operatorId,
      activityType,
      isActive,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.LaborEntryWhereInput = {
      organizationId,
      ...(workOrderId && { workOrderId }),
      ...(operationId && { operationId }),
      ...(machineId && { machineId }),
      ...(operatorId && { operatorId }),
      ...(activityType && { activityType }),
      ...(isActive !== undefined && { isActive }),
      ...(fromDate && { startTime: { gte: new Date(fromDate) } }),
      ...(toDate && { startTime: { lte: new Date(toDate) } }),
    };

    const [entries, total] = await Promise.all([
      this.prisma.laborEntry.findMany({
        where,
        include: {
          workOrder: { select: { id: true, workOrderNumber: true } },
          operation: { select: { id: true, operationNumber: true, name: true } },
          machine: { select: { id: true, machineCode: true, name: true } },
          operator: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.laborEntry.count({ where }),
    ]);

    return { data: entries, total, page, limit };
  }

  // ==========================================================================
  // SCRAP RECORDS
  // ==========================================================================

  /**
   * Create scrap record
   */
  async createScrapRecord(organizationId: string, dto: CreateScrapRecordDto, userId: string) {
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

    // Calculate total cost
    const totalCost = (dto.materialCost || 0) + (dto.laborCost || 0);

    const scrapRecord = await this.prisma.scrapRecord.create({
      data: {
        organizationId,
        workOrderId: dto.workOrderId,
        operationId: dto.operationId,
        laborEntryId: dto.laborEntryId,
        quantity: dto.quantity,
        reasonCode: dto.reasonCode,
        reasonDescription: dto.reasonDescription,
        rootCause: dto.rootCause,
        correctiveAction: dto.correctiveAction,
        preventiveAction: dto.preventiveAction,
        materialCost: dto.materialCost,
        laborCost: dto.laborCost,
        totalCost,
        photoUrls: dto.photoUrls || [],
        reportedBy: userId,
        reportedAt: new Date(),
      },
      include: {
        workOrder: { select: { workOrderNumber: true } },
        operation: { select: { operationNumber: true, name: true } },
        reporter: { select: { firstName: true, lastName: true } },
      },
    });

    // Update operation scrap count
    await this.prisma.workOrderOperation.update({
      where: { id: dto.operationId },
      data: {
        quantityScrapped: { increment: dto.quantity },
      },
    });

    // Update work order scrap count
    await this.prisma.workOrder.update({
      where: { id: dto.workOrderId },
      data: {
        quantityScrapped: { increment: dto.quantity },
        quantityRemaining: { decrement: dto.quantity },
      },
    });

    this.logger.log(`Scrap reported: ${dto.quantity} pcs, reason: ${dto.reasonCode}`);
    return scrapRecord;
  }

  /**
   * Update scrap record (add analysis)
   */
  async updateScrapRecord(
    organizationId: string,
    scrapId: string,
    dto: UpdateScrapRecordDto,
    userId: string,
  ) {
    const scrapRecord = await this.prisma.scrapRecord.findFirst({
      where: {
        id: scrapId,
        organizationId,
      },
    });

    if (!scrapRecord) {
      throw new NotFoundException(`Scrap record ${scrapId} not found`);
    }

    const updated = await this.prisma.scrapRecord.update({
      where: { id: scrapId },
      data: {
        ...(dto.rootCause !== undefined && { rootCause: dto.rootCause }),
        ...(dto.correctiveAction !== undefined && { correctiveAction: dto.correctiveAction }),
        ...(dto.preventiveAction !== undefined && { preventiveAction: dto.preventiveAction }),
        ...(dto.ncrNumber && { ncrNumber: dto.ncrNumber }),
        reviewedBy: userId,
        reviewedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Find scrap records
   */
  async findScrapRecords(organizationId: string, query: ScrapRecordQueryDto) {
    const { workOrderId, operationId, reasonCode, fromDate, toDate, page = 1, limit = 20 } = query;

    const where: Prisma.ScrapRecordWhereInput = {
      organizationId,
      ...(workOrderId && { workOrderId }),
      ...(operationId && { operationId }),
      ...(reasonCode && { reasonCode }),
      ...(fromDate && { reportedAt: { gte: new Date(fromDate) } }),
      ...(toDate && { reportedAt: { lte: new Date(toDate) } }),
    };

    const [records, total] = await Promise.all([
      this.prisma.scrapRecord.findMany({
        where,
        include: {
          workOrder: { select: { workOrderNumber: true, part: { select: { partNumber: true } } } },
          operation: { select: { operationNumber: true, name: true } },
          reporter: { select: { firstName: true, lastName: true } },
          reviewer: { select: { firstName: true, lastName: true } },
        },
        orderBy: { reportedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.scrapRecord.count({ where }),
    ]);

    return { data: records, total, page, limit };
  }

  // ==========================================================================
  // LABOR ANALYTICS
  // ==========================================================================

  /**
   * Get labor summary for work order
   */
  async getWorkOrderLaborSummary(organizationId: string, workOrderId: string) {
    const laborEntries = await this.prisma.laborEntry.findMany({
      where: {
        organizationId,
        workOrderId,
        isActive: false,
      },
      include: {
        operator: { select: { firstName: true, lastName: true } },
        operation: { select: { operationNumber: true, name: true } },
      },
    });

    // Group by activity type
    const byActivity = laborEntries.reduce(
      (acc, entry) => {
        const type = entry.activityType;
        if (!acc[type]) {
          acc[type] = { minutes: 0, cost: 0, entries: 0 };
        }
        acc[type].minutes += Number(entry.durationMinutes || 0);
        acc[type].cost += Number(entry.laborCost || 0);
        acc[type].entries += 1;
        return acc;
      },
      {} as Record<string, { minutes: number; cost: number; entries: number }>,
    );

    // Group by operator
    const byOperator = laborEntries.reduce(
      (acc, entry) => {
        const key = entry.operatorId;
        if (!acc[key]) {
          acc[key] = {
            operator: entry.operator,
            minutes: 0,
            cost: 0,
            goodParts: 0,
            scrapParts: 0,
          };
        }
        acc[key].minutes += Number(entry.durationMinutes || 0);
        acc[key].cost += Number(entry.laborCost || 0);
        acc[key].goodParts += entry.quantityGood;
        acc[key].scrapParts += entry.quantityScrap;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Group by operation
    const byOperation = laborEntries.reduce(
      (acc, entry) => {
        const key = entry.operationId;
        if (!acc[key]) {
          acc[key] = {
            operation: entry.operation,
            setupMinutes: 0,
            runMinutes: 0,
            totalMinutes: 0,
            cost: 0,
          };
        }
        if (entry.activityType === 'SETUP') {
          acc[key].setupMinutes += Number(entry.durationMinutes || 0);
        } else {
          acc[key].runMinutes += Number(entry.durationMinutes || 0);
        }
        acc[key].totalMinutes += Number(entry.durationMinutes || 0);
        acc[key].cost += Number(entry.laborCost || 0);
        return acc;
      },
      {} as Record<string, any>,
    );

    const totalMinutes = laborEntries.reduce(
      (sum, e) => sum + Number(e.durationMinutes || 0),
      0,
    );
    const totalCost = laborEntries.reduce(
      (sum, e) => sum + Number(e.laborCost || 0),
      0,
    );
    const totalGood = laborEntries.reduce((sum, e) => sum + e.quantityGood, 0);
    const totalScrap = laborEntries.reduce((sum, e) => sum + e.quantityScrap, 0);

    return {
      summary: {
        totalEntries: laborEntries.length,
        totalMinutes: Math.round(totalMinutes * 10) / 10,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        totalCost: Math.round(totalCost * 100) / 100,
        totalGoodParts: totalGood,
        totalScrapParts: totalScrap,
        yieldPercent: totalGood + totalScrap > 0
          ? Math.round((totalGood / (totalGood + totalScrap)) * 100)
          : 100,
      },
      byActivity,
      byOperator: Object.values(byOperator),
      byOperation: Object.values(byOperation),
    };
  }

  /**
   * Get operator efficiency metrics
   */
  async getOperatorEfficiency(
    organizationId: string,
    operatorId: string,
    fromDate: Date,
    toDate: Date,
  ) {
    const laborEntries = await this.prisma.laborEntry.findMany({
      where: {
        organizationId,
        operatorId,
        isActive: false,
        startTime: { gte: fromDate },
        endTime: { lte: toDate },
      },
      include: {
        operation: {
          select: {
            setupTimeStandard: true,
            runTimeStandard: true,
            quantityRequired: true,
          },
        },
      },
    });

    // Calculate efficiency metrics
    let totalActualMinutes = 0;
    let totalStandardMinutes = 0;
    let totalGoodParts = 0;
    let totalScrapParts = 0;

    for (const entry of laborEntries) {
      const actualMinutes = Number(entry.durationMinutes || 0);
      totalActualMinutes += actualMinutes;
      totalGoodParts += entry.quantityGood;
      totalScrapParts += entry.quantityScrap;

      // Calculate standard time based on activity
      if (entry.activityType === 'SETUP') {
        totalStandardMinutes += Number(entry.operation.setupTimeStandard || 0);
      } else if (entry.activityType === 'RUN') {
        totalStandardMinutes +=
          Number(entry.operation.runTimeStandard || 0) * entry.quantityGood;
      }
    }

    const efficiency =
      totalActualMinutes > 0
        ? Math.round((totalStandardMinutes / totalActualMinutes) * 100)
        : 100;

    const qualityRate =
      totalGoodParts + totalScrapParts > 0
        ? Math.round((totalGoodParts / (totalGoodParts + totalScrapParts)) * 100)
        : 100;

    return {
      operatorId,
      period: { fromDate, toDate },
      metrics: {
        totalHours: Math.round((totalActualMinutes / 60) * 10) / 10,
        standardHours: Math.round((totalStandardMinutes / 60) * 10) / 10,
        efficiencyPercent: efficiency,
        totalGoodParts,
        totalScrapParts,
        qualityRatePercent: qualityRate,
        entriesCount: laborEntries.length,
      },
    };
  }
}
