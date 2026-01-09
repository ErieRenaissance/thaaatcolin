import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateNCRDto,
  UpdateNCRDto,
  DispositionNCRDto,
  RecordMRBDto,
  NCRQueryDto,
  NCRStatus,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class NCRService {
  private readonly logger = new Logger(NCRService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate NCR number
   */
  private async generateNCRNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `NCR${year}`;

    const lastNCR = await this.prisma.nonConformanceReport.findFirst({
      where: {
        organizationId,
        ncrNumber: { startsWith: prefix },
      },
      orderBy: { ncrNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastNCR) {
      const lastNum = parseInt(lastNCR.ncrNumber.slice(5), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  /**
   * Create NCR
   */
  async create(organizationId: string, dto: CreateNCRDto, userId: string) {
    const ncrNumber = await this.generateNCRNumber(organizationId);

    const ncr = await this.prisma.nonConformanceReport.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        ncrNumber,
        title: dto.title,
        severity: dto.severity,
        sourceType: dto.sourceType,
        inspectionId: dto.inspectionId,
        workOrderId: dto.workOrderId,
        operationId: dto.operationId,
        customerId: dto.customerId,
        partId: dto.partId,
        partRevisionId: dto.partRevisionId,
        lotNumber: dto.lotNumber,
        serialNumbers: dto.serialNumbers || [],
        quantityAffected: dto.quantityAffected,
        quantityOnHold: dto.quantityAffected,
        description: dto.description,
        containmentAction: dto.containmentAction,
        requiresMRB: dto.requiresMRB || false,
        targetCloseDate: dto.targetCloseDate ? new Date(dto.targetCloseDate) : undefined,
        photoUrls: dto.photoUrls || [],
        reportedById: userId,
        assignedToId: dto.assignedToId,
      },
      include: {
        part: { select: { partNumber: true, description: true } },
        workOrder: { select: { workOrderNumber: true } },
        reportedBy: { select: { firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'NCR',
      entityId: ncr.id,
      newValues: { ncrNumber, severity: dto.severity, quantityAffected: dto.quantityAffected },
    });

    this.logger.log(`Created NCR ${ncrNumber} - ${dto.severity}`);
    return ncr;
  }

  /**
   * Find all NCRs
   */
  async findAll(organizationId: string, query: NCRQueryDto) {
    const {
      facilityId,
      partId,
      workOrderId,
      customerId,
      status,
      severity,
      assignedToId,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.NonConformanceReportWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(partId && { partId }),
      ...(workOrderId && { workOrderId }),
      ...(customerId && { customerId }),
      ...(status && { status }),
      ...(severity && { severity }),
      ...(assignedToId && { assignedToId }),
      ...(fromDate && { createdAt: { gte: new Date(fromDate) } }),
      ...(toDate && { createdAt: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { ncrNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [ncrs, total] = await Promise.all([
      this.prisma.nonConformanceReport.findMany({
        where,
        include: {
          part: { select: { partNumber: true, description: true } },
          workOrder: { select: { workOrderNumber: true } },
          customer: { select: { name: true, code: true } },
          reportedBy: { select: { firstName: true, lastName: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.nonConformanceReport.count({ where }),
    ]);

    return { data: ncrs, total, page, limit };
  }

  /**
   * Find one NCR
   */
  async findOne(organizationId: string, id: string) {
    const ncr = await this.prisma.nonConformanceReport.findFirst({
      where: { id, organizationId },
      include: {
        facility: { select: { name: true, code: true } },
        part: { select: { partNumber: true, description: true } },
        partRevision: { select: { revision: true } },
        workOrder: { select: { workOrderNumber: true } },
        operation: { select: { operationNumber: true, name: true } },
        customer: { select: { name: true, code: true } },
        inspection: { select: { inspectionNumber: true, inspectionType: true } },
        reportedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        dispositionBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
        capas: {
          select: { id: true, capaNumber: true, type: true, status: true },
        },
      },
    });

    if (!ncr) {
      throw new NotFoundException(`NCR ${id} not found`);
    }

    return ncr;
  }

  /**
   * Update NCR
   */
  async update(organizationId: string, id: string, dto: UpdateNCRDto, userId: string) {
    const existing = await this.findOne(organizationId, id);

    if (['CLOSED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot update ${existing.status} NCR`);
    }

    const ncr = await this.prisma.nonConformanceReport.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.severity && { severity: dto.severity }),
        ...(dto.status && { status: dto.status }),
        ...(dto.description && { description: dto.description }),
        ...(dto.rootCause && { rootCause: dto.rootCause }),
        ...(dto.containmentAction && { containmentAction: dto.containmentAction }),
        ...(dto.assignedToId && { assignedToId: dto.assignedToId }),
        ...(dto.requiresMRB !== undefined && { requiresMRB: dto.requiresMRB }),
        ...(dto.targetCloseDate && { targetCloseDate: new Date(dto.targetCloseDate) }),
        ...(dto.photoUrls && { photoUrls: dto.photoUrls }),
      },
    });

    return ncr;
  }

  /**
   * Disposition NCR
   */
  async disposition(
    organizationId: string,
    id: string,
    dto: DispositionNCRDto,
    userId: string,
  ) {
    const ncr = await this.findOne(organizationId, id);

    if (!['OPEN', 'UNDER_REVIEW', 'DISPOSITION_PENDING', 'AWAITING_MRB'].includes(ncr.status)) {
      throw new BadRequestException(`Cannot disposition NCR in ${ncr.status} status`);
    }

    // Calculate total cost
    const totalCost =
      (dto.laborCost || 0) + (dto.materialCost || 0) + (dto.scrapCost || 0);

    // Determine next status based on disposition
    let nextStatus: NCRStatus;
    switch (dto.disposition) {
      case 'REWORK':
      case 'REPAIR':
        nextStatus = NCRStatus.IN_REWORK;
        break;
      case 'SCRAP':
      case 'USE_AS_IS':
      case 'RETURN_TO_VENDOR':
      case 'DEVIATE':
        nextStatus = NCRStatus.CLOSED;
        break;
      default:
        nextStatus = NCRStatus.CLOSED;
    }

    const updated = await this.prisma.nonConformanceReport.update({
      where: { id },
      data: {
        status: nextStatus,
        disposition: dto.disposition,
        dispositionNotes: dto.dispositionNotes,
        dispositionById: userId,
        dispositionAt: new Date(),
        laborCost: dto.laborCost,
        materialCost: dto.materialCost,
        scrapCost: dto.scrapCost,
        totalCost,
        quantityOnHold: dto.disposition === 'SCRAP' ? 0 : ncr.quantityOnHold,
        ...(nextStatus === NCRStatus.CLOSED && {
          closedAt: new Date(),
          closedById: userId,
        }),
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'DISPOSITION',
      entityType: 'NCR',
      entityId: id,
      newValues: { disposition: dto.disposition, totalCost },
    });

    this.logger.log(`Dispositioned NCR ${ncr.ncrNumber}: ${dto.disposition}`);
    return updated;
  }

  /**
   * Record MRB decision
   */
  async recordMRB(
    organizationId: string,
    id: string,
    dto: RecordMRBDto,
    userId: string,
  ) {
    const ncr = await this.findOne(organizationId, id);

    if (!ncr.requiresMRB) {
      throw new BadRequestException('NCR does not require MRB');
    }

    if (ncr.status !== 'AWAITING_MRB') {
      throw new BadRequestException(`NCR must be in AWAITING_MRB status`);
    }

    const updated = await this.prisma.nonConformanceReport.update({
      where: { id },
      data: {
        status: NCRStatus.DISPOSITION_PENDING,
        mrbDate: new Date(dto.mrbDate),
        mrbDecision: dto.mrbDecision,
        mrbAttendees: dto.mrbAttendees || [],
      },
    });

    this.logger.log(`Recorded MRB for NCR ${ncr.ncrNumber}`);
    return updated;
  }

  /**
   * Send NCR to MRB
   */
  async sendToMRB(organizationId: string, id: string, userId: string) {
    const ncr = await this.findOne(organizationId, id);

    if (!['OPEN', 'UNDER_REVIEW'].includes(ncr.status)) {
      throw new BadRequestException(`Cannot send to MRB from ${ncr.status} status`);
    }

    const updated = await this.prisma.nonConformanceReport.update({
      where: { id },
      data: {
        status: NCRStatus.AWAITING_MRB,
        requiresMRB: true,
      },
    });

    return updated;
  }

  /**
   * Complete rework and close NCR
   */
  async completeRework(
    organizationId: string,
    id: string,
    notes: string,
    userId: string,
  ) {
    const ncr = await this.findOne(organizationId, id);

    if (ncr.status !== 'IN_REWORK') {
      throw new BadRequestException('NCR must be in IN_REWORK status');
    }

    const updated = await this.prisma.nonConformanceReport.update({
      where: { id },
      data: {
        status: NCRStatus.CLOSED,
        quantityOnHold: 0,
        dispositionNotes: ncr.dispositionNotes
          ? `${ncr.dispositionNotes}\n\nRework completed: ${notes}`
          : `Rework completed: ${notes}`,
        closedAt: new Date(),
        closedById: userId,
      },
    });

    this.logger.log(`Completed rework and closed NCR ${ncr.ncrNumber}`);
    return updated;
  }

  /**
   * Close NCR
   */
  async close(organizationId: string, id: string, notes: string, userId: string) {
    const ncr = await this.findOne(organizationId, id);

    if (['CLOSED', 'CANCELLED'].includes(ncr.status)) {
      throw new BadRequestException(`NCR is already ${ncr.status}`);
    }

    const updated = await this.prisma.nonConformanceReport.update({
      where: { id },
      data: {
        status: NCRStatus.CLOSED,
        quantityOnHold: 0,
        dispositionNotes: ncr.dispositionNotes
          ? `${ncr.dispositionNotes}\n\nClosed: ${notes}`
          : `Closed: ${notes}`,
        closedAt: new Date(),
        closedById: userId,
      },
    });

    return updated;
  }

  /**
   * Cancel NCR
   */
  async cancel(organizationId: string, id: string, reason: string, userId: string) {
    const ncr = await this.findOne(organizationId, id);

    if (['CLOSED', 'CANCELLED'].includes(ncr.status)) {
      throw new BadRequestException(`NCR is already ${ncr.status}`);
    }

    const updated = await this.prisma.nonConformanceReport.update({
      where: { id },
      data: {
        status: NCRStatus.CANCELLED,
        quantityOnHold: 0,
        dispositionNotes: ncr.dispositionNotes
          ? `${ncr.dispositionNotes}\n\nCANCELLED: ${reason}`
          : `CANCELLED: ${reason}`,
        closedAt: new Date(),
        closedById: userId,
      },
    });

    return updated;
  }

  /**
   * Get NCR statistics
   */
  async getStatistics(organizationId: string, fromDate: Date, toDate: Date) {
    const ncrs = await this.prisma.nonConformanceReport.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    const total = ncrs.length;
    const open = ncrs.filter(n => n.status === 'OPEN').length;
    const closed = ncrs.filter(n => n.status === 'CLOSED').length;

    const bySeverity = {
      MINOR: ncrs.filter(n => n.severity === 'MINOR').length,
      MAJOR: ncrs.filter(n => n.severity === 'MAJOR').length,
      CRITICAL: ncrs.filter(n => n.severity === 'CRITICAL').length,
    };

    const byDisposition = ncrs
      .filter(n => n.disposition)
      .reduce((acc, n) => {
        acc[n.disposition!] = (acc[n.disposition!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const totalCost = ncrs.reduce(
      (sum, n) => sum + (n.totalCost?.toNumber() || 0),
      0,
    );

    const totalAffected = ncrs.reduce((sum, n) => sum + n.quantityAffected, 0);

    return {
      period: { fromDate, toDate },
      summary: { total, open, closed },
      bySeverity,
      byDisposition,
      totalCost,
      totalQuantityAffected: totalAffected,
    };
  }
}
