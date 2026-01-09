import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  CreateFinishingProcessDto,
  UpdateFinishingProcessDto,
  FinishingProcessQueryDto,
  CreateFinishingJobDto,
  UpdateFinishingJobDto,
  StartFinishingJobDto,
  CompleteFinishingJobDto,
  ShipToVendorDto,
  ReceiveFromVendorDto,
  FinishingJobQueryDto,
  FinishStatus,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class FinishingService {
  private readonly logger = new Logger(FinishingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================================
  // FINISHING PROCESSES
  // ==========================================================================

  async createProcess(organizationId: string, dto: CreateFinishingProcessDto, userId: string) {
    // Check for duplicate code
    const existing = await this.prisma.finishingProcess.findFirst({
      where: { organizationId, code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Process code ${dto.code} already exists`);
    }

    const process = await this.prisma.finishingProcess.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        finishType: dto.finishType,
        isOutsourced: dto.isOutsourced || false,
        vendorId: dto.vendorId,
        leadTimeDays: dto.leadTimeDays,
        basePrice: dto.basePrice,
        pricePerSqFt: dto.pricePerSqFt,
        pricePerUnit: dto.pricePerUnit,
        minimumCharge: dto.minimumCharge,
        specifications: dto.specifications || {},
        colorOptions: dto.colorOptions || [],
        inspectionRequired: dto.inspectionRequired ?? true,
        certificationRequired: dto.certificationRequired || false,
      },
    });

    this.logger.log(`Created finishing process ${dto.code}`);
    return process;
  }

  async findAllProcesses(organizationId: string, query: FinishingProcessQueryDto) {
    const { finishType, isOutsourced, isActive, search, page = 1, limit = 20 } = query;

    const where: Prisma.FinishingProcessWhereInput = {
      organizationId,
      ...(finishType && { finishType }),
      ...(isOutsourced !== undefined && { isOutsourced }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [processes, total] = await Promise.all([
      this.prisma.finishingProcess.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.finishingProcess.count({ where }),
    ]);

    return { data: processes, total, page, limit };
  }

  async findOneProcess(organizationId: string, id: string) {
    const process = await this.prisma.finishingProcess.findFirst({
      where: { id, organizationId },
    });

    if (!process) {
      throw new NotFoundException(`Finishing process ${id} not found`);
    }

    return process;
  }

  async updateProcess(organizationId: string, id: string, dto: UpdateFinishingProcessDto) {
    await this.findOneProcess(organizationId, id);

    return this.prisma.finishingProcess.update({
      where: { id },
      data: dto,
    });
  }

  // ==========================================================================
  // FINISHING JOBS
  // ==========================================================================

  private async generateJobNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `FIN${year}`;

    const lastJob = await this.prisma.finishingJob.findFirst({
      where: {
        organizationId,
        jobNumber: { startsWith: prefix },
      },
      orderBy: { jobNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastJob) {
      const lastNum = parseInt(lastJob.jobNumber.slice(5), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  async createJob(organizationId: string, dto: CreateFinishingJobDto, userId: string) {
    const jobNumber = await this.generateJobNumber(organizationId);

    // Get process to check if outsourced
    const process = await this.findOneProcess(organizationId, dto.processId);

    const job = await this.prisma.finishingJob.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        jobNumber,
        workOrderId: dto.workOrderId,
        orderLineId: dto.orderLineId,
        partId: dto.partId,
        processId: dto.processId,
        quantity: dto.quantity,
        colorCode: dto.colorCode,
        colorName: dto.colorName,
        thickness: dto.thickness,
        specialInstructions: dto.specialInstructions,
        priority: dto.priority || 0,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
        isOutsourced: dto.isOutsourced ?? process.isOutsourced,
        vendorId: dto.vendorId || process.vendorId,
        estimatedCost: dto.estimatedCost,
        inspectionRequired: process.inspectionRequired,
        notes: dto.notes,
        createdById: userId,
      },
      include: {
        part: { select: { partNumber: true, description: true } },
        process: { select: { code: true, name: true, finishType: true } },
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'FINISHING_JOB',
      entityId: job.id,
      newValues: { jobNumber, processId: dto.processId, quantity: dto.quantity },
    });

    this.logger.log(`Created finishing job ${jobNumber}`);
    return job;
  }

  async findAllJobs(organizationId: string, query: FinishingJobQueryDto) {
    const {
      facilityId,
      workOrderId,
      partId,
      processId,
      status,
      isOutsourced,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.FinishingJobWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(workOrderId && { workOrderId }),
      ...(partId && { partId }),
      ...(processId && { processId }),
      ...(status && { status }),
      ...(isOutsourced !== undefined && { isOutsourced }),
      ...(fromDate && { createdAt: { gte: new Date(fromDate) } }),
      ...(toDate && { createdAt: { lte: new Date(toDate) } }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.finishingJob.findMany({
        where,
        include: {
          part: { select: { partNumber: true, description: true } },
          process: { select: { code: true, name: true, finishType: true } },
          workOrder: { select: { workOrderNumber: true } },
        },
        orderBy: [{ priority: 'desc' }, { scheduledDate: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.finishingJob.count({ where }),
    ]);

    return { data: jobs, total, page, limit };
  }

  async findOneJob(organizationId: string, id: string) {
    const job = await this.prisma.finishingJob.findFirst({
      where: { id, organizationId },
      include: {
        facility: { select: { name: true, code: true } },
        part: { select: { partNumber: true, description: true } },
        process: true,
        workOrder: { select: { workOrderNumber: true } },
        orderLine: { select: { lineNumber: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!job) {
      throw new NotFoundException(`Finishing job ${id} not found`);
    }

    return job;
  }

  async updateJob(organizationId: string, id: string, dto: UpdateFinishingJobDto, userId: string) {
    const existing = await this.findOneJob(organizationId, id);

    if (['COMPLETE', 'FAILED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot update ${existing.status} job`);
    }

    return this.prisma.finishingJob.update({
      where: { id },
      data: dto,
    });
  }

  async startJob(organizationId: string, id: string, dto: StartFinishingJobDto, userId: string) {
    const job = await this.findOneJob(organizationId, id);

    if (!['PENDING', 'IN_QUEUE'].includes(job.status)) {
      throw new BadRequestException(`Job must be PENDING or IN_QUEUE to start`);
    }

    const updated = await this.prisma.finishingJob.update({
      where: { id },
      data: {
        status: FinishStatus.IN_PROCESS,
        startedAt: new Date(),
        lotNumber: dto.lotNumber,
        batchNumber: dto.batchNumber,
      },
    });

    this.logger.log(`Started finishing job ${job.jobNumber}`);
    return updated;
  }

  async completeJob(organizationId: string, id: string, dto: CompleteFinishingJobDto, userId: string) {
    const job = await this.findOneJob(organizationId, id);

    if (!['IN_PROCESS', 'CURING'].includes(job.status)) {
      throw new BadRequestException(`Job must be IN_PROCESS or CURING to complete`);
    }

    const status = dto.inspectionPassed === false ? FinishStatus.FAILED : FinishStatus.COMPLETE;

    const updated = await this.prisma.finishingJob.update({
      where: { id },
      data: {
        status,
        quantityComplete: dto.quantityComplete,
        quantityRejected: dto.quantityRejected || 0,
        actualCost: dto.actualCost,
        inspectionPassed: dto.inspectionPassed,
        completedAt: new Date(),
        notes: dto.notes || job.notes,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'COMPLETE',
      entityType: 'FINISHING_JOB',
      entityId: id,
      newValues: { status, quantityComplete: dto.quantityComplete },
    });

    this.logger.log(`Completed finishing job ${job.jobNumber}: ${status}`);
    return updated;
  }

  async shipToVendor(organizationId: string, id: string, dto: ShipToVendorDto, userId: string) {
    const job = await this.findOneJob(organizationId, id);

    if (!job.isOutsourced) {
      throw new BadRequestException('Job is not outsourced');
    }

    if (!['PENDING', 'IN_QUEUE'].includes(job.status)) {
      throw new BadRequestException(`Job must be PENDING or IN_QUEUE to ship`);
    }

    const updated = await this.prisma.finishingJob.update({
      where: { id },
      data: {
        status: FinishStatus.IN_PROCESS,
        vendorPONumber: dto.vendorPONumber,
        shippedToVendorAt: new Date(),
        notes: dto.notes || job.notes,
      },
    });

    this.logger.log(`Shipped finishing job ${job.jobNumber} to vendor`);
    return updated;
  }

  async receiveFromVendor(organizationId: string, id: string, dto: ReceiveFromVendorDto, userId: string) {
    const job = await this.findOneJob(organizationId, id);

    if (!job.isOutsourced) {
      throw new BadRequestException('Job is not outsourced');
    }

    if (job.status !== 'IN_PROCESS') {
      throw new BadRequestException('Job must be IN_PROCESS to receive');
    }

    const status = dto.inspectionPassed === false ? FinishStatus.FAILED : FinishStatus.COMPLETE;

    const updated = await this.prisma.finishingJob.update({
      where: { id },
      data: {
        status,
        quantityComplete: dto.quantityReceived,
        quantityRejected: dto.quantityRejected || 0,
        receivedFromVendorAt: new Date(),
        completedAt: new Date(),
        inspectionPassed: dto.inspectionPassed,
        notes: dto.notes || job.notes,
      },
    });

    this.logger.log(`Received finishing job ${job.jobNumber} from vendor: ${status}`);
    return updated;
  }

  async getQueue(organizationId: string, facilityId?: string) {
    const where: Prisma.FinishingJobWhereInput = {
      organizationId,
      status: { in: ['PENDING', 'IN_QUEUE', 'IN_PROCESS', 'CURING'] },
      ...(facilityId && { facilityId }),
    };

    const jobs = await this.prisma.finishingJob.findMany({
      where,
      include: {
        part: { select: { partNumber: true, description: true } },
        process: { select: { code: true, name: true, finishType: true } },
        workOrder: { select: { workOrderNumber: true } },
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return jobs;
  }
}
