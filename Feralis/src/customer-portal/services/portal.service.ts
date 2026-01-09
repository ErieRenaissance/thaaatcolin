/**
 * FERALIS MANUFACTURING PLATFORM
 * Phase 7: Analytics & Customer Portal
 * 
 * Customer Portal Service Implementation
 */

import { 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ForbiddenException,
  UnauthorizedException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, LessThan, MoreThan, Between } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  PortalUser,
  PortalSession,
  PortalUserProfile,
  CustomerPortalConfig,
  RFQ,
  RFQLine,
  ApprovalRequest,
  ApprovalHistory,
  MessageThread,
  Message,
  PortalNotification,
  PortalActivityLog,
  DocumentAccessLog,
  SavedSearch,
  Favorite,
  PortalOrderSummary,
  PortalOrderDetail,
  PortalQuoteSummary,
  PortalQuoteDetail,
  PortalDashboardResponse,
  PortalLoginRequest,
  PortalLoginResponse,
  CreateRFQRequest,
  SubmitApprovalRequest,
  DelegateApprovalRequest,
  CreateMessageRequest,
  PortalOrdersRequest,
  PortalOrdersResponse,
  PortalQuotesRequest,
  PortalQuotesResponse,
  ConvertQuoteToOrderRequest,
  PendingApproval,
  ShipmentSummary,
  RFQStatus,
  ApprovalStatus,
  SessionStatus,
  NotificationType,
  PortalRole,
  MessagePriority,
  SenderType,
  DocumentAccessType
} from './entities/portal.entity';

