// =============================================================================
// FERALIS PLATFORM - PARTS SERVICE
// =============================================================================
// Implements: PART-001 through PART-020

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Part,
  PartRevision,
  PartOperation,
  PartMaterial,
  PartStatus,
  RevisionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { QueryPartsDto } from './dto/query-parts.dto';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { CreateOperationDto } from './dto/create-operation.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import { CreateMaterialDto } from './dto/create-material.dto';

export interface PaginatedParts {
  items: Part[];
  total: number;
  page: number;
  limit: number;
}

export interface PartWithRelations extends Part {
  customer?: { id: string; code: string; name: string };
  revisions?: PartRevision[];
  operations?: PartOperation[];
  materials?: PartMaterial[];
}

@Injectable()
export class PartsService {
  private readonly logger = new Logger(PartsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================================================
  // PART-001: Create Part
  // ===========================================================================

  async create(
    createPartDto: CreatePartDto,
    organizationId: string,
    userId?: string,
  ): Promise<Part> {
    // Check if part number already exists
    const existingPart = await this.prisma.part.findFirst({
      where: {
        organizationId,
        partNumber: createPartDto.partNumber.toUpperCase(),
        deletedAt: null,
      },
    });

    if (existingPart) {
      throw new ConflictException('A part with this number already exists');
    }

    // Validate customer if provided
    if (createPartDto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: createPartDto.customerId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!customer) {
        throw new BadRequestException('Invalid customer');
      }
    }

    const part = await this.prisma.part.create({
      data: {
        ...createPartDto,
        organizationId,
        partNumber: createPartDto.partNumber.toUpperCase(),
        createdBy: userId,
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'PART_CREATED',
      entityType: 'Part',
      entityId: part.id,
      entityName: `${part.partNumber} - ${part.name}`,
      newValues: part,
      userId,
      organizationId,
    });

    return part;
  }

  // ===========================================================================
  // PART-002: Query Parts
  // ===========================================================================

  async findAll(
    organizationId: string,
    query: QueryPartsDto,
  ): Promise<PaginatedParts> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      partType,
      processType,
      customerId,
      productLine,
      productFamily,
      tags,
      sortBy = 'partNumber',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.PartWhereInput = {
      organizationId,
      deletedAt: null,
    };

    // Search across multiple fields
    if (search) {
      where.OR = [
        { partNumber: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { customerPartNumber: { contains: search, mode: 'insensitive' } },
        { materialSpec: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (partType) {
      where.partType = partType;
    }

    if (processType) {
      where.processType = processType;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (productLine) {
      where.productLine = productLine;
    }

    if (productFamily) {
      where.productFamily = productFamily;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const orderBy: Prisma.PartOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      this.prisma.part.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: {
            select: { id: true, code: true, name: true },
          },
          _count: {
            select: { revisions: true, operations: true, materials: true },
          },
        },
      }),
      this.prisma.part.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ===========================================================================
  // PART-003: Get Part by ID
  // ===========================================================================

  async findOne(id: string, organizationId: string): Promise<PartWithRelations> {
    const part = await this.prisma.part.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
        revisions: {
          orderBy: { createdAt: 'desc' },
        },
        operations: {
          where: { isActive: true },
          orderBy: { operationNumber: 'asc' },
        },
        materials: {
          where: { isActive: true },
          orderBy: { lineNumber: 'asc' },
        },
      },
    });

    if (!part) {
      throw new NotFoundException('Part not found');
    }

    return part;
  }

  // ===========================================================================
  // PART-004: Update Part
  // ===========================================================================

  async update(
    id: string,
    organizationId: string,
    updatePartDto: UpdatePartDto,
    userId?: string,
  ): Promise<Part> {
    const existing = await this.findOne(id, organizationId);

    // Check part number uniqueness if being changed
    if (
      updatePartDto.partNumber &&
      updatePartDto.partNumber.toUpperCase() !== existing.partNumber
    ) {
      const duplicatePartNumber = await this.prisma.part.findFirst({
        where: {
          organizationId,
          partNumber: updatePartDto.partNumber.toUpperCase(),
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicatePartNumber) {
        throw new ConflictException('A part with this number already exists');
      }
    }

    // Validate customer if changed
    if (
      updatePartDto.customerId &&
      updatePartDto.customerId !== existing.customerId
    ) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: updatePartDto.customerId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!customer) {
        throw new BadRequestException('Invalid customer');
      }
    }

    const part = await this.prisma.part.update({
      where: { id },
      data: {
        ...updatePartDto,
        partNumber: updatePartDto.partNumber?.toUpperCase(),
        updatedBy: userId,
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Audit log with change tracking
    await this.auditService.logChange(
      'PART_UPDATED',
      'Part',
      id,
      existing,
      part,
      { userId, organizationId },
    );

    return part;
  }

  // ===========================================================================
  // PART-005: Delete Part (Soft Delete)
  // ===========================================================================

  async remove(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<void> {
    const part = await this.findOne(id, organizationId);

    // Check for active orders/quotes (would be added in Phase 3)
    // For now, allow deletion

    await this.prisma.part.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        status: PartStatus.DISCONTINUED,
      },
    });

    await this.auditService.log({
      action: 'PART_DELETED',
      entityType: 'Part',
      entityId: id,
      entityName: `${part.partNumber} - ${part.name}`,
      userId,
      organizationId,
    });
  }

  // ===========================================================================
  // PART-006: Update Part Status
  // ===========================================================================

  async updateStatus(
    id: string,
    organizationId: string,
    status: PartStatus,
    userId?: string,
  ): Promise<Part> {
    const existing = await this.findOne(id, organizationId);

    // Validate status transitions
    const validTransitions: Record<PartStatus, PartStatus[]> = {
      [PartStatus.DRAFT]: [PartStatus.PENDING_APPROVAL, PartStatus.ACTIVE],
      [PartStatus.PENDING_APPROVAL]: [PartStatus.ACTIVE, PartStatus.DRAFT],
      [PartStatus.ACTIVE]: [PartStatus.ON_HOLD, PartStatus.OBSOLETE],
      [PartStatus.ON_HOLD]: [PartStatus.ACTIVE, PartStatus.OBSOLETE],
      [PartStatus.OBSOLETE]: [PartStatus.DISCONTINUED],
      [PartStatus.DISCONTINUED]: [],
    };

    if (!validTransitions[existing.status]?.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${existing.status} to ${status}`,
      );
    }

    const part = await this.prisma.part.update({
      where: { id },
      data: {
        status,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'PART_STATUS_CHANGED',
      entityType: 'Part',
      entityId: id,
      entityName: `${part.partNumber} - ${part.name}`,
      oldValues: { status: existing.status },
      newValues: { status },
      userId,
      organizationId,
    });

    return part;
  }

  // ===========================================================================
  // PART-007: Create Revision
  // ===========================================================================

  async createRevision(
    partId: string,
    organizationId: string,
    createRevisionDto: CreateRevisionDto,
    userId?: string,
  ): Promise<PartRevision> {
    const part = await this.findOne(partId, organizationId);

    // Check if revision already exists
    const existingRevision = await this.prisma.partRevision.findFirst({
      where: {
        partId,
        revision: createRevisionDto.revision.toUpperCase(),
      },
    });

    if (existingRevision) {
      throw new ConflictException(
        `Revision ${createRevisionDto.revision} already exists`,
      );
    }

    const revision = await this.prisma.partRevision.create({
      data: {
        ...createRevisionDto,
        partId,
        revision: createRevisionDto.revision.toUpperCase(),
        createdBy: userId,
      },
    });

    await this.auditService.log({
      action: 'PART_REVISION_CREATED',
      entityType: 'PartRevision',
      entityId: revision.id,
      entityName: `${part.partNumber} Rev ${revision.revision}`,
      newValues: revision,
      metadata: { partId, partNumber: part.partNumber },
      userId,
      organizationId,
    });

    return revision;
  }

  // ===========================================================================
  // PART-008: Approve Revision
  // ===========================================================================

  async approveRevision(
    partId: string,
    revisionId: string,
    organizationId: string,
    approvalNotes?: string,
    userId?: string,
  ): Promise<PartRevision> {
    const part = await this.findOne(partId, organizationId);

    const revision = await this.prisma.partRevision.findFirst({
      where: { id: revisionId, partId },
    });

    if (!revision) {
      throw new NotFoundException('Revision not found');
    }

    if (revision.status !== RevisionStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        'Only revisions in PENDING_REVIEW status can be approved',
      );
    }

    // Supersede previous approved revision
    await this.prisma.partRevision.updateMany({
      where: {
        partId,
        status: RevisionStatus.APPROVED,
        id: { not: revisionId },
      },
      data: { status: RevisionStatus.SUPERSEDED },
    });

    // Approve the new revision
    const approvedRevision = await this.prisma.partRevision.update({
      where: { id: revisionId },
      data: {
        status: RevisionStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
        approvalNotes,
        effectiveDate: new Date(),
      },
    });

    // Update part's current revision
    await this.prisma.part.update({
      where: { id: partId },
      data: {
        currentRevisionId: revisionId,
        currentRevision: approvedRevision.revision,
      },
    });

    await this.auditService.log({
      action: 'PART_REVISION_APPROVED',
      entityType: 'PartRevision',
      entityId: revisionId,
      entityName: `${part.partNumber} Rev ${approvedRevision.revision}`,
      newValues: { status: RevisionStatus.APPROVED, approvedBy: userId },
      metadata: { partId, partNumber: part.partNumber },
      userId,
      organizationId,
    });

    return approvedRevision;
  }

  // ===========================================================================
  // PART-009: Create Operation
  // ===========================================================================

  async createOperation(
    partId: string,
    organizationId: string,
    createOperationDto: CreateOperationDto,
    userId?: string,
  ): Promise<PartOperation> {
    const part = await this.findOne(partId, organizationId);

    // Check if operation number already exists
    const existingOperation = await this.prisma.partOperation.findFirst({
      where: {
        partId,
        operationNumber: createOperationDto.operationNumber,
        isActive: true,
      },
    });

    if (existingOperation) {
      throw new ConflictException(
        `Operation ${createOperationDto.operationNumber} already exists`,
      );
    }

    const operation = await this.prisma.partOperation.create({
      data: {
        ...createOperationDto,
        partId,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      action: 'PART_OPERATION_CREATED',
      entityType: 'PartOperation',
      entityId: operation.id,
      entityName: `Op ${operation.operationNumber}: ${operation.name}`,
      newValues: operation,
      metadata: { partId, partNumber: part.partNumber },
      userId,
      organizationId,
    });

    return operation;
  }

  // ===========================================================================
  // PART-010: Update Operation
  // ===========================================================================

  async updateOperation(
    partId: string,
    operationId: string,
    organizationId: string,
    updateOperationDto: UpdateOperationDto,
    userId?: string,
  ): Promise<PartOperation> {
    await this.findOne(partId, organizationId);

    const existing = await this.prisma.partOperation.findFirst({
      where: { id: operationId, partId },
    });

    if (!existing) {
      throw new NotFoundException('Operation not found');
    }

    // Check operation number uniqueness if changed
    if (
      updateOperationDto.operationNumber &&
      updateOperationDto.operationNumber !== existing.operationNumber
    ) {
      const duplicate = await this.prisma.partOperation.findFirst({
        where: {
          partId,
          operationNumber: updateOperationDto.operationNumber,
          id: { not: operationId },
          isActive: true,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Operation ${updateOperationDto.operationNumber} already exists`,
        );
      }
    }

    const operation = await this.prisma.partOperation.update({
      where: { id: operationId },
      data: updateOperationDto,
    });

    return operation;
  }

