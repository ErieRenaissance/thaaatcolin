import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from './audit/audit.service';
import {
  CreatePackageSpecDto,
  UpdatePackageSpecDto,
  PackageSpecQueryDto,
  CreatePartPackagingDto,
  UpdatePartPackagingDto,
  CreatePackageDto,
  UpdatePackageDto,
  SealPackageDto,
  AddPackageContentDto,
  PackageQueryDto,
  PackageStatus,
} from './packaging/dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PackagingService {
  private readonly logger = new Logger(PackagingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================================
  // PACKAGE SPECIFICATIONS
  // ==========================================================================

  async createSpec(organizationId: string, dto: CreatePackageSpecDto) {
    const existing = await this.prisma.packageSpecification.findFirst({
      where: { organizationId, code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Package spec code ${dto.code} already exists`);
    }

    const spec = await this.prisma.packageSpecification.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        packageType: dto.packageType,
        lengthInches: dto.lengthInches,
        widthInches: dto.widthInches,
        heightInches: dto.heightInches,
        maxWeightLbs: dto.maxWeightLbs,
        tareWeightLbs: dto.tareWeightLbs,
        unitCost: dto.unitCost,
        materialType: dto.materialType,
        requiresDunnage: dto.requiresDunnage || false,
        dunnageType: dto.dunnageType,
        isReturnable: dto.isReturnable || false,
        specifications: dto.specifications || {},
      },
    });

    this.logger.log(`Created package spec ${dto.code}`);
    return spec;
  }

  async findAllSpecs(organizationId: string, query: PackageSpecQueryDto) {
    const { packageType, isReturnable, isActive, search, page = 1, limit = 20 } = query;

    const where: Prisma.PackageSpecificationWhereInput = {
      organizationId,
      ...(packageType && { packageType }),
      ...(isReturnable !== undefined && { isReturnable }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [specs, total] = await Promise.all([
      this.prisma.packageSpecification.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.packageSpecification.count({ where }),
    ]);

    return { data: specs, total, page, limit };
  }

  async findOneSpec(organizationId: string, id: string) {
    const spec = await this.prisma.packageSpecification.findFirst({
      where: { id, organizationId },
    });

    if (!spec) {
      throw new NotFoundException(`Package spec ${id} not found`);
    }

    return spec;
  }

  async updateSpec(organizationId: string, id: string, dto: UpdatePackageSpecDto) {
    await this.findOneSpec(organizationId, id);

    return this.prisma.packageSpecification.update({
      where: { id },
      data: dto,
    });
  }

  // ==========================================================================
  // PART PACKAGING
  // ==========================================================================

  async createPartPackaging(organizationId: string, dto: CreatePartPackagingDto) {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.partPackaging.updateMany({
        where: {
          organizationId,
          partId: dto.partId,
          customerId: dto.customerId || null,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const partPackaging = await this.prisma.partPackaging.create({
      data: {
        organizationId,
        partId: dto.partId,
        customerId: dto.customerId,
        packageSpecId: dto.packageSpecId,
        quantityPerPackage: dto.quantityPerPackage,
        isDefault: dto.isDefault || false,
        packingInstructions: dto.packingInstructions,
        labelingRequired: dto.labelingRequired || {},
      },
      include: {
        part: { select: { partNumber: true } },
        packageSpec: { select: { code: true, name: true } },
      },
    });

    return partPackaging;
  }

  async findPartPackaging(organizationId: string, partId: string, customerId?: string) {
    const where: Prisma.PartPackagingWhereInput = {
      organizationId,
      partId,
    };

    if (customerId) {
      // Look for customer-specific, then fall back to general
      const customerSpecific = await this.prisma.partPackaging.findFirst({
        where: { ...where, customerId },
        include: {
          packageSpec: true,
        },
      });

      if (customerSpecific) return customerSpecific;
    }

    // Return default or any
    return this.prisma.partPackaging.findFirst({
      where: { ...where, customerId: null, isDefault: true },
      include: {
        packageSpec: true,
      },
    });
  }

  // ==========================================================================
  // PACKAGES
  // ==========================================================================

  private async generatePackageNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `PKG${year}`;

    const lastPackage = await this.prisma.package.findFirst({
      where: {
        organizationId,
        packageNumber: { startsWith: prefix },
      },
      orderBy: { packageNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastPackage) {
      const lastNum = parseInt(lastPackage.packageNumber.slice(5), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  async createPackage(organizationId: string, dto: CreatePackageDto, userId: string) {
    const packageNumber = await this.generatePackageNumber(organizationId);

    // Get package spec dimensions if provided
    let dimensions = {};
    if (dto.packageSpecId) {
      const spec = await this.findOneSpec(organizationId, dto.packageSpecId);
      dimensions = {
        lengthInches: spec.lengthInches,
        widthInches: spec.widthInches,
        heightInches: spec.heightInches,
      };
    }

    const pkg = await this.prisma.package.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        packageNumber,
        orderId: dto.orderId,
        packageSpecId: dto.packageSpecId,
        lengthInches: dto.lengthInches || (dimensions as any).lengthInches,
        widthInches: dto.widthInches || (dimensions as any).widthInches,
        heightInches: dto.heightInches || (dimensions as any).heightInches,
        notes: dto.notes,
        packedById: userId,
      },
      include: {
        packageSpec: { select: { code: true, name: true } },
        order: { select: { orderNumber: true } },
      },
    });

    this.logger.log(`Created package ${packageNumber}`);
    return pkg;
  }

  async findAllPackages(organizationId: string, query: PackageQueryDto) {
    const { facilityId, orderId, shipmentId, status, search, page = 1, limit = 20 } = query;

    const where: Prisma.PackageWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(orderId && { orderId }),
      ...(shipmentId && { shipmentId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { packageNumber: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [packages, total] = await Promise.all([
      this.prisma.package.findMany({
        where,
        include: {
          packageSpec: { select: { code: true, name: true } },
          order: { select: { orderNumber: true } },
          shipment: { select: { shipmentNumber: true } },
          contents: {
            include: {
              part: { select: { partNumber: true, description: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.package.count({ where }),
    ]);

    return { data: packages, total, page, limit };
  }

  async findOnePackage(organizationId: string, id: string) {
    const pkg = await this.prisma.package.findFirst({
      where: { id, organizationId },
      include: {
        facility: { select: { name: true, code: true } },
        packageSpec: true,
        order: { select: { orderNumber: true, customerPO: true } },
        shipment: { select: { shipmentNumber: true, trackingNumber: true } },
        packedBy: { select: { firstName: true, lastName: true } },
        contents: {
          include: {
            part: { select: { partNumber: true, description: true } },
            orderLine: { select: { lineNumber: true } },
            workOrder: { select: { workOrderNumber: true } },
          },
        },
      },
    });

    if (!pkg) {
      throw new NotFoundException(`Package ${id} not found`);
    }

    return pkg;
  }

  async addContent(organizationId: string, packageId: string, dto: AddPackageContentDto, userId: string) {
    const pkg = await this.findOnePackage(organizationId, packageId);

    if (pkg.status !== 'OPEN') {
      throw new BadRequestException('Can only add content to OPEN packages');
    }

    const content = await this.prisma.packageContent.create({
      data: {
        packageId,
        partId: dto.partId,
        quantity: dto.quantity,
        orderLineId: dto.orderLineId,
        workOrderId: dto.workOrderId,
        lotNumber: dto.lotNumber,
        serialNumbers: dto.serialNumbers || [],
      },
      include: {
        part: { select: { partNumber: true, description: true } },
      },
    });

    return content;
  }

  async removeContent(organizationId: string, packageId: string, contentId: string) {
    const pkg = await this.findOnePackage(organizationId, packageId);

    if (pkg.status !== 'OPEN') {
      throw new BadRequestException('Can only remove content from OPEN packages');
    }

    await this.prisma.packageContent.delete({
      where: { id: contentId },
    });

    return { success: true };
  }

  async sealPackage(organizationId: string, id: string, dto: SealPackageDto, userId: string) {
    const pkg = await this.findOnePackage(organizationId, id);

    if (pkg.status !== 'OPEN') {
      throw new BadRequestException('Package must be OPEN to seal');
    }

    if (pkg.contents.length === 0) {
      throw new BadRequestException('Cannot seal empty package');
    }

    // Calculate DIM weight if dimensions provided
    let dimWeightLbs;
    const length = dto.lengthInches || pkg.lengthInches?.toNumber();
    const width = dto.widthInches || pkg.widthInches?.toNumber();
    const height = dto.heightInches || pkg.heightInches?.toNumber();

    if (length && width && height) {
      // DIM factor 139 for domestic (USA)
      dimWeightLbs = (length * width * height) / 139;
    }

    const updated = await this.prisma.package.update({
      where: { id },
      data: {
        status: PackageStatus.SEALED,
        weightLbs: dto.weightLbs,
        lengthInches: dto.lengthInches,
        widthInches: dto.widthInches,
        heightInches: dto.heightInches,
        dimWeightLbs,
        sealedAt: new Date(),
      },
    });

    this.logger.log(`Sealed package ${pkg.packageNumber}`);
    return updated;
  }

  async labelPackage(organizationId: string, id: string, barcode: string, userId: string) {
    const pkg = await this.findOnePackage(organizationId, id);

    if (!['SEALED', 'LABELED'].includes(pkg.status)) {
      throw new BadRequestException('Package must be SEALED to label');
    }

    const updated = await this.prisma.package.update({
      where: { id },
      data: {
        status: PackageStatus.LABELED,
        barcode,
        labeledAt: new Date(),
      },
    });

    return updated;
  }

  async stagePackage(organizationId: string, id: string, userId: string) {
    const pkg = await this.findOnePackage(organizationId, id);

    if (pkg.status !== 'LABELED') {
      throw new BadRequestException('Package must be LABELED to stage');
    }

    const updated = await this.prisma.package.update({
      where: { id },
      data: {
        status: PackageStatus.STAGED,
      },
    });

    return updated;
  }

  async getStagedPackages(organizationId: string, facilityId?: string) {
    const where: Prisma.PackageWhereInput = {
      organizationId,
      status: 'STAGED',
      shipmentId: null,
      ...(facilityId && { facilityId }),
    };

    return this.prisma.package.findMany({
      where,
      include: {
        packageSpec: { select: { code: true, name: true } },
        order: { select: { orderNumber: true } },
        contents: {
          include: {
            part: { select: { partNumber: true } },
          },
        },
      },
      orderBy: { sealedAt: 'asc' },
    });
  }
}