@Injectable()
export class CustomerPortalService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_EXPIRY = '24h';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository('PortalUser')
    private readonly portalUserRepo: Repository<PortalUser>,
    @InjectRepository('PortalSession')
    private readonly sessionRepo: Repository<PortalSession>,
    @InjectRepository('CustomerPortalConfig')
    private readonly configRepo: Repository<CustomerPortalConfig>,
    @InjectRepository('RFQ')
    private readonly rfqRepo: Repository<RFQ>,
    @InjectRepository('RFQLine')
    private readonly rfqLineRepo: Repository<RFQLine>,
    @InjectRepository('ApprovalRequest')
    private readonly approvalRepo: Repository<ApprovalRequest>,
    @InjectRepository('ApprovalHistory')
    private readonly approvalHistoryRepo: Repository<ApprovalHistory>,
    @InjectRepository('MessageThread')
    private readonly threadRepo: Repository<MessageThread>,
    @InjectRepository('Message')
    private readonly messageRepo: Repository<Message>,
    @InjectRepository('PortalNotification')
    private readonly notificationRepo: Repository<PortalNotification>,
    @InjectRepository('PortalActivityLog')
    private readonly activityRepo: Repository<PortalActivityLog>,
    @InjectRepository('DocumentAccessLog')
    private readonly documentAccessRepo: Repository<DocumentAccessLog>,
    @InjectRepository('SavedSearch')
    private readonly savedSearchRepo: Repository<SavedSearch>,
    @InjectRepository('Favorite')
    private readonly favoriteRepo: Repository<Favorite>,
  ) {}

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  async login(
    request: PortalLoginRequest,
    ipAddress: string,
    userAgent: string
  ): Promise<PortalLoginResponse> {
    // Find user by email
    const user = await this.dataSource.query(
      `SELECT u.*, pu.id as portal_user_id, pu.customer_id, pu.portal_role, 
              pu.permissions, pu.is_active as portal_active, pu.can_place_orders,
              pu.can_approve, pu.can_view_pricing, pu.approval_limit,
              pu.notification_preferences
       FROM public."user" u
       JOIN portal.portal_user pu ON u.id = pu.user_id
       WHERE u.email = $1 AND u.is_active = true AND pu.is_active = true
       LIMIT 1`,
      [request.email]
    );

    if (!user || user.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const userData = user[0];

    // Verify password
    const passwordValid = await bcrypt.compare(request.password, userData.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if portal is enabled for customer
    const config = await this.configRepo.findOne({
      where: { customerId: userData.customer_id, isEnabled: true }
    });

    if (!config) {
      throw new ForbiddenException('Portal access is not enabled for your organization');
    }

    // Create session
    const sessionToken = this.generateToken();
    const refreshToken = request.rememberMe ? this.generateToken() : undefined;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.sessionRepo.save({
      portalUserId: userData.portal_user_id,
      sessionToken,
      refreshToken,
      userAgent,
      ipAddress,
      deviceFingerprint: request.deviceFingerprint,
      status: SessionStatus.ACTIVE,
      expiresAt,
      lastActivityAt: new Date()
    });

    // Update last login
    await this.portalUserRepo.update(userData.portal_user_id, {
      lastLoginAt: new Date(),
      lastActivityAt: new Date()
    });

    // Log activity
    await this.logActivity(
      userData.portal_user_id,
      userData.customer_id,
      'LOGIN',
      'User logged in',
      undefined,
      undefined,
      { ipAddress, userAgent }
    );

    // Generate JWT
    const accessToken = jwt.sign(
      {
        portalUserId: userData.portal_user_id,
        userId: userData.id,
        customerId: userData.customer_id,
        role: userData.portal_role
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRY }
    );

    // Get customer name
    const customer = await this.dataSource.query(
      'SELECT name FROM customers.customer WHERE id = $1',
      [userData.customer_id]
    );

    return {
      accessToken,
      refreshToken: refreshToken || '',
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      user: {
        id: userData.portal_user_id,
        userId: userData.id,
        customerId: userData.customer_id,
        customerName: customer[0]?.name || '',
        firstName: userData.first_name,
        lastName: userData.last_name,
        email: userData.email,
        phone: userData.phone,
        title: userData.job_title,
        department: userData.department,
        portalRole: userData.portal_role,
        permissions: userData.permissions || [],
        canPlaceOrders: userData.can_place_orders,
        canApprove: userData.can_approve,
        canViewPricing: userData.can_view_pricing,
        approvalLimit: userData.approval_limit,
        notificationPreferences: userData.notification_preferences || {},
        lastLoginAt: new Date()
      }
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessionRepo.update(
      { sessionToken },
      { status: SessionStatus.LOGGED_OUT, endedAt: new Date() }
    );
  }

  async refreshSession(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    const session = await this.sessionRepo.findOne({
      where: { refreshToken, status: SessionStatus.ACTIVE }
    });

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const portalUser = await this.portalUserRepo.findOne({
      where: { id: session.portalUserId, isActive: true }
    });

    if (!portalUser) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Generate new access token
    const accessToken = jwt.sign(
      {
        portalUserId: portalUser.id,
        userId: portalUser.userId,
        customerId: portalUser.customerId,
        role: portalUser.portalRole
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRY }
    );

    // Update session activity
    await this.sessionRepo.update(session.id, {
      lastActivityAt: new Date()
    });

    return {
      accessToken,
      expiresIn: 24 * 60 * 60
    };
  }

  async validateSession(token: string): Promise<PortalUser | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;
      
      const portalUser = await this.portalUserRepo.findOne({
        where: { id: decoded.portalUserId, isActive: true }
      });

      if (!portalUser) return null;

      // Update activity timestamp
      await this.portalUserRepo.update(portalUser.id, {
        lastActivityAt: new Date()
      });

      return portalUser;
    } catch {
      return null;
    }
  }

  private generateToken(): string {
    return uuidv4() + '-' + Date.now().toString(36);
  }

  // ============================================================================
  // PORTAL DASHBOARD
  // ============================================================================

  async getDashboard(
    portalUserId: string,
    customerId: string
  ): Promise<PortalDashboardResponse> {
    // Get summary counts
    const orderCounts = await this.dataSource.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'SHIPPED')) as open_orders,
        COUNT(*) FILTER (WHERE status = 'IN_PRODUCTION') as in_production,
        COUNT(*) FILTER (WHERE shipped_at >= date_trunc('month', CURRENT_DATE)) as shipped_this_month
       FROM orders."order"
       WHERE customer_id = $1`,
      [customerId]
    );

    const quoteCounts = await this.dataSource.query(
      `SELECT COUNT(*) as pending
       FROM quotes.quote
       WHERE customer_id = $1 
         AND status IN ('SENT', 'FOLLOW_UP')
         AND valid_until >= CURRENT_DATE`,
      [customerId]
    );

    const approvalCount = await this.approvalRepo.count({
      where: { customerId, status: ApprovalStatus.PENDING }
    });

    const unreadMessages = await this.notificationRepo.count({
      where: { portalUserId, isRead: false }
    });

    // Get recent orders
    const recentOrders = await this.getOrders(customerId, {
      page: 1,
      pageSize: 5,
      sortBy: 'orderDate',
      sortDirection: 'DESC'
    });

    // Get pending approvals
    const pendingApprovals = await this.getPendingApprovals(portalUserId, customerId);

    // Get active quotes
    const activeQuotes = await this.getQuotes(customerId, {
      page: 1,
      pageSize: 5,
      status: ['SENT', 'FOLLOW_UP'],
      sortBy: 'validUntil',
      sortDirection: 'ASC'
    });

    // Get recent shipments
    const recentShipments = await this.getRecentShipments(customerId, 5);

    // Get notifications
    const notifications = await this.getNotifications(portalUserId, false, 10);

    return {
      summary: {
        openOrders: parseInt(orderCounts[0]?.open_orders || '0'),
        ordersInProduction: parseInt(orderCounts[0]?.in_production || '0'),
        ordersShippedThisMonth: parseInt(orderCounts[0]?.shipped_this_month || '0'),
        pendingQuotes: parseInt(quoteCounts[0]?.pending || '0'),
        pendingApprovals: approvalCount,
        unreadMessages
      },
      recentOrders: recentOrders.orders,
      pendingApprovals: pendingApprovals.slice(0, 5),
      activeQuotes: activeQuotes.quotes,
      recentShipments,
      notifications
    };
  }

  // ============================================================================
  // ORDERS
  // ============================================================================

  async getOrders(
    customerId: string,
    request: PortalOrdersRequest
  ): Promise<PortalOrdersResponse> {
    const {
      page = 1,
      pageSize = 20,
      status,
      search,
      sortBy = 'orderDate',
      sortDirection = 'DESC',
      dateFrom,
      dateTo
    } = request;

    let query = `
      SELECT 
        o.id, o.order_number, o.customer_po, o.status, o.priority,
        o.order_date, o.due_date, o.promised_date, o.ship_date,
        o.subtotal, o.total, o.currency, o.line_count,
        COALESCE(
          (SELECT AVG(ol.progress_percent)::int FROM orders.order_line ol WHERE ol.order_id = o.id),
          0
        ) as progress_percent
      FROM orders."order" o
      WHERE o.customer_id = $1 AND o.deleted_at IS NULL
    `;
    const params: any[] = [customerId];
    let paramIndex = 2;

    if (status && status.length > 0) {
      query += ` AND o.status = ANY($${paramIndex})`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (o.order_number ILIKE $${paramIndex} OR o.customer_po ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (dateFrom) {
      query += ` AND o.order_date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      query += ` AND o.order_date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    // Count query
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM (${query}) as subq`,
      params
    );
    const total = parseInt(countResult[0]?.total || '0');

    // Add sorting and pagination
    const sortColumn = this.mapOrderSortColumn(sortBy);
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, (page - 1) * pageSize);

    const orders = await this.dataSource.query(query, params);

    return {
      orders: orders.map(this.mapToPortalOrderSummary),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  async getOrderById(
    customerId: string,
    orderId: string,
    canViewPricing: boolean
  ): Promise<PortalOrderDetail> {
    const orderResult = await this.dataSource.query(
      `SELECT 
        o.*, 
        cc.first_name || ' ' || cc.last_name as contact_name,
        ship.name as ship_to_name, ship.address_line1 as ship_to_line1,
        ship.city as ship_to_city, ship.state as ship_to_state,
        ship.postal_code as ship_to_postal, ship.country as ship_to_country,
        bill.name as bill_to_name, bill.address_line1 as bill_to_line1,
        bill.city as bill_to_city, bill.state as bill_to_state,
        bill.postal_code as bill_to_postal, bill.country as bill_to_country
       FROM orders."order" o
       LEFT JOIN customers.customer_contact cc ON o.contact_id = cc.id
       LEFT JOIN customers.customer_address ship ON o.ship_to_address_id = ship.id
       LEFT JOIN customers.customer_address bill ON o.bill_to_address_id = bill.id
       WHERE o.id = $1 AND o.customer_id = $2`,
      [orderId, customerId]
    );

    if (!orderResult || orderResult.length === 0) {
      throw new NotFoundException('Order not found');
    }

    const order = orderResult[0];

    // Get order lines
    const lines = await this.dataSource.query(
      `SELECT 
        ol.*, p.part_number, p.customer_part_number
       FROM orders.order_line ol
       LEFT JOIN parts.part p ON ol.part_id = p.id
       WHERE ol.order_id = $1
       ORDER BY ol.line_number`,
      [orderId]
    );

    // Get documents
    const documents = await this.dataSource.query(
      `SELECT id, file_name, document_type, file_size, created_at
       FROM public.file_attachment
       WHERE entity_type = 'ORDER' AND entity_id = $1 AND is_customer_visible = true`,
      [orderId]
    );

    // Get shipments
    const shipments = await this.dataSource.query(
      `SELECT s.id, s.shipment_number, c.name as carrier, s.tracking_number,
              s.status, s.ship_date, s.actual_delivery, s.package_count
       FROM shipping.shipment s
       LEFT JOIN shipping.carrier c ON s.carrier_id = c.id
       WHERE s.order_id = $1`,
      [orderId]
    );

    // Get milestones
    const milestones = await this.dataSource.query(
      `SELECT milestone_type, name, planned_date, actual_date, status
       FROM orders.order_milestone
       WHERE order_id = $1
       ORDER BY sequence`,
      [orderId]
    );

    return {
      ...this.mapToPortalOrderSummary(order),
      contactName: order.contact_name,
      shipToAddress: order.ship_to_name ? {
        name: order.ship_to_name,
        addressLine1: order.ship_to_line1,
        city: order.ship_to_city,
        state: order.ship_to_state,
        postalCode: order.ship_to_postal,
        country: order.ship_to_country
      } : undefined,
      billToAddress: order.bill_to_name ? {
        name: order.bill_to_name,
        addressLine1: order.bill_to_line1,
        city: order.bill_to_city,
        state: order.bill_to_state,
        postalCode: order.bill_to_postal,
        country: order.bill_to_country
      } : undefined,
      shippingMethod: order.shipping_method,
      lines: lines.map((l: any) => ({
        id: l.id,
        lineNumber: l.line_number,
        partNumber: l.part_number,
        customerPartNumber: l.customer_part_number,
        description: l.description,
        quantityOrdered: l.quantity_ordered,
        quantityShipped: l.quantity_shipped,
        quantityRemaining: l.quantity_ordered - l.quantity_shipped - (l.quantity_cancelled || 0),
        unitPrice: canViewPricing ? l.unit_price : undefined,
        lineTotal: canViewPricing ? l.line_total : undefined,
        status: l.status,
        requestedDate: l.requested_date,
        promisedDate: l.promised_date,
        progressPercent: l.progress_percent || 0
      })),
      documents: documents.map((d: any) => ({
        id: d.id,
        fileName: d.file_name,
        documentType: d.document_type,
        fileSize: d.file_size,
        uploadedAt: d.created_at,
        downloadUrl: `/api/portal/documents/${d.id}/download`
      })),
      shipments: shipments.map((s: any) => ({
        id: s.id,
        shipmentNumber: s.shipment_number,
        carrier: s.carrier,
        trackingNumber: s.tracking_number,
        trackingUrl: this.getTrackingUrl(s.carrier, s.tracking_number),
        status: s.status,
        shipDate: s.ship_date,
        deliveryDate: s.actual_delivery,
        packageCount: s.package_count
      })),
      timeline: this.buildOrderTimeline(order, milestones)
    };
  }

  private mapOrderSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      orderDate: 'o.order_date',
      dueDate: 'o.due_date',
      orderNumber: 'o.order_number',
      status: 'o.status',
      total: 'o.total'
    };
    return mapping[sortBy] || 'o.order_date';
  }

  private mapToPortalOrderSummary(order: any): PortalOrderSummary {
    return {
      id: order.id,
      orderNumber: order.order_number,
      customerPo: order.customer_po,
      status: order.status,
      statusDisplay: this.getStatusDisplay(order.status),
      priority: order.priority,
      orderDate: order.order_date,
      dueDate: order.due_date,
      promisedDate: order.promised_date,
      shipDate: order.ship_date,
      progressPercent: order.progress_percent || 0,
      currentStage: this.getCurrentStage(order.status),
      subtotal: order.subtotal,
      total: order.total,
      currency: order.currency || 'USD',
      lineCount: order.line_count || 0
    };
  }

  private getStatusDisplay(status: string): string {
    const mapping: Record<string, string> = {
      DRAFT: 'Draft',
      CONFIRMED: 'Order Confirmed',
      QUEUED: 'In Queue',
      IN_PRODUCTION: 'In Production',
      FINISHING: 'In Finishing',
      PACKAGING: 'Being Packaged',
      READY_TO_SHIP: 'Ready to Ship',
      SHIPPED: 'Shipped',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
      ON_HOLD: 'On Hold'
    };
    return mapping[status] || status;
  }

  private getCurrentStage(status: string): string {
    const mapping: Record<string, string> = {
      DRAFT: 'Order Entry',
      CONFIRMED: 'Material Prep',
      QUEUED: 'Production Queue',
      IN_PRODUCTION: 'Manufacturing',
      FINISHING: 'Surface Treatment',
      PACKAGING: 'Packaging',
      READY_TO_SHIP: 'Shipping',
      SHIPPED: 'In Transit',
      COMPLETED: 'Delivered'
    };
    return mapping[status] || 'Processing';
  }

  private getTrackingUrl(carrier: string, trackingNumber: string): string | undefined {
    if (!carrier || !trackingNumber) return undefined;
    
    const urls: Record<string, string> = {
      'FedEx': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
      'UPS': `https://www.ups.com/track?tracknum=${trackingNumber}`,
      'USPS': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      'DHL': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
    };
    
    return urls[carrier];
  }

  private buildOrderTimeline(order: any, milestones: any[]): any[] {
    const events = [];
    const now = new Date();

    // Add standard stages
    const stages = [
      { type: 'ORDER_RECEIVED', title: 'Order Received', date: order.created_at },
      { type: 'ORDER_CONFIRMED', title: 'Order Confirmed', date: order.confirmed_at },
      { type: 'PRODUCTION_STARTED', title: 'Production Started', date: order.actual_start },
      { type: 'PRODUCTION_COMPLETE', title: 'Production Complete', date: null },
      { type: 'SHIPPED', title: 'Shipped', date: order.shipped_at },
      { type: 'DELIVERED', title: 'Delivered', date: order.completed_at }
    ];

    for (const stage of stages) {
      let status: 'COMPLETE' | 'CURRENT' | 'PENDING' = 'PENDING';
      
      if (stage.date) {
        status = 'COMPLETE';
      } else if (this.isCurrentStage(order.status, stage.type)) {
        status = 'CURRENT';
      }

      events.push({
        type: stage.type,
        title: stage.title,
        timestamp: stage.date || null,
        status
      });
    }

    return events;
  }

  private isCurrentStage(orderStatus: string, stageType: string): boolean {
    const stageMapping: Record<string, string[]> = {
      ORDER_RECEIVED: ['DRAFT'],
      ORDER_CONFIRMED: ['CONFIRMED'],
      PRODUCTION_STARTED: ['QUEUED', 'IN_PRODUCTION', 'FINISHING', 'PACKAGING'],
      PRODUCTION_COMPLETE: ['READY_TO_SHIP'],
      SHIPPED: ['SHIPPED'],
      DELIVERED: ['COMPLETED']
    };
    return stageMapping[stageType]?.includes(orderStatus) || false;
  }

  // ============================================================================
  // QUOTES
  // ============================================================================

  async getQuotes(
    customerId: string,
    request: PortalQuotesRequest
  ): Promise<PortalQuotesResponse> {
    const {
      page = 1,
      pageSize = 20,
      status,
      search,
      sortBy = 'quoteDate',
      sortDirection = 'DESC',
      includeExpired = false
    } = request;

    let query = `
      SELECT 
        q.id, q.quote_number, q.rfq_reference, q.status, q.version,
        q.quote_date, q.valid_until, q.total_value, q.currency,
        (SELECT COUNT(*) FROM quotes.quote_line ql WHERE ql.quote_id = q.id) as line_count
      FROM quotes.quote q
      WHERE q.customer_id = $1 AND q.deleted_at IS NULL
    `;
    const params: any[] = [customerId];
    let paramIndex = 2;

    if (!includeExpired) {
      query += ` AND (q.valid_until >= CURRENT_DATE OR q.status = 'ACCEPTED')`;
    }

    if (status && status.length > 0) {
      query += ` AND q.status = ANY($${paramIndex})`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (q.quote_number ILIKE $${paramIndex} OR q.rfq_reference ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count query
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM (${query}) as subq`,
      params
    );
    const total = parseInt(countResult[0]?.total || '0');

    // Add sorting and pagination
    const sortColumn = sortBy === 'validUntil' ? 'q.valid_until' : 
                       sortBy === 'quoteNumber' ? 'q.quote_number' : 'q.quote_date';
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, (page - 1) * pageSize);

    const quotes = await this.dataSource.query(query, params);

    return {
      quotes: quotes.map((q: any) => this.mapToPortalQuoteSummary(q)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  private mapToPortalQuoteSummary(quote: any): PortalQuoteSummary {
    const now = new Date();
    const validUntil = new Date(quote.valid_until);
    const daysUntilExpiry = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      id: quote.id,
      quoteNumber: quote.quote_number,
      rfqReference: quote.rfq_reference,
      status: quote.status,
      statusDisplay: this.getQuoteStatusDisplay(quote.status),
      version: quote.version,
      quoteDate: quote.quote_date,
      validUntil: quote.valid_until,
      daysUntilExpiry,
      isExpired: daysUntilExpiry < 0,
      totalValue: quote.total_value,
      currency: quote.currency || 'USD',
      lineCount: parseInt(quote.line_count || '0'),
      canAccept: ['SENT', 'FOLLOW_UP'].includes(quote.status) && daysUntilExpiry >= 0,
      canRequestRevision: ['SENT', 'FOLLOW_UP'].includes(quote.status)
    };
  }

  private getQuoteStatusDisplay(status: string): string {
    const mapping: Record<string, string> = {
      DRAFT: 'Draft',
      ANALYZING: 'Being Analyzed',
      PENDING_APPROVAL: 'Pending Approval',
      APPROVED: 'Approved',
      SENT: 'Awaiting Response',
      FOLLOW_UP: 'Follow-up',
      REVISION_REQUESTED: 'Revision Requested',
      ACCEPTED: 'Accepted',
      DECLINED: 'Declined',
      EXPIRED: 'Expired',
      CONVERTED: 'Converted to Order'
    };
    return mapping[status] || status;
  }

  async convertQuoteToOrder(
    portalUserId: string,
    customerId: string,
    request: ConvertQuoteToOrderRequest
  ): Promise<string> {
    // Verify quote
    const quote = await this.dataSource.query(
      `SELECT * FROM quotes.quote WHERE id = $1 AND customer_id = $2`,
      [request.quoteId, customerId]
    );

    if (!quote || quote.length === 0) {
      throw new NotFoundException('Quote not found');
    }

    if (!['SENT', 'FOLLOW_UP', 'APPROVED'].includes(quote[0].status)) {
      throw new BadRequestException('Quote cannot be converted to order');
    }

    if (new Date(quote[0].valid_until) < new Date()) {
      throw new BadRequestException('Quote has expired');
    }

    // This would call an internal order creation service
    // For now, return a placeholder
    const orderId = uuidv4();

    // Log activity
    await this.logActivity(
      portalUserId,
      customerId,
      'ORDER_PLACED',
      `Converted quote ${quote[0].quote_number} to order`,
      'QUOTE',
      request.quoteId
    );

    return orderId;
  }

  // ============================================================================
  // RFQ MANAGEMENT
  // ============================================================================

  async createRFQ(
    organizationId: string,
    portalUserId: string,
    customerId: string,
    request: CreateRFQRequest
  ): Promise<RFQ> {
    // Generate RFQ number
    const rfqNumber = await this.dataSource.query(
      `SELECT portal.generate_rfq_number($1) as rfq_number`,
      [organizationId]
    );

    const rfq = await this.rfqRepo.save({
      organizationId,
      customerId,
      rfqNumber: rfqNumber[0].rfq_number,
      customerReference: request.customerReference,
      submittedBy: portalUserId,
      submittedAt: new Date(),
      status: RFQStatus.SUBMITTED,
      materialPreference: request.materialPreference,
      finishRequirements: request.finishRequirements,
      toleranceRequirements: request.toleranceRequirements,
      quantityTiers: request.quantityTiers || [],
      requestedDeliveryDate: request.requestedDeliveryDate,
      deliveryUrgency: request.deliveryUrgency || 'STANDARD',
      customerNotes: request.customerNotes,
      cadFileIds: [],
      drawingFileIds: [],
      supportingFileIds: [],
      instantQuoteEligible: false
    });

    // Create RFQ lines
    for (let i = 0; i < request.lines.length; i++) {
      const line = request.lines[i];
      await this.rfqLineRepo.save({
        rfqId: rfq.id,
        lineNumber: i + 1,
        partName: line.partName,
        partNumber: line.partNumber,
        description: line.description,
        material: line.material,
        finish: line.finish,
        quantity: line.quantity,
        cadFileId: line.cadFileId,
        drawingFileId: line.drawingFileId,
        notes: line.notes
      });
    }

    // Log activity
    await this.logActivity(
      portalUserId,
      customerId,
      'RFQ_SUBMITTED',
      `Submitted RFQ ${rfq.rfqNumber}`,
      'RFQ',
      rfq.id
    );

    // Create notification for internal team (placeholder)

    return rfq;
  }

  async getRFQs(
    customerId: string,
    options: { page?: number; pageSize?: number; status?: RFQStatus[] } = {}
  ): Promise<{ rfqs: RFQ[]; total: number }> {
    const { page = 1, pageSize = 20, status } = options;

    const where: any = { customerId };
    if (status && status.length > 0) {
      where.status = In(status);
    }

    const [rfqs, total] = await this.rfqRepo.findAndCount({
      where,
      order: { submittedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    return { rfqs, total };
  }

  // ============================================================================
  // APPROVALS
  // ============================================================================

  async getPendingApprovals(
    portalUserId: string,
    customerId: string
  ): Promise<PendingApproval[]> {
    const approvals = await this.approvalRepo.find({
      where: [
        { customerId, status: ApprovalStatus.PENDING, assignedTo: portalUserId },
        { customerId, status: ApprovalStatus.PENDING, assignedTo: null }
      ],
      order: { deadline: 'ASC' }
    });

    const results: PendingApproval[] = [];
    for (const approval of approvals) {
      const docs = await this.dataSource.query(
        `SELECT id, file_name, file_type, file_size, document_type
         FROM public.file_attachment
         WHERE id = ANY($1)`,
        [approval.documentIds || []]
      );

      const now = new Date();
      const deadline = approval.deadline ? new Date(approval.deadline) : null;
      const daysRemaining = deadline 
        ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      results.push({
        id: approval.id,
        requestNumber: approval.requestNumber,
        requestType: approval.requestType as any,
        title: approval.title,
        description: approval.description,
        entityType: approval.entityType,
        entityId: approval.entityId,
        deadline: approval.deadline,
        daysRemaining,
        isOverdue: daysRemaining !== null && daysRemaining < 0,
        documents: docs.map((d: any) => ({
          id: d.id,
          fileName: d.file_name,
          fileType: d.file_type,
          fileSize: d.file_size,
          documentType: d.document_type,
          downloadUrl: `/api/portal/documents/${d.id}/download`
        })),
        createdAt: approval.createdAt
      });
    }

    return results;
  }

  async submitApproval(
    portalUserId: string,
    customerId: string,
    approvalId: string,
    request: SubmitApprovalRequest,
    ipAddress: string
  ): Promise<ApprovalRequest> {
    const approval = await this.approvalRepo.findOne({
      where: { id: approvalId, customerId }
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Approval has already been processed');
    }

    const newStatus = request.action === 'APPROVE' 
      ? ApprovalStatus.APPROVED 
      : ApprovalStatus.REJECTED;

    // Update approval
    await this.approvalRepo.update(approvalId, {
      status: newStatus,
      resolvedBy: portalUserId,
      resolvedAt: new Date(),
      resolutionNotes: request.comments,
      digitalSignature: request.signature
    });

    // Add history record
    await this.approvalHistoryRepo.save({
      approvalRequestId: approvalId,
      action: request.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      actionBy: portalUserId,
      actionAt: new Date(),
      comments: request.comments,
      digitalSignature: request.signature,
      ipAddress
    });

    // Log activity
    await this.logActivity(
      portalUserId,
      customerId,
      `APPROVAL_${request.action}`,
      `${request.action === 'APPROVE' ? 'Approved' : 'Rejected'} ${approval.title}`,
      'APPROVAL',
      approvalId
    );

    return await this.approvalRepo.findOne({ where: { id: approvalId } });
  }

  async delegateApproval(
    portalUserId: string,
    customerId: string,
    approvalId: string,
    request: DelegateApprovalRequest
  ): Promise<ApprovalRequest> {
    const approval = await this.approvalRepo.findOne({
      where: { id: approvalId, customerId }
    });

    if (!approval) {
      throw new NotFoundException('Approval request not found');
    }

    // Update approval
    await this.approvalRepo.update(approvalId, {
      delegatedTo: request.delegateTo,
      delegatedAt: new Date(),
      delegationNotes: request.notes
    });

    // Add history record
    await this.approvalHistoryRepo.save({
      approvalRequestId: approvalId,
      action: 'DELEGATED',
      actionBy: portalUserId,
      actionAt: new Date(),
      comments: request.notes
    });

    // Create notification for delegate
    await this.createNotification(
      request.delegateTo,
      NotificationType.APPROVAL_REQUIRED,
      'Approval Delegated to You',
      `You have been delegated approval for: ${approval.title}`,
      'APPROVAL',
      approvalId,
      `/portal/approvals/${approvalId}`
    );

    return await this.approvalRepo.findOne({ where: { id: approvalId } });
  }

  // ============================================================================
  // MESSAGING
  // ============================================================================

  async getMessageThreads(
    portalUserId: string,
    customerId: string,
    options: { open?: boolean; page?: number; pageSize?: number } = {}
  ): Promise<{ threads: any[]; total: number }> {
    const { open, page = 1, pageSize = 20 } = options;

    const where: any = { customerId, isArchived: false };
    if (open !== undefined) {
      where.isOpen = open;
    }

    const [threads, total] = await this.threadRepo.findAndCount({
      where,
      order: { lastMessageAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize
    });

    const threadSummaries = await Promise.all(threads.map(async (t) => {
      // Get last message
      const lastMessage = await this.messageRepo.findOne({
        where: { threadId: t.id },
        order: { createdAt: 'DESC' }
      });

      // Count unread
      const unreadCount = await this.messageRepo.count({
        where: {
          threadId: t.id,
          senderType: SenderType.INTERNAL,
          readByCustomer: false
        }
      });

      return {
        id: t.id,
        subject: t.subject,
        entityType: t.entityType,
        entityId: t.entityId,
        priority: t.priority,
        isOpen: t.isOpen,
        messageCount: t.messageCount,
        unreadCount,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          senderType: lastMessage.senderType,
          senderName: '', // Would be populated from user lookup
          bodyPreview: lastMessage.body.substring(0, 100),
          createdAt: lastMessage.createdAt,
          hasAttachments: lastMessage.attachmentIds?.length > 0
        } : undefined,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt
      };
    }));

    return { threads: threadSummaries, total };
  }

  async sendMessage(
    organizationId: string,
    portalUserId: string,
    customerId: string,
    request: CreateMessageRequest
  ): Promise<Message> {
    let thread: MessageThread;

    if (request.threadId) {
      // Add to existing thread
      thread = await this.threadRepo.findOne({
        where: { id: request.threadId, customerId }
      });
      if (!thread) {
        throw new NotFoundException('Thread not found');
      }
    } else {
      // Create new thread
      if (!request.subject) {
        throw new BadRequestException('Subject is required for new threads');
      }

      thread = await this.threadRepo.save({
        organizationId,
        customerId,
        subject: request.subject,
        entityType: request.entityType,
        entityId: request.entityId,
        tags: [],
        priority: request.priority || MessagePriority.NORMAL,
        isOpen: true,
        isArchived: false,
        messageCount: 0
      });
    }

    // Create message
    const message = await this.messageRepo.save({
      threadId: thread.id,
      senderType: SenderType.CUSTOMER,
      senderPortalUserId: portalUserId,
      body: request.body,
      attachmentIds: request.attachmentIds || [],
      status: 'SENT',
      readByCustomer: true,
      readByCustomerAt: new Date(),
      readByInternal: false
    });

    // Log activity
    await this.logActivity(
      portalUserId,
      customerId,
      'MESSAGE_SENT',
      `Sent message in thread: ${thread.subject}`,
      'MESSAGE_THREAD',
      thread.id
    );

    return message;
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  async getNotifications(
    portalUserId: string,
    unreadOnly: boolean = false,
    limit: number = 50
  ): Promise<PortalNotification[]> {
    const where: any = { portalUserId };
    if (unreadOnly) {
      where.isRead = false;
    }

    return await this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async markNotificationRead(
    portalUserId: string,
    notificationId: string
  ): Promise<void> {
    await this.notificationRepo.update(
      { id: notificationId, portalUserId },
      { isRead: true, readAt: new Date() }
    );
  }

  async markAllNotificationsRead(portalUserId: string): Promise<void> {
    await this.notificationRepo.update(
      { portalUserId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  private async createNotification(
    portalUserId: string,
    type: NotificationType,
    title: string,
    body: string,
    entityType?: string,
    entityId?: string,
    actionUrl?: string,
    priority: MessagePriority = MessagePriority.NORMAL
  ): Promise<PortalNotification> {
    return await this.notificationRepo.save({
      portalUserId,
      notificationType: type,
      title,
      body,
      entityType,
      entityId,
      actionUrl,
      priority,
      channels: ['IN_APP'],
      isRead: false,
      isDismissed: false,
      emailSent: false,
      smsSent: false
    });
  }

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  async getDocuments(
    customerId: string,
    options: {
      entityType?: string;
      entityId?: string;
      documentType?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ): Promise<{ documents: any[]; total: number }> {
    const { entityType, entityId, documentType, search, page = 1, pageSize = 20 } = options;

    let query = `
      SELECT fa.*, 
             CASE 
               WHEN fa.entity_type = 'ORDER' THEN (SELECT order_number FROM orders."order" WHERE id = fa.entity_id)
               WHEN fa.entity_type = 'QUOTE' THEN (SELECT quote_number FROM quotes.quote WHERE id = fa.entity_id)
               ELSE NULL
             END as entity_reference
      FROM public.file_attachment fa
      WHERE fa.is_customer_visible = true
        AND fa.entity_id IN (
          SELECT id FROM orders."order" WHERE customer_id = $1
          UNION
          SELECT id FROM quotes.quote WHERE customer_id = $1
          UNION
          SELECT id FROM shipping.shipment WHERE order_id IN (SELECT id FROM orders."order" WHERE customer_id = $1)
        )
    `;
    const params: any[] = [customerId];
    let paramIndex = 2;

    if (entityType) {
      query += ` AND fa.entity_type = $${paramIndex}`;
      params.push(entityType);
      paramIndex++;
    }

    if (entityId) {
      query += ` AND fa.entity_id = $${paramIndex}`;
      params.push(entityId);
      paramIndex++;
    }

    if (documentType) {
      query += ` AND fa.document_type = $${paramIndex}`;
      params.push(documentType);
      paramIndex++;
    }

    if (search) {
      query += ` AND fa.file_name ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count
    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM (${query}) as subq`,
      params
    );
    const total = parseInt(countResult[0]?.total || '0');

    // Add pagination
    query += ` ORDER BY fa.created_at DESC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, (page - 1) * pageSize);

    const documents = await this.dataSource.query(query, params);

    return {
      documents: documents.map((d: any) => ({
        id: d.id,
        fileName: d.file_name,
        fileType: d.file_type,
        fileSize: d.file_size,
        documentType: d.document_type,
        entityType: d.entity_type,
        entityId: d.entity_id,
        entityReference: d.entity_reference,
        uploadedAt: d.created_at,
        downloadUrl: `/api/portal/documents/${d.id}/download`
      })),
      total
    };
  }

  async logDocumentAccess(
    portalUserId: string,
    documentId: string,
    accessType: DocumentAccessType,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.documentAccessRepo.save({
      portalUserId,
      documentId,
      accessType,
      ipAddress,
      userAgent,
      accessedAt: new Date()
    });
  }

  // ============================================================================
  // SHIPMENTS
  // ============================================================================

  async getRecentShipments(customerId: string, limit: number = 10): Promise<ShipmentSummary[]> {
    const shipments = await this.dataSource.query(
      `SELECT s.id, s.shipment_number, c.name as carrier, s.tracking_number,
              s.status, s.ship_date, s.actual_delivery, s.package_count
       FROM shipping.shipment s
       LEFT JOIN shipping.carrier c ON s.carrier_id = c.id
       WHERE s.order_id IN (SELECT id FROM orders."order" WHERE customer_id = $1)
       ORDER BY s.ship_date DESC
       LIMIT $2`,
      [customerId, limit]
    );

    return shipments.map((s: any) => ({
      id: s.id,
      shipmentNumber: s.shipment_number,
      carrier: s.carrier,
      trackingNumber: s.tracking_number,
      trackingUrl: this.getTrackingUrl(s.carrier, s.tracking_number),
      status: s.status,
      shipDate: s.ship_date,
      deliveryDate: s.actual_delivery,
      packageCount: s.package_count
    }));
  }

  // ============================================================================
  // SAVED ITEMS
  // ============================================================================

  async getSavedSearches(portalUserId: string): Promise<SavedSearch[]> {
    return await this.savedSearchRepo.find({
      where: { portalUserId },
      order: { lastUsedAt: 'DESC' }
    });
  }

  async createSavedSearch(
    portalUserId: string,
    data: Partial<SavedSearch>
  ): Promise<SavedSearch> {
    return await this.savedSearchRepo.save({
      portalUserId,
      ...data,
      useCount: 0
    });
  }

  async deleteSavedSearch(portalUserId: string, searchId: string): Promise<void> {
    await this.savedSearchRepo.delete({ id: searchId, portalUserId });
  }

  async getFavorites(portalUserId: string): Promise<Favorite[]> {
    return await this.favoriteRepo.find({
      where: { portalUserId },
      order: { createdAt: 'DESC' }
    });
  }

  async addFavorite(
    portalUserId: string,
    entityType: string,
    entityId: string,
    displayName?: string
  ): Promise<Favorite> {
    return await this.favoriteRepo.save({
      portalUserId,
      entityType,
      entityId,
      displayName
    });
  }

  async removeFavorite(portalUserId: string, favoriteId: string): Promise<void> {
    await this.favoriteRepo.delete({ id: favoriteId, portalUserId });
  }

  // ============================================================================
  // ACTIVITY LOGGING
  // ============================================================================

  private async logActivity(
    portalUserId: string,
    customerId: string,
    activityType: string,
    description: string,
    entityType?: string,
    entityId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.activityRepo.save({
      portalUserId,
      customerId,
      activityType,
      activityDescription: description,
      entityType,
      entityId,
      metadata: metadata || {},
      createdAt: new Date()
    });
  }
}

export default CustomerPortalService;
