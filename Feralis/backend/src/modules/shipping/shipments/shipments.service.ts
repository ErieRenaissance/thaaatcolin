import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
  ShipShipmentDto,
  AddPackagesToShipmentDto,
  RecordTrackingEventDto,
  ShipmentQueryDto,
  ShipmentStatus,
} from '../dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShipmentsService {
  private readonly logger = new Logger(ShipmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate shipment number
   */
  private async generateShipmentNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `SHP${year}`;

    const lastShipment = await this.prisma.shipment.findFirst({
      where: {
        organizationId,
        shipmentNumber: { startsWith: prefix },
      },
      orderBy: { shipmentNumber: 'desc' },
    });

    let nextNum = 1;
    if (lastShipment) {
      const lastNum = parseInt(lastShipment.shipmentNumber.slice(5), 10);
      nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(6, '0')}`;
  }

  /**
   * Create shipment
   */
  async create(organizationId: string, dto: CreateShipmentDto, userId: string) {
    // Get facility for ship from address
    const facility = await this.prisma.facility.findFirst({
      where: { id: dto.facilityId, organizationId },
    });

    if (!facility) {
      throw new NotFoundException(`Facility ${dto.facilityId} not found`);
    }

    const shipmentNumber = await this.generateShipmentNumber(organizationId);

    const shipment = await this.prisma.shipment.create({
      data: {
        organizationId,
        facilityId: dto.facilityId,
        shipmentNumber,
        orderId: dto.orderId,
        customerId: dto.customerId,
        carrierId: dto.carrierId,
        serviceId: dto.serviceId,
        shipmentType: dto.shipmentType || 'STANDARD',
        // Ship from (facility address)
        shipFromName: facility.name,
        shipFromAddress1: facility.addressLine1 || '',
        shipFromAddress2: facility.addressLine2,
        shipFromCity: facility.city || '',
        shipFromState: facility.state || '',
        shipFromPostalCode: facility.postalCode || '',
        shipFromCountry: facility.country,
        shipFromPhone: facility.phone,
        // Ship to
        shipToName: dto.shipToName,
        shipToCompany: dto.shipToCompany,
        shipToAddress1: dto.shipToAddress1,
        shipToAddress2: dto.shipToAddress2,
        shipToCity: dto.shipToCity,
        shipToState: dto.shipToState,
        shipToPostalCode: dto.shipToPostalCode,
        shipToCountry: dto.shipToCountry || 'USA',
        shipToPhone: dto.shipToPhone,
        shipToEmail: dto.shipToEmail,
        // Options
        requestedShipDate: dto.requestedShipDate ? new Date(dto.requestedShipDate) : undefined,
        billTo: dto.billTo || 'SHIPPER',
        thirdPartyAccount: dto.thirdPartyAccount,
        signatureRequired: dto.signatureRequired || false,
        insuranceAmount: dto.insuranceAmount,
        saturdayDelivery: dto.saturdayDelivery || false,
        holdForPickup: dto.holdForPickup || false,
        specialInstructions: dto.specialInstructions,
        internalNotes: dto.internalNotes,
        createdById: userId,
      },
      include: {
        customer: { select: { name: true, code: true } },
        carrier: { select: { code: true, name: true } },
        service: { select: { code: true, name: true } },
      },
    });

    // Add packages if provided
    if (dto.packageIds?.length) {
      await this.prisma.package.updateMany({
        where: {
          id: { in: dto.packageIds },
          organizationId,
        },
        data: { shipmentId: shipment.id },
      });

      // Update package count
      await this.updatePackageStats(shipment.id);
    }

    await this.auditService.log({
      organizationId,
      userId,
      action: 'CREATE',
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      newValues: { shipmentNumber, customerId: dto.customerId },
    });

    this.logger.log(`Created shipment ${shipmentNumber}`);
    return shipment;
  }

  /**
   * Update package statistics on shipment
   */
  private async updatePackageStats(shipmentId: string) {
    const packages = await this.prisma.package.findMany({
      where: { shipmentId },
    });

    const packageCount = packages.length;
    const totalWeightLbs = packages.reduce(
      (sum, pkg) => sum + (pkg.weightLbs?.toNumber() || 0),
      0,
    );

    await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: { packageCount, totalWeightLbs },
    });
  }

  /**
   * Find all shipments
   */
  async findAll(organizationId: string, query: ShipmentQueryDto) {
    const {
      facilityId,
      orderId,
      customerId,
      carrierId,
      status,
      shipmentType,
      fromDate,
      toDate,
      search,
      page = 1,
      limit = 20,
    } = query;

    const where: Prisma.ShipmentWhereInput = {
      organizationId,
      ...(facilityId && { facilityId }),
      ...(orderId && { orderId }),
      ...(customerId && { customerId }),
      ...(carrierId && { carrierId }),
      ...(status && { status }),
      ...(shipmentType && { shipmentType }),
      ...(fromDate && { createdAt: { gte: new Date(fromDate) } }),
      ...(toDate && { createdAt: { lte: new Date(toDate) } }),
      ...(search && {
        OR: [
          { shipmentNumber: { contains: search, mode: 'insensitive' } },
          { trackingNumber: { contains: search, mode: 'insensitive' } },
          { shipToName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [shipments, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        include: {
          customer: { select: { name: true, code: true } },
          carrier: { select: { code: true, name: true } },
          service: { select: { code: true, name: true } },
          order: { select: { orderNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.shipment.count({ where }),
    ]);

    return { data: shipments, total, page, limit };
  }

  /**
   * Find one shipment
   */
  async findOne(organizationId: string, id: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id, organizationId },
      include: {
        facility: { select: { name: true, code: true } },
        customer: { select: { name: true, code: true } },
        carrier: { select: { code: true, name: true, trackingUrlTemplate: true } },
        service: { select: { code: true, name: true, transitDays: true } },
        order: { select: { orderNumber: true, customerPO: true } },
        packages: {
          include: {
            contents: {
              include: {
                part: { select: { partNumber: true, description: true } },
              },
            },
          },
        },
        trackingEvents: { orderBy: { eventTimestamp: 'desc' } },
        createdBy: { select: { firstName: true, lastName: true } },
        shippedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    // Add tracking URL if available
    if (shipment.trackingNumber && shipment.carrier?.trackingUrlTemplate) {
      (shipment as any).trackingUrl = shipment.carrier.trackingUrlTemplate.replace(
        '{tracking}',
        shipment.trackingNumber,
      );
    }

    return shipment;
  }

  /**
   * Find by shipment number
   */
  async findByNumber(organizationId: string, shipmentNumber: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { organizationId, shipmentNumber },
      include: {
        customer: { select: { name: true, code: true } },
        carrier: { select: { code: true, name: true } },
        packages: true,
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentNumber} not found`);
    }

    return shipment;
  }

  /**
   * Update shipment
   */
  async update(organizationId: string, id: string, dto: UpdateShipmentDto, userId: string) {
    const existing = await this.findOne(organizationId, id);

    if (['DELIVERED', 'CANCELLED', 'RETURNED'].includes(existing.status)) {
      throw new BadRequestException(`Cannot update ${existing.status} shipment`);
    }

    const shipment = await this.prisma.shipment.update({
      where: { id },
      data: {
        ...(dto.carrierId !== undefined && { carrierId: dto.carrierId }),
        ...(dto.serviceId !== undefined && { serviceId: dto.serviceId }),
        ...(dto.shipmentType && { shipmentType: dto.shipmentType }),
        ...(dto.status && { status: dto.status }),
        ...(dto.trackingNumber !== undefined && { trackingNumber: dto.trackingNumber }),
        ...(dto.masterTrackingNumber !== undefined && { masterTrackingNumber: dto.masterTrackingNumber }),
        ...(dto.proNumber !== undefined && { proNumber: dto.proNumber }),
        // Ship to updates
        ...(dto.shipToName && { shipToName: dto.shipToName }),
        ...(dto.shipToCompany !== undefined && { shipToCompany: dto.shipToCompany }),
        ...(dto.shipToAddress1 && { shipToAddress1: dto.shipToAddress1 }),
        ...(dto.shipToAddress2 !== undefined && { shipToAddress2: dto.shipToAddress2 }),
        ...(dto.shipToCity && { shipToCity: dto.shipToCity }),
        ...(dto.shipToState && { shipToState: dto.shipToState }),
        ...(dto.shipToPostalCode && { shipToPostalCode: dto.shipToPostalCode }),
        ...(dto.shipToCountry && { shipToCountry: dto.shipToCountry }),
        ...(dto.shipToPhone !== undefined && { shipToPhone: dto.shipToPhone }),
        ...(dto.shipToEmail !== undefined && { shipToEmail: dto.shipToEmail }),
        // Options
        ...(dto.requestedShipDate && { requestedShipDate: new Date(dto.requestedShipDate) }),
        ...(dto.signatureRequired !== undefined && { signatureRequired: dto.signatureRequired }),
        ...(dto.insuranceAmount !== undefined && { insuranceAmount: dto.insuranceAmount }),
        ...(dto.saturdayDelivery !== undefined && { saturdayDelivery: dto.saturdayDelivery }),
        ...(dto.holdForPickup !== undefined && { holdForPickup: dto.holdForPickup }),
        // Costs
        ...(dto.freightCost !== undefined && { freightCost: dto.freightCost }),
        ...(dto.insuranceCost !== undefined && { insuranceCost: dto.insuranceCost }),
        ...(dto.packagingCost !== undefined && { packagingCost: dto.packagingCost }),
        ...(dto.handlingCost !== undefined && { handlingCost: dto.handlingCost }),
        ...(dto.estimatedDelivery && { estimatedDelivery: new Date(dto.estimatedDelivery) }),
        ...(dto.specialInstructions !== undefined && { specialInstructions: dto.specialInstructions }),
        ...(dto.internalNotes !== undefined && { internalNotes: dto.internalNotes }),
      },
    });

    // Calculate total cost
    if (dto.freightCost !== undefined || dto.insuranceCost !== undefined ||
        dto.packagingCost !== undefined || dto.handlingCost !== undefined) {
      const totalCost =
        (shipment.freightCost?.toNumber() || 0) +
        (shipment.insuranceCost?.toNumber() || 0) +
        (shipment.packagingCost?.toNumber() || 0) +
        (shipment.handlingCost?.toNumber() || 0);

      await this.prisma.shipment.update({
        where: { id },
        data: { totalCost },
      });
    }

    return shipment;
  }

  /**
   * Add packages to shipment
   */
  async addPackages(
    organizationId: string,
    id: string,
    dto: AddPackagesToShipmentDto,
    userId: string,
  ) {
    const shipment = await this.findOne(organizationId, id);

    if (['IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(shipment.status)) {
      throw new BadRequestException('Cannot add packages to this shipment');
    }

    await this.prisma.package.updateMany({
      where: {
        id: { in: dto.packageIds },
        organizationId,
      },
      data: { shipmentId: id },
    });

    await this.updatePackageStats(id);

    return this.findOne(organizationId, id);
  }

  /**
   * Remove package from shipment
   */
  async removePackage(organizationId: string, id: string, packageId: string, userId: string) {
    const shipment = await this.findOne(organizationId, id);

    if (['IN_TRANSIT', 'DELIVERED', 'CANCELLED'].includes(shipment.status)) {
      throw new BadRequestException('Cannot remove packages from this shipment');
    }

    await this.prisma.package.update({
      where: { id: packageId },
      data: { shipmentId: null },
    });

    await this.updatePackageStats(id);

    return this.findOne(organizationId, id);
  }

  /**
   * Ship shipment
   */
  async ship(organizationId: string, id: string, dto: ShipShipmentDto, userId: string) {
    const shipment = await this.findOne(organizationId, id);

    if (!['DRAFT', 'PENDING_PICKUP'].includes(shipment.status)) {
      throw new BadRequestException('Shipment is not in a shippable status');
    }

    if (shipment.packageCount === 0) {
      throw new BadRequestException('Shipment has no packages');
    }

    const updateData: Prisma.ShipmentUpdateInput = {
      status: ShipmentStatus.IN_TRANSIT,
      actualShipDate: new Date(),
      shippedById: userId,
    };

    if (dto.carrierId) updateData.carrierId = dto.carrierId;
    if (dto.serviceId) updateData.serviceId = dto.serviceId;
    if (dto.trackingNumber) updateData.trackingNumber = dto.trackingNumber;
    if (dto.freightCost !== undefined) updateData.freightCost = dto.freightCost;
    if (dto.estimatedDelivery) updateData.estimatedDelivery = new Date(dto.estimatedDelivery);

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: updateData,
    });

    // Update package statuses
    await this.prisma.package.updateMany({
      where: { shipmentId: id },
      data: { status: 'SHIPPED' },
    });

    // Create shipped tracking event
    await this.prisma.trackingEvent.create({
      data: {
        shipmentId: id,
        eventCode: 'SHIPPED',
        eventDescription: 'Shipment picked up',
        eventTimestamp: new Date(),
        city: shipment.shipFromCity,
        state: shipment.shipFromState,
        postalCode: shipment.shipFromPostalCode,
        country: shipment.shipFromCountry,
        sourceType: 'MANUAL',
      },
    });

    await this.auditService.log({
      organizationId,
      userId,
      action: 'SHIP',
      entityType: 'SHIPMENT',
      entityId: id,
      newValues: { trackingNumber: dto.trackingNumber },
    });

    this.logger.log(`Shipped shipment ${shipment.shipmentNumber}`);
    return updated;
  }

  /**
   * Record tracking event
   */
  async recordTrackingEvent(
    organizationId: string,
    id: string,
    dto: RecordTrackingEventDto,
    userId: string,
  ) {
    const shipment = await this.findOne(organizationId, id);

    const event = await this.prisma.trackingEvent.create({
      data: {
        shipmentId: id,
        eventCode: dto.eventCode,
        eventDescription: dto.eventDescription,
        eventTimestamp: new Date(dto.eventTimestamp),
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        signedBy: dto.signedBy,
        isException: dto.isException || false,
        exceptionCode: dto.exceptionCode,
        sourceType: 'MANUAL',
      },
    });

    // Update shipment status based on event
    if (dto.eventCode === 'DELIVERED') {
      await this.prisma.shipment.update({
        where: { id },
        data: {
          status: ShipmentStatus.DELIVERED,
          actualDelivery: new Date(dto.eventTimestamp),
        },
      });
    } else if (dto.isException) {
      await this.prisma.shipment.update({
        where: { id },
        data: { status: ShipmentStatus.EXCEPTION },
      });
    } else if (dto.eventCode === 'OUT_FOR_DELIVERY') {
      await this.prisma.shipment.update({
        where: { id },
        data: { status: ShipmentStatus.OUT_FOR_DELIVERY },
      });
    }

    return event;
  }

  /**
   * Mark as delivered
   */
  async markDelivered(
    organizationId: string,
    id: string,
    signedBy: string,
    userId: string,
  ) {
    const shipment = await this.findOne(organizationId, id);

    if (shipment.status === 'DELIVERED') {
      throw new BadRequestException('Shipment is already delivered');
    }

    await this.prisma.trackingEvent.create({
      data: {
        shipmentId: id,
        eventCode: 'DELIVERED',
        eventDescription: `Delivered - Signed by: ${signedBy}`,
        eventTimestamp: new Date(),
        city: shipment.shipToCity,
        state: shipment.shipToState,
        postalCode: shipment.shipToPostalCode,
        country: shipment.shipToCountry,
        signedBy,
        sourceType: 'MANUAL',
      },
    });

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.DELIVERED,
        actualDelivery: new Date(),
      },
    });

    this.logger.log(`Shipment ${shipment.shipmentNumber} delivered`);
    return updated;
  }

  /**
   * Cancel shipment
   */
  async cancel(organizationId: string, id: string, reason: string, userId: string) {
    const shipment = await this.findOne(organizationId, id);

    if (['DELIVERED', 'CANCELLED'].includes(shipment.status)) {
      throw new BadRequestException(`Cannot cancel ${shipment.status} shipment`);
    }

    // Remove packages from shipment
    await this.prisma.package.updateMany({
      where: { shipmentId: id },
      data: { shipmentId: null, status: 'STAGED' },
    });

    const updated = await this.prisma.shipment.update({
      where: { id },
      data: {
        status: ShipmentStatus.CANCELLED,
        packageCount: 0,
        internalNotes: shipment.internalNotes
          ? `${shipment.internalNotes}\n\nCANCELLED: ${reason}`
          : `CANCELLED: ${reason}`,
      },
    });

    this.logger.log(`Cancelled shipment ${shipment.shipmentNumber}: ${reason}`);
    return updated;
  }

  /**
   * Get shipment statistics
   */
  async getStatistics(organizationId: string, fromDate: Date, toDate: Date) {
    const shipments = await this.prisma.shipment.findMany({
      where: {
        organizationId,
        actualShipDate: {
          gte: fromDate,
          lte: toDate,
        },
      },
    });

    const byStatus = shipments.reduce((acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byCarrier = await this.prisma.shipment.groupBy({
      by: ['carrierId'],
      where: {
        organizationId,
        actualShipDate: { gte: fromDate, lte: toDate },
      },
      _count: true,
    });

    const totalCost = shipments.reduce(
      (sum, s) => sum + (s.totalCost?.toNumber() || 0),
      0,
    );

    const totalPackages = shipments.reduce((sum, s) => sum + s.packageCount, 0);

    // Calculate on-time delivery rate
    const delivered = shipments.filter(s => s.status === 'DELIVERED');
    const onTime = delivered.filter(s => {
      if (!s.estimatedDelivery || !s.actualDelivery) return true;
      return s.actualDelivery <= s.estimatedDelivery;
    });

    return {
      period: { fromDate, toDate },
      totalShipments: shipments.length,
      byStatus,
      byCarrier,
      totalPackages,
      totalCost,
      averageCost: shipments.length > 0 ? totalCost / shipments.length : 0,
      onTimeDeliveryRate: delivered.length > 0
        ? Math.round((onTime.length / delivered.length) * 100)
        : 100,
    };
  }
}
