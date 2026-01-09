// =============================================================================
// FERALIS PLATFORM - ORDERS SERVICE
// =============================================================================
// Implements: ORD-001 through ORD-015

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Order,
  OrderLine,
  OrderStatus,
  OrderLineStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { CreateOrderLineDto } from './dto/create-order-line.dto';
import { UpdateOrderLineDto } from './dto/update-order-line.dto';

export interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderWithRelations extends Order {
  customer?: { id: string; code: string; name: string };
  lines?: OrderLine[];
  salesRep?: { id: string; firstName: string; lastName: string };
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================================================
  // ORD-001: Create Order
  // ===========================================================================

  async create(
    createOrderDto: CreateOrderDto,
    organizationId: string,
    userId?: string,
  ): Promise<Order> {
    // Validate customer
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: createOrderDto.customerId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new BadRequestException('Invalid customer');
    }

    // Check credit hold
    if (customer.isOnCreditHold) {
      throw new BadRequestException('Customer is on credit hold');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber(organizationId);

    const order = await this.prisma.order.create({
      data: {
        ...createOrderDto,
        organizationId,
        orderNumber,
        createdBy: userId,
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
        salesRep: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    await this.auditService.log({
      action: 'ORDER_CREATED',
      entityType: 'Order',
      entityId: order.id,
      entityName: order.orderNumber,
      newValues: order,
      userId,
      organizationId,
    });

    return order;
  }

  // ===========================================================================
  // ORD-002: Query Orders
  // ===========================================================================

  async findAll(
    organizationId: string,
    query: QueryOrdersDto,
  ): Promise<PaginatedOrders> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      orderType,
      customerId,
      salesRepId,
      fromDate,
      toDate,
      sortBy = 'orderDate',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerPO: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (orderType) {
      where.orderType = orderType;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (fromDate || toDate) {
      where.orderDate = {};
      if (fromDate) {
        where.orderDate.gte = new Date(fromDate);
      }
      if (toDate) {
        where.orderDate.lte = new Date(toDate);
      }
    }

    const orderBy: Prisma.OrderOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: {
            select: { id: true, code: true, name: true },
          },
          salesRep: {
            select: { id: true, firstName: true, lastName: true },
          },
          _count: {
            select: { lines: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ===========================================================================
  // ORD-003: Get Order by ID
  // ===========================================================================

  async findOne(id: string, organizationId: string): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
        salesRep: {
          select: { id: true, firstName: true, lastName: true },
        },
        lines: {
          orderBy: { lineNumber: 'asc' },
          include: {
            part: {
              select: { id: true, partNumber: true, name: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // ===========================================================================
  // ORD-004: Update Order
  // ===========================================================================

  async update(
    id: string,
    organizationId: string,
    updateOrderDto: UpdateOrderDto,
    userId?: string,
  ): Promise<Order> {
    const existing = await this.findOne(id, organizationId);

    // Can only update orders not in production or later
    const nonEditableStatuses = [
      OrderStatus.IN_PRODUCTION,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CLOSED,
      OrderStatus.CANCELLED,
    ];

    if (nonEditableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot update order in ${existing.status} status`,
      );
    }

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        ...updateOrderDto,
        updatedBy: userId,
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    await this.auditService.logChange(
      'ORDER_UPDATED',
      'Order',
      id,
      existing,
      order,
      { userId, organizationId },
    );

    return order;
  }

  // ===========================================================================
  // ORD-005: Cancel Order
  // ===========================================================================

  async cancel(
    id: string,
    organizationId: string,
    reason: string,
    userId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id, organizationId);

    // Can't cancel shipped/delivered/closed orders
    const nonCancellableStatuses = [
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CLOSED,
      OrderStatus.CANCELLED,
    ];

    if (nonCancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in ${order.status} status`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Cancel all lines
      await tx.orderLine.updateMany({
        where: { orderId: id },
        data: { status: OrderLineStatus.CANCELLED },
      });

      // Cancel order
      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          holdReason: reason,
          updatedBy: userId,
        },
      });
    });

    await this.auditService.log({
      action: 'ORDER_CANCELLED',
      entityType: 'Order',
      entityId: id,
      entityName: order.orderNumber,
      oldValues: { status: order.status },
      newValues: { status: OrderStatus.CANCELLED, reason },
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // ORD-006: Approve Order
  // ===========================================================================

  async approve(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id, organizationId);

    if (order.status !== OrderStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only approve orders in PENDING_APPROVAL status');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'ORDER_APPROVED',
      entityType: 'Order',
      entityId: id,
      entityName: order.orderNumber,
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // ORD-007: Put Order On Hold
  // ===========================================================================

  async putOnHold(
    id: string,
    organizationId: string,
    reason: string,
    userId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id, organizationId);

    if (order.status === OrderStatus.ON_HOLD) {
      throw new BadRequestException('Order is already on hold');
    }

    const nonHoldableStatuses = [
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CLOSED,
      OrderStatus.CANCELLED,
    ];

    if (nonHoldableStatuses.includes(order.status)) {
      throw new BadRequestException(`Cannot put order in ${order.status} on hold`);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.ON_HOLD,
        holdReason: reason,
        holdBy: userId,
        holdAt: new Date(),
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'ORDER_PUT_ON_HOLD',
      entityType: 'Order',
      entityId: id,
      entityName: order.orderNumber,
      newValues: { holdReason: reason },
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // ORD-008: Release Order Hold
  // ===========================================================================

  async releaseHold(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id, organizationId);

    if (order.status !== OrderStatus.ON_HOLD) {
      throw new BadRequestException('Order is not on hold');
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.APPROVED,
        holdReason: null,
        holdBy: null,
        holdAt: null,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'ORDER_HOLD_RELEASED',
      entityType: 'Order',
      entityId: id,
      entityName: order.orderNumber,
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // ORD-009: Release to Production
  // ===========================================================================

  async releaseToProduction(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Order> {
    const order = await this.findOne(id, organizationId);

    if (order.status !== OrderStatus.APPROVED) {
      throw new BadRequestException('Can only release APPROVED orders to production');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update line statuses
      await tx.orderLine.updateMany({
        where: { orderId: id, status: OrderLineStatus.PENDING },
        data: { status: OrderLineStatus.SCHEDULED },
      });

      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.IN_PRODUCTION,
          updatedBy: userId,
        },
      });
    });

    await this.auditService.log({
      action: 'ORDER_RELEASED_TO_PRODUCTION',
      entityType: 'Order',
      entityId: id,
      entityName: order.orderNumber,
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // ORD-010: Add Order Line
  // ===========================================================================

  async addLine(
    orderId: string,
    organizationId: string,
    createLineDto: CreateOrderLineDto,
    userId?: string,
  ): Promise<OrderLine> {
    const order = await this.findOne(orderId, organizationId);

    const nonEditableStatuses = [
      OrderStatus.IN_PRODUCTION,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CLOSED,
      OrderStatus.CANCELLED,
    ];

    if (nonEditableStatuses.includes(order.status)) {
      throw new BadRequestException('Cannot add lines to this order');
    }

    // Get next line number
    const lastLine = await this.prisma.orderLine.findFirst({
      where: { orderId },
      orderBy: { lineNumber: 'desc' },
    });
    const lineNumber = createLineDto.lineNumber || (lastLine?.lineNumber || 0) + 1;

    // Calculate extended price
    const extendedPrice = Number(createLineDto.quantityOrdered) * Number(createLineDto.unitPrice);

    const line = await this.prisma.orderLine.create({
      data: {
        ...createLineDto,
        orderId,
        lineNumber,
        quantityRemaining: createLineDto.quantityOrdered,
        extendedPrice,
      },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true },
        },
      },
    });

    // Recalculate order totals
    await this.recalculateTotals(orderId);

    return line;
  }

  // ===========================================================================
  // ORD-011: Update Order Line
  // ===========================================================================

  async updateLine(
    orderId: string,
    lineId: string,
    organizationId: string,
    updateLineDto: UpdateOrderLineDto,
    userId?: string,
  ): Promise<OrderLine> {
    const order = await this.findOne(orderId, organizationId);

    const nonEditableStatuses = [
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CLOSED,
      OrderStatus.CANCELLED,
    ];

    if (nonEditableStatuses.includes(order.status)) {
      throw new BadRequestException('Cannot update lines on this order');
    }

    const existing = await this.prisma.orderLine.findFirst({
      where: { id: lineId, orderId },
    });

    if (!existing) {
      throw new NotFoundException('Order line not found');
    }

    // Calculate extended price if quantity or unit price changed
    let extendedPrice = existing.extendedPrice;
    if (updateLineDto.quantityOrdered || updateLineDto.unitPrice) {
      const qty = updateLineDto.quantityOrdered || existing.quantityOrdered;
      const price = updateLineDto.unitPrice || existing.unitPrice;
      extendedPrice = new Prisma.Decimal(Number(qty) * Number(price));
    }

    // Calculate remaining quantity
    let quantityRemaining = existing.quantityRemaining;
    if (updateLineDto.quantityOrdered) {
      const diff = Number(updateLineDto.quantityOrdered) - Number(existing.quantityOrdered);
      quantityRemaining = new Prisma.Decimal(Number(existing.quantityRemaining) + diff);
    }

    const line = await this.prisma.orderLine.update({
      where: { id: lineId },
      data: {
        ...updateLineDto,
        extendedPrice,
        quantityRemaining,
      },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true },
        },
      },
    });

    // Recalculate order totals
    await this.recalculateTotals(orderId);

    return line;
  }

  // ===========================================================================
  // ORD-012: Remove Order Line
  // ===========================================================================

  async removeLine(
    orderId: string,
    lineId: string,
    organizationId: string,
  ): Promise<void> {
    const order = await this.findOne(orderId, organizationId);

    const nonEditableStatuses = [
      OrderStatus.IN_PRODUCTION,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CLOSED,
      OrderStatus.CANCELLED,
    ];

    if (nonEditableStatuses.includes(order.status)) {
      throw new BadRequestException('Cannot remove lines from this order');
    }

    const line = await this.prisma.orderLine.findFirst({
      where: { id: lineId, orderId },
    });

    if (!line) {
      throw new NotFoundException('Order line not found');
    }

    await this.prisma.orderLine.delete({
      where: { id: lineId },
    });

    // Recalculate order totals
    await this.recalculateTotals(orderId);
  }

  // ===========================================================================
  // ORD-013: Get Order Summary/Statistics
  // ===========================================================================

  async getStatistics(
    organizationId: string,
    fromDate?: Date,
    toDate?: Date,
  ): Promise<any> {
    const where: Prisma.OrderWhereInput = { organizationId };

    if (fromDate || toDate) {
      where.orderDate = {};
      if (fromDate) where.orderDate.gte = fromDate;
      if (toDate) where.orderDate.lte = toDate;
    }

    const [
      totalOrders,
      ordersByStatus,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
      }),
      this.prisma.order.aggregate({
        where: {
          ...where,
          status: { notIn: [OrderStatus.CANCELLED, OrderStatus.DRAFT] },
        },
        _sum: { total: true },
      }),
    ]);

    return {
      totalOrders,
      ordersByStatus: ordersByStatus.reduce((acc, item) => {
        acc[item.status] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      totalRevenue: totalRevenue._sum.total || 0,
    };
  }

  // ===========================================================================
  // Helper: Generate Order Number
  // ===========================================================================

  private async generateOrderNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `SO${year}`;

    const lastOrder = await this.prisma.order.findFirst({
      where: {
        organizationId,
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastNumber = parseInt(lastOrder.orderNumber.slice(-5), 10);
      sequence = lastNumber + 1;
    }

    return `${prefix}-${sequence.toString().padStart(5, '0')}`;
  }

  // ===========================================================================
  // Helper: Recalculate Order Totals
  // ===========================================================================

  private async recalculateTotals(orderId: string): Promise<void> {
    const lines = await this.prisma.orderLine.findMany({
      where: { orderId },
    });

    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.extendedPrice),
      0,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) return;

    let total = subtotal;

    if (order.discountPercent) {
      total -= subtotal * (Number(order.discountPercent) / 100);
    } else if (order.discountAmount) {
      total -= Number(order.discountAmount);
    }

    if (order.taxRate) {
      total += total * Number(order.taxRate);
    }

    if (order.shippingAmount) {
      total += Number(order.shippingAmount);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: { subtotal, total },
    });
  }
}