  // ===========================================================================
  // PART-011: Delete Operation
  // ===========================================================================

  async removeOperation(
    partId: string,
    operationId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(partId, organizationId);

    const operation = await this.prisma.partOperation.findFirst({
      where: { id: operationId, partId },
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    await this.prisma.partOperation.update({
      where: { id: operationId },
      data: { isActive: false },
    });
  }

  // ===========================================================================
  // PART-012: Create Material
  // ===========================================================================

  async createMaterial(
    partId: string,
    organizationId: string,
    createMaterialDto: CreateMaterialDto,
    userId?: string,
  ): Promise<PartMaterial> {
    const part = await this.findOne(partId, organizationId);

    // Get next line number if not provided
    let lineNumber = createMaterialDto.lineNumber;
    if (!lineNumber) {
      const lastMaterial = await this.prisma.partMaterial.findFirst({
        where: { partId },
        orderBy: { lineNumber: 'desc' },
      });
      lineNumber = (lastMaterial?.lineNumber || 0) + 10;
    }

    // Check if line number already exists
    const existingMaterial = await this.prisma.partMaterial.findFirst({
      where: {
        partId,
        lineNumber,
        isActive: true,
      },
    });

    if (existingMaterial) {
      throw new ConflictException(`Line ${lineNumber} already exists`);
    }

    const material = await this.prisma.partMaterial.create({
      data: {
        ...createMaterialDto,
        partId,
        lineNumber,
        createdBy: userId,
      },
    });

    return material;
  }

  // ===========================================================================
  // PART-013: Update Material
  // ===========================================================================

  async updateMaterial(
    partId: string,
    materialId: string,
    organizationId: string,
    updateData: Partial<CreateMaterialDto>,
    userId?: string,
  ): Promise<PartMaterial> {
    await this.findOne(partId, organizationId);

    const existing = await this.prisma.partMaterial.findFirst({
      where: { id: materialId, partId },
    });

    if (!existing) {
      throw new NotFoundException('Material not found');
    }

    const material = await this.prisma.partMaterial.update({
      where: { id: materialId },
      data: updateData,
    });

    return material;
  }

  // ===========================================================================
  // PART-014: Delete Material
  // ===========================================================================

  async removeMaterial(
    partId: string,
    materialId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(partId, organizationId);

    const material = await this.prisma.partMaterial.findFirst({
      where: { id: materialId, partId },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    await this.prisma.partMaterial.update({
      where: { id: materialId },
      data: { isActive: false },
    });
  }

  // ===========================================================================
  // PART-015: Copy Part
  // ===========================================================================

  async copyPart(
    id: string,
    organizationId: string,
    newPartNumber: string,
    newName?: string,
    includeOperations = true,
    includeMaterials = true,
    userId?: string,
  ): Promise<Part> {
    const source = await this.findOne(id, organizationId);

    // Check if new part number exists
    const existing = await this.prisma.part.findFirst({
      where: {
        organizationId,
        partNumber: newPartNumber.toUpperCase(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new ConflictException('A part with this number already exists');
    }

    // Create the new part
    const { 
      id: _, 
      createdAt: _ca, 
      updatedAt: _ua, 
      createdBy: _cb, 
      updatedBy: _ub,
      deletedAt: _da,
      deletedBy: _db,
      currentRevisionId: _cri,
      currentRevision: _cr,
      ...partData 
    } = source;

    const newPart = await this.prisma.part.create({
      data: {
        ...partData,
        partNumber: newPartNumber.toUpperCase(),
        name: newName || `${source.name} (Copy)`,
        status: PartStatus.DRAFT,
        createdBy: userId,
      },
    });

    // Copy operations if requested
    if (includeOperations && source.operations) {
      for (const op of source.operations) {
        const { 
          id: _id, 
          partId: _pid, 
          createdAt: _cat, 
          updatedAt: _uat,
          createdBy: _cby,
          ...opData 
        } = op;
        
        await this.prisma.partOperation.create({
          data: {
            ...opData,
            partId: newPart.id,
            createdBy: userId,
          },
        });
      }
    }

    // Copy materials if requested
    if (includeMaterials && source.materials) {
      for (const mat of source.materials) {
        const { 
          id: _id, 
          partId: _pid, 
          createdAt: _cat, 
          updatedAt: _uat,
          createdBy: _cby,
          ...matData 
        } = mat;
        
        await this.prisma.partMaterial.create({
          data: {
            ...matData,
            partId: newPart.id,
            createdBy: userId,
          },
        });
      }
    }

    await this.auditService.log({
      action: 'PART_COPIED',
      entityType: 'Part',
      entityId: newPart.id,
      entityName: `${newPart.partNumber} - ${newPart.name}`,
      metadata: { 
        sourcePartId: id, 
        sourcePartNumber: source.partNumber,
        includeOperations,
        includeMaterials,
      },
      userId,
      organizationId,
    });

    return newPart;
  }

  // ===========================================================================
  // Helper: Find by Part Number
  // ===========================================================================

  async findByPartNumber(
    partNumber: string,
    organizationId: string,
  ): Promise<Part | null> {
    return this.prisma.part.findFirst({
      where: {
        organizationId,
        partNumber: partNumber.toUpperCase(),
        deletedAt: null,
      },
    });
  }

  // ===========================================================================
  // Helper: Get Active Parts for Dropdown
  // ===========================================================================

  async getActivePartsForSelect(
    organizationId: string,
    customerId?: string,
  ): Promise<{ id: string; partNumber: string; name: string }[]> {
    return this.prisma.part.findMany({
      where: {
        organizationId,
        status: PartStatus.ACTIVE,
        deletedAt: null,
        ...(customerId && { customerId }),
      },
      select: {
        id: true,
        partNumber: true,
        name: true,
      },
      orderBy: { partNumber: 'asc' },
    });
  }

  // ===========================================================================
  // Helper: Calculate Part Cost
  // ===========================================================================

  async calculateCost(
    partId: string,
    organizationId: string,
    quantity: number = 1,
  ): Promise<{
    materialCost: number;
    laborCost: number;
    machineCost: number;
    outsideCost: number;
    totalCost: number;
    unitCost: number;
  }> {
    const part = await this.findOne(partId, organizationId);

    let materialCost = 0;
    let laborCost = 0;
    let machineCost = 0;
    let outsideCost = 0;

    // Calculate material costs
    if (part.materials) {
      for (const mat of part.materials) {
        const unitCost = mat.unitCost ? Number(mat.unitCost) : 0;
        const qty = Number(mat.quantityPer) * quantity;
        const scrap = mat.scrapFactor ? Number(mat.scrapFactor) : 0;
        materialCost += unitCost * qty * (1 + scrap);
      }
    }

    // Calculate operation costs
    if (part.operations) {
      for (const op of part.operations) {
        if (op.isOutsideProcess) {
          outsideCost += op.outsideCost ? Number(op.outsideCost) * quantity : 0;
        } else {
          // Setup cost (one-time)
          const setupTime = op.setupTime ? Number(op.setupTime) : 0;
          const laborRate = op.laborRate ? Number(op.laborRate) : 50; // Default rate
          const machineRate = op.machineRate ? Number(op.machineRate) : 75;
          const laborCount = op.laborCount || 1;

          laborCost += (setupTime / 60) * laborRate * laborCount;
          machineCost += (setupTime / 60) * machineRate;

          // Run cost (per unit)
          const runTime = op.runTimePerUnit ? Number(op.runTimePerUnit) : 0;
          laborCost += (runTime / 60) * laborRate * laborCount * quantity;
          machineCost += (runTime / 60) * machineRate * quantity;
        }
      }
    }

    const totalCost = materialCost + laborCost + machineCost + outsideCost;
    const unitCost = quantity > 0 ? totalCost / quantity : 0;

    return {
      materialCost: Math.round(materialCost * 100) / 100,
      laborCost: Math.round(laborCost * 100) / 100,
      machineCost: Math.round(machineCost * 100) / 100,
      outsideCost: Math.round(outsideCost * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      unitCost: Math.round(unitCost * 100) / 100,
    };
  }
}
