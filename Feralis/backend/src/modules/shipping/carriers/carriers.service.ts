import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateCarrierDto,
  UpdateCarrierDto,
  CarrierQueryDto,
  CreateCarrierServiceDto,
  UpdateCarrierServiceDto,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CarriersService {
  private readonly logger = new Logger(CarriersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ==========================================================================
  // CARRIERS
  // ==========================================================================

  /**
   * Create carrier
   */
  async create(organizationId: string, dto: CreateCarrierDto, userId: string) {
    // Check for duplicate code
    const existing = await this.prisma.carrier.findFirst({
      where: { organizationId, code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Carrier code ${dto.code} already exists`);
    }

    const carrier = await this.prisma.carrier.create({
      data: {
        organizationId,
        code: dto.code,
        name: dto.name,
        carrierType: dto.carrierType,
        apiEnabled: dto.apiEnabled || false,
        accountNumber: dto.accountNumber,
        apiKey: dto.apiKey,
        apiSecret: dto.apiSecret,
        apiEndpoint: dto.apiEndpoint,
        trackingUrlTemplate: dto.trackingUrlTemplate,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'CARRIER',
      entityId: carrier.id,
      newValues: { code: dto.code, name: dto.name },
    });

    return carrier;
  }

  /**
   * Find all carriers
   */
  async findAll(organizationId: string, query: CarrierQueryDto) {
    const { carrierType, apiEnabled, isActive, search, page = 1, limit = 20 } = query;

    const where: Prisma.CarrierWhereInput = {
      organizationId,
      ...(carrierType && { carrierType }),
      ...(apiEnabled !== undefined && { apiEnabled }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [carriers, total] = await Promise.all([
      this.prisma.carrier.findMany({
        where,
        include: {
          services: { where: { isActive: true }, select: { id: true, code: true, name: true } },
          _count: { select: { shipments: true } },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.carrier.count({ where }),
    ]);

    return { data: carriers, total, page, limit };
  }

  /**
   * Find one carrier
   */
  async findOne(organizationId: string, id: string) {
    const carrier = await this.prisma.carrier.findFirst({
      where: { id, organizationId },
      include: {
        services: true,
        _count: { select: { shipments: true } },
      },
    });

    if (!carrier) {
      throw new NotFoundException(`Carrier ${id} not found`);
    }

    return carrier;
  }

  /**
   * Update carrier
   */
  async update(organizationId: string, id: string, dto: UpdateCarrierDto, userId: string) {
    await this.findOne(organizationId, id);

    const carrier = await this.prisma.carrier.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.carrierType && { carrierType: dto.carrierType }),
        ...(dto.apiEnabled !== undefined && { apiEnabled: dto.apiEnabled }),
        ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber }),
        ...(dto.apiKey !== undefined && { apiKey: dto.apiKey }),
        ...(dto.apiSecret !== undefined && { apiSecret: dto.apiSecret }),
        ...(dto.apiEndpoint !== undefined && { apiEndpoint: dto.apiEndpoint }),
        ...(dto.trackingUrlTemplate !== undefined && { trackingUrlTemplate: dto.trackingUrlTemplate }),
        ...(dto.contactName !== undefined && { contactName: dto.contactName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    return carrier;
  }

  /**
   * Delete carrier
   */
  async delete(organizationId: string, id: string, userId: string) {
    const carrier = await this.findOne(organizationId, id);

    // Check for active shipments
    const activeShipments = await this.prisma.shipment.count({
      where: {
        carrierId: id,
        status: { notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'] },
      },
    });

    if (activeShipments > 0) {
      throw new BadRequestException('Cannot delete carrier with active shipments');
    }

    await this.prisma.carrier.update({
      where: { id },
      data: { isActive: false },
    });

    this.logger.log(`Deactivated carrier ${carrier.code}`);
  }

  // ==========================================================================
  // CARRIER SERVICES
  // ==========================================================================

  /**
   * Add service to carrier
   */
  async addService(
    organizationId: string,
    carrierId: string,
    dto: CreateCarrierServiceDto,
    userId: string,
  ) {
    const carrier = await this.findOne(organizationId, carrierId);

    // Check for duplicate code
    const existing = await this.prisma.carrierService.findFirst({
      where: { carrierId, code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Service code ${dto.code} already exists for this carrier`);
    }

    const service = await this.prisma.carrierService.create({
      data: {
        carrierId,
        code: dto.code,
        name: dto.name,
        description: dto.description,
        serviceType: dto.serviceType,
        transitDays: dto.transitDays,
        maxWeightLbs: dto.maxWeightLbs,
        maxLengthInches: dto.maxLengthInches,
        baseRate: dto.baseRate,
        fuelSurchargePercent: dto.fuelSurchargePercent,
      },
    });

    return service;
  }

  /**
   * Update carrier service
   */
  async updateService(
    organizationId: string,
    carrierId: string,
    serviceId: string,
    dto: UpdateCarrierServiceDto,
    userId: string,
  ) {
    await this.findOne(organizationId, carrierId);

    const service = await this.prisma.carrierService.findFirst({
      where: { id: serviceId, carrierId },
    });

    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    return this.prisma.carrierService.update({
      where: { id: serviceId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.serviceType && { serviceType: dto.serviceType }),
        ...(dto.transitDays !== undefined && { transitDays: dto.transitDays }),
        ...(dto.maxWeightLbs !== undefined && { maxWeightLbs: dto.maxWeightLbs }),
        ...(dto.maxLengthInches !== undefined && { maxLengthInches: dto.maxLengthInches }),
        ...(dto.baseRate !== undefined && { baseRate: dto.baseRate }),
        ...(dto.fuelSurchargePercent !== undefined && { fuelSurchargePercent: dto.fuelSurchargePercent }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete carrier service
   */
  async deleteService(
    organizationId: string,
    carrierId: string,
    serviceId: string,
    userId: string,
  ) {
    await this.findOne(organizationId, carrierId);

    const service = await this.prisma.carrierService.findFirst({
      where: { id: serviceId, carrierId },
    });

    if (!service) {
      throw new NotFoundException(`Service ${serviceId} not found`);
    }

    await this.prisma.carrierService.update({
      where: { id: serviceId },
      data: { isActive: false },
    });
  }

  /**
   * Get available services for a carrier
   */
  async getServices(organizationId: string, carrierId: string) {
    const carrier = await this.findOne(organizationId, carrierId);

    return this.prisma.carrierService.findMany({
      where: { carrierId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}
