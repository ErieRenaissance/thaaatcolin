import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateCAPADto,
  UpdateCAPADto,
  VerifyCAPADto,
  CAPAQueryDto,
  CAPAStatus,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CAPAService {
  private readonly logger = new Logger(CAPAService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate CAPA number
   */
  private async generateCAPANumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `CAPA${year}`;

    const lastCAPA = await this.prisma.correctiveAction.findFirst({
      where: {
        organizationId,
        capaNumber: { startsWith: prefix },
      },
      orderBy: { capaNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastCAPA) {
      const lastNum = parseInt(lastCAPA.capaNumber.slice(6), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(5, '0')}`;
  }

  /**
   * Create CAPA
   */
  async create(organizationId: string, dto: CreateCAPADto, userId: string) {
    const capaNumber = await this.generateCAPANumber(organizationId);

    const capa = await this.prisma.correctiveAction.create({
      data: {
        organizationId,
        capaNumber,
        title: dto.title,
        type: dto.type,
        ncrId: dto.ncrId,
        sourceReference: dto.sourceReference,
        problemDescription: dto.problemDescription,
        immediateAction: dto.immediateAction,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        initiatedById: userId,
        assignedToId: dto.assignedToId,
        status: CAPAStatus.DRAFT,
      },
      include: {
        ncr: { select: { ncrNumber: true, title: true } },
        initiatedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'CAPA',
      entityId: capa.id,
      newValues: { capaNumber, type: dto.type },
    });

    this.logger.log(`Created CAPA ${capaNumber}`);
    return capa;
  }

  /**
   * Find all CAPAs
   */
  async findAll(organizationId: string, query: CAPAQueryDto) {
    const {
      ncrId,
      type,
      status,
      assignedToId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.CorrectiveActionWhereInput = {
      organizationId,
      ...(ncrId && { ncrId }),
      ...(type && { type }),
      ...(status && { status }),
      ...(assignedToId && { assignedToId }),
      ...(fromDate && { createdAt: { gte: new Date(fromDate) } }),
      ...(toDate && { createdAt: { lte: new Date(toDate) } }),
    };

    const [capas, total] = await Promise.all([
      this.prisma.correctiveAction.findMany({
        where,
        include: {
          ncr: { select: { ncrNumber: true, title: true } },
          initiatedBy: { select: { firstName: true, lastName: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.correctiveAction.count({ where }),
    ]);

    return { data: capas, total, page, limit };
  }

  /**
   * Find one CAPA
   */
  async findOne(organizationId: string, id: string) {
    const capa = await this.prisma.correctiveAction.findFirst({
      where: { id, organizationId },
      include: {
        ncr: {
          select: {
            ncrNumber: true,
            title: true,
            severity: true,
            description: true,
          },
        },
        initiatedBy: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!capa) {
      throw new NotFoundException(`CAPA ${id} not found`);
    }

    return capa;
  }

  /**
   * Update CAPA
   */
  async update(organizationId: string, id: string, dto: UpdateCAPADto, userId: string) {
    const existing = await this.findOne(organizationId, id);

    if (['CLOSED', 'CANCELLED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot update ${existing.status} CAPA`);
    }

    const capa = await this.prisma.correctiveAction.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.type && { type: dto.type }),
        ...(dto.status && { status: dto.status }),
        ...(dto.problemDescription && { problemDescription: dto.problemDescription }),
        ...(dto.rootCauseAnalysis && { rootCauseAnalysis: dto.rootCauseAnalysis }),
        ...(dto.immediateAction && { immediateAction: dto.immediateAction }),
        ...(dto.correctiveAction && { correctiveAction: dto.correctiveAction }),
        ...(dto.preventiveAction && { preventiveAction: dto.preventiveAction }),
        ...(dto.targetDate && { targetDate: new Date(dto.targetDate) }),
        ...(dto.assignedToId && { assignedToId: dto.assignedToId }),
      },
    });

    return capa;
  }

  /**
   * Open CAPA (submit from draft)
   */
  async open(organizationId: string, id: string, userId: string) {
    const capa = await this.findOne(organizationId, id);

    if (capa.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT CAPAs can be opened');
    }

    const updated = await this.prisma.correctiveAction.update({
      where: { id },
      data: { status: CAPAStatus.OPEN },
    });

    this.logger.log(`Opened CAPA ${capa.capaNumber}`);
    return updated;
  }

  /**
   * Start working on CAPA
   */
  async startWork(organizationId: string, id: string, userId: string) {
    const capa = await this.findOne(organizationId, id);

    if (capa.status !== 'OPEN') {
      throw new BadRequestException('Only OPEN CAPAs can be started');
    }

    const updated = await this.prisma.correctiveAction.update({
      where: { id },
      data: { status: CAPAStatus.IN_PROGRESS },
    });

    return updated;
  }

  /**
   * Complete CAPA actions
   */
  async completeActions(
    organizationId: string,
    id: string,
    dto: { correctiveAction?: string; preventiveAction?: string },
    userId: string,
  ) {
    const capa = await this.findOne(organizationId, id);

    if (capa.status !== 'IN_PROGRESS') {
      throw new BadRequestException('CAPA must be IN_PROGRESS to complete actions');
    }

    const updated = await this.prisma.correctiveAction.update({
      where: { id },
      data: {
        status: CAPAStatus.VERIFICATION,
        correctiveAction: dto.correctiveAction || capa.correctiveAction,
        preventiveAction: dto.preventiveAction || capa.preventiveAction,
        completedAt: new Date(),
      },
    });

    this.logger.log(`Completed actions for CAPA ${capa.capaNumber}`);
    return updated;
  }

  /**
   * Verify CAPA effectiveness
   */
  async verify(
    organizationId: string,
    id: string,
    dto: VerifyCAPADto,
    userId: string,
  ) {
    const capa = await this.findOne(organizationId, id);

    if (capa.status !== 'VERIFICATION') {
      throw new BadRequestException('CAPA must be in VERIFICATION status');
    }

    const updated = await this.prisma.correctiveAction.update({
      where: { id },
      data: {
        verificationMethod: dto.verificationMethod,
        verificationResult: dto.verificationResult,
        isEffective: dto.isEffective,
        effectivenessReview: dto.effectivenessReview,
        verifiedById: userId,
        verifiedAt: new Date(),
        // If effective, close; otherwise keep in verification for further action
        status: dto.isEffective ? CAPAStatus.CLOSED : CAPAStatus.IN_PROGRESS,
        ...(dto.isEffective && {
          closedAt: new Date(),
          closedById: userId,
        }),
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'VERIFY',
      entityType: 'CAPA',
      entityId: id,
      newValues: { isEffective: dto.isEffective },
    });

    this.logger.log(`Verified CAPA ${capa.capaNumber}: ${dto.isEffective ? 'EFFECTIVE' : 'NOT EFFECTIVE'}`);
    return updated;
  }

  /**
   * Close CAPA
   */
  async close(organizationId: string, id: string, notes: string, userId: string) {
    const capa = await this.findOne(organizationId, id);

    if (['CLOSED', 'CANCELLED'].includes(capa.status)) {
      throw new BadRequestException(`CAPA is already ${capa.status}`);
    }

    const updated = await this.prisma.correctiveAction.update({
      where: { id },
      data: {
        status: CAPAStatus.CLOSED,
        effectivenessReview: capa.effectivenessReview
          ? `${capa.effectivenessReview}\n\nClosed: ${notes}`
          : `Closed: ${notes}`,
        closedAt: new Date(),
        closedById: userId,
      },
    });

    return updated;
  }

  /**
   * Cancel CAPA
   */
  async cancel(organizationId: string, id: string, reason: string, userId: string) {
    const capa = await this.findOne(organizationId, id);

    if (['CLOSED', 'CANCELLED'].includes(capa.status)) {
      throw new BadRequestException(`CAPA is already ${capa.status}`);
    }

    const updated = await this.prisma.correctiveAction.update({
      where: { id },
      data: {
        status: CAPAStatus.CANCELLED,
        effectivenessReview: capa.effectivenessReview
          ? `${capa.effectivenessReview}\n\nCANCELLED: ${reason}`
          : `CANCELLED: ${reason}`,
        closedAt: new Date(),
        closedById: userId,
      },
    });

    return updated;
  }

  /**
   * Get CAPA statistics
   */
  async getStatistics(organizationId: string, fromDate: Date, toDate: Date) {
    const capas = await this.prisma.correctiveAction.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    const total = capas.length;
    const open = capas.filter(c => ['DRAFT', 'OPEN', 'IN_PROGRESS', 'VERIFICATION'].includes(c.status)).length;
    const closed = capas.filter(c => c.status === 'CLOSED').length;

    const byType = {
      CORRECTIVE: capas.filter(c => c.type === 'CORRECTIVE').length,
      PREVENTIVE: capas.filter(c => c.type === 'PREVENTIVE').length,
      BOTH: capas.filter(c => c.type === 'BOTH').length,
    };

    const verified = capas.filter(c => c.verifiedAt);
    const effective = verified.filter(c => c.isEffective === true).length;
    const effectivenessRate = verified.length > 0
      ? Math.round((effective / verified.length) * 100)
      : 100;

    // Calculate average time to close (in days)
    const closedCapas = capas.filter(c => c.closedAt);
    const avgDaysToClose = closedCapas.length > 0
      ? Math.round(
          closedCapas.reduce((sum, c) => {
            const days = (c.closedAt!.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return sum + days;
          }, 0) / closedCapas.length
        )
      : 0;

    return {
      period: { fromDate, toDate },
      summary: { total, open, closed },
      byType,
      effectivenessRate,
      avgDaysToClose,
    };
  }
}
