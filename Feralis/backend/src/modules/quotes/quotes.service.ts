// =============================================================================
// FERALIS PLATFORM - QUOTES SERVICE
// =============================================================================
// Implements: QUOT-001 through QUOT-015

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Quote,
  QuoteLine,
  QuoteStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuotesDto } from './dto/query-quotes.dto';
import { CreateQuoteLineDto } from './dto/create-quote-line.dto';
import { UpdateQuoteLineDto } from './dto/update-quote-line.dto';

export interface PaginatedQuotes {
  items: Quote[];
  total: number;
  page: number;
  limit: number;
}

export interface QuoteWithRelations extends Quote {
  customer?: { id: string; code: string; name: string };
  lines?: QuoteLine[];
  salesRep?: { id: string; firstName: string; lastName: string };
}

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================================================
  // QUOT-001: Create Quote
  // ===========================================================================

  async create(
    createQuoteDto: CreateQuoteDto,
    organizationId: string,
    userId?: string,
  ): Promise<Quote> {
    // Validate customer
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: createQuoteDto.customerId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new BadRequestException('Invalid customer');
    }

    // Generate quote number
    const quoteNumber = await this.generateQuoteNumber(organizationId);

    const quote = await this.prisma.quote.create({
      data: {
        ...createQuoteDto,
        organizationId,
        quoteNumber,
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

    // Audit log
    await this.auditService.log({
      action: 'QUOTE_CREATED',
      entityType: 'Quote',
      entityId: quote.id,
      entityName: quote.quoteNumber,
      newValues: quote,
      userId,
      organizationId,
    });

    return quote;
  }

  // ===========================================================================
  // QUOT-002: Query Quotes
  // ===========================================================================

  async findAll(
    organizationId: string,
    query: QueryQuotesDto,
  ): Promise<PaginatedQuotes> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      customerId,
      salesRepId,
      priority,
      fromDate,
      toDate,
      sortBy = 'quoteDate',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { quoteNumber: { contains: search, mode: 'insensitive' } },
        { rfqNumber: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (priority) {
      where.priority = priority;
    }

    if (fromDate || toDate) {
      where.quoteDate = {};
      if (fromDate) {
        where.quoteDate.gte = new Date(fromDate);
      }
      if (toDate) {
        where.quoteDate.lte = new Date(toDate);
      }
    }

    const orderBy: Prisma.QuoteOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      this.prisma.quote.findMany({
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
      this.prisma.quote.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ===========================================================================
  // QUOT-003: Get Quote by ID
  // ===========================================================================

  async findOne(id: string, organizationId: string): Promise<QuoteWithRelations> {
    const quote = await this.prisma.quote.findFirst({
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

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  // ===========================================================================
  // QUOT-004: Update Quote
  // ===========================================================================

  async update(
    id: string,
    organizationId: string,
    updateQuoteDto: UpdateQuoteDto,
    userId?: string,
  ): Promise<Quote> {
    const existing = await this.findOne(id, organizationId);

    // Can only update DRAFT or PENDING_REVIEW quotes
    if (![QuoteStatus.DRAFT, QuoteStatus.PENDING_REVIEW].includes(existing.status)) {
      throw new BadRequestException(
        `Cannot update quote in ${existing.status} status`,
      );
    }

    const quote = await this.prisma.quote.update({
      where: { id },
      data: {
        ...updateQuoteDto,
        updatedBy: userId,
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    await this.auditService.logChange(
      'QUOTE_UPDATED',
      'Quote',
      id,
      existing,
      quote,
      { userId, organizationId },
    );

    return quote;
  }

  // ===========================================================================
  // QUOT-005: Delete Quote
  // ===========================================================================

  async remove(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<void> {
    const quote = await this.findOne(id, organizationId);

    // Can only delete DRAFT quotes
    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Can only delete quotes in DRAFT status');
    }

    await this.prisma.quote.delete({
      where: { id },
    });

    await this.auditService.log({
      action: 'QUOTE_DELETED',
      entityType: 'Quote',
      entityId: id,
      entityName: quote.quoteNumber,
      userId,
      organizationId,
    });
  }

  // ===========================================================================
  // QUOT-006: Submit Quote for Approval
  // ===========================================================================

  async submitForApproval(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Quote> {
    const quote = await this.findOne(id, organizationId);

    if (quote.status !== QuoteStatus.DRAFT) {
      throw new BadRequestException('Can only submit DRAFT quotes for approval');
    }

    if (!quote.lines || quote.lines.length === 0) {
      throw new BadRequestException('Quote must have at least one line item');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.PENDING_APPROVAL,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'QUOTE_SUBMITTED_FOR_APPROVAL',
      entityType: 'Quote',
      entityId: id,
      entityName: quote.quoteNumber,
      oldValues: { status: QuoteStatus.DRAFT },
      newValues: { status: QuoteStatus.PENDING_APPROVAL },
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // QUOT-007: Approve Quote
  // ===========================================================================

  async approve(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Quote> {
    const quote = await this.findOne(id, organizationId);

    if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only approve quotes in PENDING_APPROVAL status');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.APPROVED,
        approvedBy: userId,
        approvedAt: new Date(),
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'QUOTE_APPROVED',
      entityType: 'Quote',
      entityId: id,
      entityName: quote.quoteNumber,
      oldValues: { status: QuoteStatus.PENDING_APPROVAL },
      newValues: { status: QuoteStatus.APPROVED, approvedBy: userId },
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // QUOT-008: Reject Quote
  // ===========================================================================

  async reject(
    id: string,
    organizationId: string,
    reason: string,
    userId?: string,
  ): Promise<Quote> {
    const quote = await this.findOne(id, organizationId);

    if (quote.status !== QuoteStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Can only reject quotes in PENDING_APPROVAL status');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.REJECTED,
        rejectionReason: reason,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'QUOTE_REJECTED',
      entityType: 'Quote',
      entityId: id,
      entityName: quote.quoteNumber,
      oldValues: { status: QuoteStatus.PENDING_APPROVAL },
      newValues: { status: QuoteStatus.REJECTED, rejectionReason: reason },
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // QUOT-009: Send Quote to Customer
  // ===========================================================================

  async sendToCustomer(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Quote> {
    const quote = await this.findOne(id, organizationId);

    if (quote.status !== QuoteStatus.APPROVED) {
      throw new BadRequestException('Can only send APPROVED quotes to customer');
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: {
        status: QuoteStatus.SENT,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'QUOTE_SENT',
      entityType: 'Quote',
      entityId: id,
      entityName: quote.quoteNumber,
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // QUOT-010: Convert Quote to Order
  // ===========================================================================

  async convertToOrder(
    id: string,
    organizationId: string,
    customerPO?: string,
    userId?: string,
  ): Promise<{ quote: Quote; orderId: string }> {
    const quote = await this.findOne(id, organizationId);

    if (![QuoteStatus.APPROVED, QuoteStatus.SENT].includes(quote.status)) {
      throw new BadRequestException('Can only convert APPROVED or SENT quotes to orders');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber(organizationId);

    // Create order in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          organizationId,
          facilityId: quote.facilityId,
          orderNumber,
          customerId: quote.customerId,
          contactId: quote.contactId,
          customerPO,
          quoteId: quote.id,
          orderDate: new Date(),
          requestedDate: quote.requestedDelivery,
          promisedDate: quote.promisedDelivery,
          subtotal: quote.subtotal,
          discountPercent: quote.discountPercent,
          discountAmount: quote.discountAmount,
          taxRate: quote.taxRate,
          taxAmount: quote.taxAmount,
          shippingAmount: quote.shippingAmount,
          total: quote.total,
          paymentTerms: quote.paymentTerms,
          fobPoint: quote.fobPoint,
          shippingMethod: quote.shippingMethod,
          shipToAddressId: quote.shipToAddressId,
          billToAddressId: quote.billToAddressId,
          salesRepId: quote.salesRepId,
          internalNotes: quote.internalNotes,
          createdBy: userId,
        },
      });

      // Create order lines from quote lines
      if (quote.lines && quote.lines.length > 0) {
        for (const line of quote.lines) {
          await tx.orderLine.create({
            data: {
              orderId: order.id,
              lineNumber: line.lineNumber,
              partId: line.partId,
              partNumber: line.partNumber,
              partRevision: line.partRevision,
              description: line.description,
              quantityOrdered: line.quantity,
              quantityRemaining: line.quantity,
              uom: line.uom,
              unitPrice: line.unitPrice,
              extendedPrice: line.extendedPrice,
              discountPercent: line.discountPercent,
              discountAmount: line.discountAmount,
              requestedDate: line.requestedDate,
              promisedDate: line.promisedDate,
              notes: line.notes,
              quoteLineId: line.id,
            },
          });
        }
      }

      // Update quote status
      const updatedQuote = await tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.ACCEPTED,
          convertedToOrderId: order.id,
          convertedAt: new Date(),
          updatedBy: userId,
        },
      });

      return { quote: updatedQuote, orderId: order.id };
    });

    await this.auditService.log({
      action: 'QUOTE_CONVERTED_TO_ORDER',
      entityType: 'Quote',
      entityId: id,
      entityName: quote.quoteNumber,
      newValues: { orderId: result.orderId, orderNumber },
      userId,
      organizationId,
    });

    return result;
  }

  // ===========================================================================
  // QUOT-011: Add Quote Line
  // ===========================================================================

  async addLine(
    quoteId: string,
    organizationId: string,
    createLineDto: CreateQuoteLineDto,
    userId?: string,
  ): Promise<QuoteLine> {
    const quote = await this.findOne(quoteId, organizationId);

    if (![QuoteStatus.DRAFT, QuoteStatus.PENDING_REVIEW].includes(quote.status)) {
      throw new BadRequestException('Cannot add lines to this quote');
    }

    // Get next line number
    const lastLine = await this.prisma.quoteLine.findFirst({
      where: { quoteId },
      orderBy: { lineNumber: 'desc' },
    });
    const lineNumber = createLineDto.lineNumber || (lastLine?.lineNumber || 0) + 1;

    // Calculate extended price
    const extendedPrice = Number(createLineDto.quantity) * Number(createLineDto.unitPrice);

    const line = await this.prisma.quoteLine.create({
      data: {
        ...createLineDto,
        quoteId,
        lineNumber,
        extendedPrice,
      },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true },
        },
      },
    });

    // Recalculate quote totals
    await this.recalculateTotals(quoteId);

    return line;
  }

  // ===========================================================================
  // QUOT-012: Update Quote Line
  // ===========================================================================

  async updateLine(
    quoteId: string,
    lineId: string,
    organizationId: string,
    updateLineDto: UpdateQuoteLineDto,
    userId?: string,
  ): Promise<QuoteLine> {
    const quote = await this.findOne(quoteId, organizationId);

    if (![QuoteStatus.DRAFT, QuoteStatus.PENDING_REVIEW].includes(quote.status)) {
      throw new BadRequestException('Cannot update lines on this quote');
    }

    const existing = await this.prisma.quoteLine.findFirst({
      where: { id: lineId, quoteId },
    });

    if (!existing) {
      throw new NotFoundException('Quote line not found');
    }

    // Calculate extended price if quantity or unit price changed
    let extendedPrice = existing.extendedPrice;
    if (updateLineDto.quantity || updateLineDto.unitPrice) {
      const qty = updateLineDto.quantity || existing.quantity;
      const price = updateLineDto.unitPrice || existing.unitPrice;
      extendedPrice = new Prisma.Decimal(Number(qty) * Number(price));
    }

    const line = await this.prisma.quoteLine.update({
      where: { id: lineId },
      data: {
        ...updateLineDto,
        extendedPrice,
      },
      include: {
        part: {
          select: { id: true, partNumber: true, name: true },
        },
      },
    });

    // Recalculate quote totals
    await this.recalculateTotals(quoteId);

    return line;
  }

  // ===========================================================================
  // QUOT-013: Remove Quote Line
  // ===========================================================================

  async removeLine(
    quoteId: string,
    lineId: string,
    organizationId: string,
  ): Promise<void> {
    const quote = await this.findOne(quoteId, organizationId);

    if (![QuoteStatus.DRAFT, QuoteStatus.PENDING_REVIEW].includes(quote.status)) {
      throw new BadRequestException('Cannot remove lines from this quote');
    }

    const line = await this.prisma.quoteLine.findFirst({
      where: { id: lineId, quoteId },
    });

    if (!line) {
      throw new NotFoundException('Quote line not found');
    }

    await this.prisma.quoteLine.delete({
      where: { id: lineId },
    });

    // Recalculate quote totals
    await this.recalculateTotals(quoteId);
  }

  // ===========================================================================
  // QUOT-014: Create Quote Revision
  // ===========================================================================

  async createRevision(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<Quote> {
    const quote = await this.findOne(id, organizationId);

    // Create new revision
    const newRevision = quote.revision + 1;

    const newQuote = await this.prisma.$transaction(async (tx) => {
      // Create new quote with incremented revision
      const created = await tx.quote.create({
        data: {
          organizationId: quote.organizationId,
          facilityId: quote.facilityId,
          quoteNumber: quote.quoteNumber,
          revision: newRevision,
          customerId: quote.customerId,
          contactId: quote.contactId,
          status: QuoteStatus.DRAFT,
          priority: quote.priority,
          rfqNumber: quote.rfqNumber,
          rfqDate: quote.rfqDate,
          validUntil: quote.validUntil,
          requestedDelivery: quote.requestedDelivery,
          paymentTerms: quote.paymentTerms,
          fobPoint: quote.fobPoint,
          shippingMethod: quote.shippingMethod,
          shipToAddressId: quote.shipToAddressId,
          billToAddressId: quote.billToAddressId,
          salesRepId: quote.salesRepId,
          internalNotes: quote.internalNotes,
          customerNotes: quote.customerNotes,
          termsAndConditions: quote.termsAndConditions,
          createdBy: userId,
        },
      });

      // Copy lines
      if (quote.lines && quote.lines.length > 0) {
        for (const line of quote.lines) {
          await tx.quoteLine.create({
            data: {
              quoteId: created.id,
              lineNumber: line.lineNumber,
              partId: line.partId,
              partNumber: line.partNumber,
              partRevision: line.partRevision,
              description: line.description,
              quantity: line.quantity,
              uom: line.uom,
              unitPrice: line.unitPrice,
              extendedPrice: line.extendedPrice,
              unitCost: line.unitCost,
              discountPercent: line.discountPercent,
              discountAmount: line.discountAmount,
              requestedDate: line.requestedDate,
              promisedDate: line.promisedDate,
              leadDays: line.leadDays,
              notes: line.notes,
            },
          });
        }
      }

      // Recalculate totals for new quote
      await this.recalculateTotalsInTx(tx, created.id);

      return created;
    });

    await this.auditService.log({
      action: 'QUOTE_REVISION_CREATED',
      entityType: 'Quote',
      entityId: newQuote.id,
      entityName: `${newQuote.quoteNumber} Rev ${newRevision}`,
      metadata: { originalQuoteId: id, revision: newRevision },
      userId,
      organizationId,
    });

    return newQuote;
  }

  // ===========================================================================
  // Helper: Generate Quote Number
  // ===========================================================================

  private async generateQuoteNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear().toString().slice(-2);
    const prefix = `Q${year}`;

    const lastQuote = await this.prisma.quote.findFirst({
      where: {
        organizationId,
        quoteNumber: { startsWith: prefix },
      },
      orderBy: { quoteNumber: 'desc' },
    });

    let sequence = 1;
    if (lastQuote) {
      const lastNumber = parseInt(lastQuote.quoteNumber.slice(-5), 10);
      sequence = lastNumber + 1;
    }

    return `${prefix}-${sequence.toString().padStart(5, '0')}`;
  }

  // ===========================================================================
  // Helper: Generate Order Number (used during conversion)
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
  // Helper: Recalculate Quote Totals
  // ===========================================================================

  private async recalculateTotals(quoteId: string): Promise<void> {
    const lines = await this.prisma.quoteLine.findMany({
      where: { quoteId },
    });

    const subtotal = lines.reduce(
      (sum, line) => sum + Number(line.extendedPrice),
      0,
    );

    const quote = await this.prisma.quote.findUnique({
      where: { id: quoteId },
    });

    if (!quote) return;

    let total = subtotal;

    // Apply discount
    if (quote.discountPercent) {
      const discount = subtotal * (Number(quote.discountPercent) / 100);
      total -= discount;
    } else if (quote.discountAmount) {
      total -= Number(quote.discountAmount);
    }

    // Add tax
    if (quote.taxRate) {
      const tax = total * Number(quote.taxRate);
      total += tax;
    }

    // Add shipping
    if (quote.shippingAmount) {
      total += Number(quote.shippingAmount);
    }

    await this.prisma.quote.update({
      where: { id: quoteId },
      data: {
        subtotal,
        total,
      },
    });
  }

  private async recalculateTotalsInTx(tx: any, quoteId: string): Promise<void> {
    const lines = await tx.quoteLine.findMany({
      where: { quoteId },
    });

    const subtotal = lines.reduce(
      (sum: number, line: QuoteLine) => sum + Number(line.extendedPrice),
      0,
    );

    await tx.quote.update({
      where: { id: quoteId },
      data: { subtotal, total: subtotal },
    });
  }
}
