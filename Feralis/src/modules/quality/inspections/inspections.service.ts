import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  StartInspectionDto,
  CompleteInspectionDto,
  RecordInspectionResultDto,
  InspectionQueryDto,
  InspectionStatus,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class InspectionsService {
  private readonly logger = new Logger(InspectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate inspection number
   */
  private async generateInspectionNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `INS${year}`;

    const lastInspection = await this.prisma.qualityInspection.findFirst({
      where: {
        organizationId,
        inspectionNumber: { startsWith: prefix },
      },
      orderBy: { inspectionNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastInspection) {
      const lastNum = parseInt(lastInspection.inspectionNumber.slice(5), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  /**
   * Create inspection
   */
  async create(organizationId: string, dto: CreateInspectionDto, userId: string) {
    const inspectionNumber = await this.generateInspectionNumber(organizationId);

    const inspection = await this.prisma.qualityInspection.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        inspectionNumber,
        inspectionType: dto.inspectionType,
        partId: dto.partId,
        partRevisionId: dto.partRevisionId,
        workOrderId: dto.workOrderId,
        operationId: dto.operationId,
        lotNumber: dto.lotNumber,
        quantityInspected: dto.quantityInspected,
        sampleSize: dto.sampleSize,
        method: dto.method,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        notes: dto.notes,
        inspectorId: userId,
      },
      include: {
        part: { select: { partNumber: true, description: true } },
        workOrder: { select: { workOrderNumber: true } },
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'QUALITY_INSPECTION',
      entityId: inspection.id,
      newValues: { inspectionNumber, inspectionType: dto.inspectionType },
    });

    this.logger.log(`Created inspection ${inspectionNumber}`);
    return inspection;
  }

  /**
   * Find all inspections
   */
  async findAll(organizationId: string, query: InspectionQueryDto) {
    const {
      facilityId,
      partId,
      workOrderId,
      inspectionType,
      status,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.QualityInspectionWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(partId && { partId }),
      ...(workOrderId && { workOrderId }),
      ...(inspectionType && { inspectionType }),
      ...(status && { status }),
      ...(fromDate && { createdAt: { gte: new Date(fromDate) } }),
      ...(toDate && { createdAt: { lte: new Date(toDate) } }),
    };

    const [inspections, total] = await Promise.all([
      this.prisma.qualityInspection.findMany({
        where,
        include: {
          part: { select: { partNumber: true, description: true } },
          workOrder: { select: { workOrderNumber: true } },
          inspector: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.qualityInspection.count({ where }),
    ]);

    return { data: inspections, total, page, limit };
  }

  /**
   * Find one inspection
   */
  async findOne(organizationId: string, id: string) {
    const inspection = await this.prisma.qualityInspection.findFirst({
      where: { id, organizationId },
      include: {
        facility: { select: { name: true, code: true } },
        part: { select: { partNumber: true, description: true } },
        partRevision: { select: { revision: true } },
        workOrder: { select: { workOrderNumber: true } },
        operation: { select: { operationNumber: true, name: true } },
        inspector: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
        results: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection ${id} not found`);
    }

    return inspection;
  }

  /**
   * Update inspection
   */
  async update(organizationId: string, id: string, dto: UpdateInspectionDto, userId: string) {
    const existing = await this.findOne(organizationId, id);

    if (['PASSED', 'FAILED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot update ${existing.status} inspection`);
    }

    const inspection = await this.prisma.qualityInspection.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.quantityInspected && { quantityInspected: dto.quantityInspected }),
        ...(dto.quantityAccepted !== undefined && { quantityAccepted: dto.quantityAccepted }),
        ...(dto.quantityRejected !== undefined && { quantityRejected: dto.quantityRejected }),
        ...(dto.method && { method: dto.method }),
        ...(dto.overallResult && { overallResult: dto.overallResult }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });

    return inspection;
  }

  /**
   * Start inspection
   */
  async start(organizationId: string, id: string, dto: StartInspectionDto, userId: string) {
    const inspection = await this.findOne(organizationId, id);

    if (inspection.status !== 'PENDING') {
      throw new BadRequestException('Inspection must be in PENDING status to start');
    }

    const updated = await this.prisma.qualityInspection.update({
      where: { id },
      data: {
        status: InspectionStatus.IN_PROGRESS,
        startedAt: new Date(),
        inspectorId: userId,
        equipmentUsed: dto.equipmentUsed || [],
      },
    });

    this.logger.log(`Started inspection ${inspection.inspectionNumber}`);
    return updated;
  }

  /**
   * Record inspection result
   */
  async recordResult(
    organizationId: string,
    inspectionId: string,
    dto: RecordInspectionResultDto,
    userId: string,
  ) {
    const inspection = await this.findOne(organizationId, inspectionId);

    if (inspection.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Inspection must be in progress to record results');
    }

    // Calculate deviation if numeric values provided
    let deviation: number | undefined;
    if (dto.measuredValue !== undefined && dto.nominal !== undefined) {
      deviation = dto.measuredValue - dto.nominal;
    }

    const result = await this.prisma.inspectionResult.create({
      data: {
        inspectionId,
        characteristicName: dto.characteristicName,
        characteristicType: dto.characteristicType,
        specification: dto.specification,
        nominal: dto.nominal,
        upperLimit: dto.upperLimit,
        lowerLimit: dto.lowerLimit,
        measuredValue: dto.measuredValue,
        measuredText: dto.measuredText,
        unit: dto.unit,
        isPass: dto.isPass,
        deviation,
        sampleNumber: dto.sampleNumber,
        serialNumber: dto.serialNumber,
        notes: dto.notes,
        measuredAt: new Date(),
        measuredById: userId,
      },
    });

    return result;
  }

  /**
   * Complete inspection
   */
  async complete(
    organizationId: string,
    id: string,
    dto: CompleteInspectionDto,
    userId: string,
  ) {
    const inspection = await this.findOne(organizationId, id);

    if (inspection.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Inspection must be in progress to complete');
    }

    // Validate quantities
    if (dto.quantityAccepted + dto.quantityRejected > inspection.quantityInspected) {
      throw new BadRequestException('Total quantity cannot exceed quantity inspected');
    }

    // Determine status based on results
    let status: InspectionStatus;
    if (dto.quantityRejected === 0) {
      status = InspectionStatus.PASSED;
    } else if (dto.quantityAccepted === 0) {
      status = InspectionStatus.FAILED;
    } else {
      status = InspectionStatus.CONDITIONALLY_PASSED;
    }

    const updated = await this.prisma.qualityInspection.update({
      where: { id },
      data: {
        status,
        quantityAccepted: dto.quantityAccepted,
        quantityRejected: dto.quantityRejected,
        overallResult: dto.overallResult || status,
        notes: dto.notes || inspection.notes,
        defectSummary: dto.defectSummary || {},
        completedAt: new Date(),
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMPLETE',
      entityType: 'QUALITY_INSPECTION',
      entityId: id,
      newValues: { status, quantityAccepted: dto.quantityAccepted, quantityRejected: dto.quantityRejected },
    });

    this.logger.log(`Completed inspection ${inspection.inspectionNumber}: ${status}`);
    return updated;
  }

  /**
   * Approve inspection
   */
  async approve(organizationId: string, id: string, userId: string) {
    const inspection = await this.findOne(organizationId, id);

    if (!['PASSED', 'CONDITIONALLY_PASSED'].includes(inspection.status)) {
      throw new BadRequestException('Only passed inspections can be approved');
    }

    const updated = await this.prisma.qualityInspection.update({
      where: { id },
      data: {
        approvedById: userId,
        approvedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * Cancel inspection
   */
  async cancel(organizationId: string, id: string, reason: string, userId: string) {
    const inspection = await this.findOne(organizationId, id);

    if (['PASSED', 'FAILED', 'CANCELLED'].includes(inspection.status)) {
      throw new BadRequestException(`Cannot cancel ${inspection.status} inspection`);
    }

    const updated = await this.prisma.qualityInspection.update({
      where: { id },
      data: {
        status: InspectionStatus.CANCELLED,
        notes: inspection.notes
          ? `${inspection.notes}\n\nCANCELLED: ${reason}`
          : `CANCELLED: ${reason}`,
      },
    });

    this.logger.log(`Cancelled inspection ${inspection.inspectionNumber}: ${reason}`);
    return updated;
  }

  /**
   * Get inspection statistics
   */
  async getStatistics(organizationId: string, fromDate: Date, toDate: Date) {
    const inspections = await this.prisma.qualityInspection.findMany({
      where: {
        organizationId,
        completedAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    const total = inspections.length;
    const passed = inspections.filter(i => i.status === 'PASSED').length;
    const failed = inspections.filter(i => i.status === 'FAILED').length;
    const conditional = inspections.filter(i => i.status === 'CONDITIONALLY_PASSED').length;

    const totalInspected = inspections.reduce((sum, i) => sum + i.quantityInspected, 0);
    const totalAccepted = inspections.reduce((sum, i) => sum + i.quantityAccepted, 0);
    const totalRejected = inspections.reduce((sum, i) => sum + i.quantityRejected, 0);

    return {
      period: { fromDate, toDate },
      inspections: {
        total,
        passed,
        failed,
        conditionallyPassed: conditional,
        passRate: total > 0 ? Math.round((passed / total) * 100) : 100,
      },
      quantities: {
        totalInspected,
        totalAccepted,
        totalRejected,
        acceptanceRate: totalInspected > 0
          ? Math.round((totalAccepted / totalInspected) * 100)
          : 100,
      },
    };
  }
}
