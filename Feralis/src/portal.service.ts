/**
 * Feralis Manufacturing Platform
 * Portal Service (Fixed - Prisma Version)
 * Phase 7: Analytics & Customer Portal Implementation
 * 
 * CHANGES FROM ORIGINAL:
 * - Removed TypeORM repository injections
 * - Now uses PrismaService for all database operations
 * - All repository methods replaced with Prisma client methods
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  PortalUser,
  PortalSession,
  CustomerPortalConfig,
  Rfq,
  RfqLine,
  ApprovalRequest,
  ApprovalHistory,
  MessageThread,
  Message,
  PortalNotification,
  PortalActivityLog,
  Quote,
  Order,
  Prisma,
} from '@prisma/client';

// ============================================================================
// DTOs
// ============================================================================

interface PortalLoginDto {
  email: string;
  password: string;
  deviceInfo?: {
    userAgent?: string;
    deviceType?: string;
  };
}

interface PortalRegisterDto {
  organizationId: string;
  customerId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'ADMIN' | 'BUYER' | 'ENGINEER' | 'VIEWER';
}

interface CreateRfqDto {
  organizationId: string;
  customerId: string;
  portalUserId: string;
  title: string;
  description?: string;
  requestedDeliveryDate?: Date;
  paymentTerms?: string;
  specialInstructions?: string;
  lines: Array<{
    partId?: string;
    customerPartNumber?: string;
    partDescription?: string;
    quantity: number;
    unitOfMeasure?: string;
    materialSpec?: string;
    finishSpec?: string;
    drawingUrl?: string;
    cadFileUrl?: string;
    notes?: string;
  }>;
}

interface SubmitApprovalDto {
  organizationId: string;
  customerId: string;
  requestType: string;
  entityType: string;
  entityId: string;
  requestedBy: string;
  title: string;
  description?: string;
  amount?: number;
  expiresAt?: Date;
}

interface ApprovalDecisionDto {
  decidedBy: string;
  decision: 'APPROVED' | 'REJECTED';
  notes?: string;
}

interface CreateMessageDto {
  threadId: string;
  senderType: 'PORTAL_USER' | 'INTERNAL_USER';
  senderPortalUserId?: string;
  senderInternalUserId?: string;
  content: string;
  attachments?: any[];
}

// ============================================================================
// PORTAL SERVICE
// ============================================================================

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ==========================================================================
  // AUTHENTICATION
  // ==========================================================================

  async login(
    dto: PortalLoginDto,
    ipAddress?: string,
  ): Promise<{ user: PortalUser; accessToken: string; refreshToken: string }> {
    const user = await this.prisma.portalUser.findFirst({
      where: { email: dto.email.toLowerCase() },
      include: { customer: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Account locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      // Increment failed attempts
      await this.prisma.portalUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: user.failedLoginAttempts + 1,
          ...(user.failedLoginAttempts >= 4 && {
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 min lockout
          }),
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException(`Account status: ${user.status}`);
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    // Reset failed attempts and update last login
    await this.prisma.portalUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Create session
    await this.prisma.portalSession.create({
      data: {
        portalUserId: user.id,
        token: accessToken,
        refreshToken,
        userAgent: dto.deviceInfo?.userAgent,
        deviceType: dto.deviceInfo?.deviceType,
        ipAddress,
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours
      },
    });

    // Log activity
    await this.logActivity(user.id, 'LOGIN', null, null, { ipAddress });

    return { user, accessToken, refreshToken };
  }

  async logout(token: string): Promise<void> {
    const session = await this.prisma.portalSession.findUnique({
      where: { token },
    });

    if (session) {
      await this.prisma.portalSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      await this.logActivity(session.portalUserId, 'LOGOUT', null, null, null);
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const session = await this.prisma.portalSession.findFirst({
      where: { refreshToken, isActive: true },
      include: { portalUser: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const newAccessToken = this.generateAccessToken(session.portalUser);

    await this.prisma.portalSession.update({
      where: { id: session.id },
      data: {
        token: newAccessToken,
        lastActivityAt: new Date(),
      },
    });

    return { accessToken: newAccessToken };
  }

  private generateAccessToken(user: PortalUser): string {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      customerId: user.customerId,
      organizationId: user.organizationId,
      role: user.role,
      type: 'portal',
    });
  }

  private generateRefreshToken(user: PortalUser): string {
    return this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { expiresIn: '7d' },
    );
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  async registerUser(dto: PortalRegisterDto): Promise<PortalUser> {
    // Check if email already exists
    const existing = await this.prisma.portalUser.findFirst({
      where: { organizationId: dto.organizationId, email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.portalUser.create({
      data: {
        organizationId: dto.organizationId,
        customerId: dto.customerId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: dto.role || 'VIEWER',
        status: 'PENDING',
      },
    });

    // TODO: Send verification email

    return user;
  }

  async getPortalUser(id: string): Promise<PortalUser> {
    const user = await this.prisma.portalUser.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!user) {
      throw new NotFoundException(`Portal user ${id} not found`);
    }

    return user;
  }

  async getCustomerUsers(customerId: string): Promise<PortalUser[]> {
    return this.prisma.portalUser.findMany({
      where: { customerId },
      orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
    });
  }

  // ==========================================================================
  // PORTAL CONFIGURATION
  // ==========================================================================

  async getPortalConfig(customerId: string): Promise<CustomerPortalConfig | null> {
    return this.prisma.customerPortalConfig.findFirst({
      where: { customerId },
    });
  }

  async updatePortalConfig(
    customerId: string,
    data: Partial<CustomerPortalConfig>,
  ): Promise<CustomerPortalConfig> {
    const config = await this.getPortalConfig(customerId);

    if (config) {
      return this.prisma.customerPortalConfig.update({
        where: { id: config.id },
        data,
      });
    }

    throw new NotFoundException(`Portal config for customer ${customerId} not found`);
  }

  // ==========================================================================
  // ORDERS & QUOTES
  // ==========================================================================

  async getCustomerOrders(
    customerId: string,
    options?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ orders: Order[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      customerId,
      ...(options?.status && { status: options.status as any }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          lines: true,
          shipments: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  async getCustomerQuotes(
    customerId: string,
    options?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ quotes: Quote[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.QuoteWhereInput = {
      customerId,
      ...(options?.status && { status: options.status as any }),
    };

    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where,
        skip,
        take: limit,
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where }),
    ]);

    return { quotes, total };
  }

  // ==========================================================================
  // RFQ MANAGEMENT
  // ==========================================================================

  async createRfq(dto: CreateRfqDto): Promise<Rfq> {
    // Generate RFQ number
    const count = await this.prisma.rfq.count({
      where: { organizationId: dto.organizationId },
    });
    const rfqNumber = `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    const rfq = await this.prisma.rfq.create({
      data: {
        organizationId: dto.organizationId,
        customerId: dto.customerId,
        portalUserId: dto.portalUserId,
        rfqNumber,
        title: dto.title,
        description: dto.description,
        requestedDeliveryDate: dto.requestedDeliveryDate,
        paymentTerms: dto.paymentTerms,
        specialInstructions: dto.specialInstructions,
        status: 'DRAFT',
        lines: {
          create: dto.lines.map((line, index) => ({
            lineNumber: index + 1,
            partId: line.partId,
            customerPartNumber: line.customerPartNumber,
            partDescription: line.partDescription,
            quantity: line.quantity,
            unitOfMeasure: line.unitOfMeasure || 'EACH',
            materialSpec: line.materialSpec,
            finishSpec: line.finishSpec,
            drawingUrl: line.drawingUrl,
            cadFileUrl: line.cadFileUrl,
            notes: line.notes,
          })),
        },
      },
      include: { lines: true },
    });

    await this.logActivity(dto.portalUserId, 'RFQ_CREATED', 'Rfq', rfq.id, {
      rfqNumber,
    });

    return rfq;
  }

  async submitRfq(rfqId: string, portalUserId: string): Promise<Rfq> {
    const rfq = await this.prisma.rfq.findUnique({
      where: { id: rfqId },
    });

    if (!rfq) {
      throw new NotFoundException(`RFQ ${rfqId} not found`);
    }

    if (rfq.status !== 'DRAFT') {
      throw new BadRequestException('RFQ has already been submitted');
    }

    const updated = await this.prisma.rfq.update({
      where: { id: rfqId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: { lines: true },
    });

    await this.logActivity(portalUserId, 'RFQ_SUBMITTED', 'Rfq', rfqId, null);

    // Create notification for internal users
    // TODO: Implement internal notification

    return updated;
  }

  async getCustomerRfqs(
    customerId: string,
    options?: {
      status?: string;
      page?: number;
      limit?: number;
    },
  ): Promise<{ rfqs: Rfq[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.RfqWhereInput = {
      customerId,
      ...(options?.status && { status: options.status as any }),
    };

    const [rfqs, total] = await Promise.all([
      this.prisma.rfq.findMany({
        where,
        skip,
        take: limit,
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.rfq.count({ where }),
    ]);

    return { rfqs, total };
  }

  // ==========================================================================
  // APPROVAL WORKFLOW
  // ==========================================================================

  async submitApproval(dto: SubmitApprovalDto): Promise<ApprovalRequest> {
    const request = await this.prisma.approvalRequest.create({
      data: {
        organizationId: dto.organizationId,
        customerId: dto.customerId,
        requestType: dto.requestType,
        entityType: dto.entityType,
        entityId: dto.entityId,
        requestedBy: dto.requestedBy,
        title: dto.title,
        description: dto.description,
        amount: dto.amount,
        status: 'PENDING',
        expiresAt: dto.expiresAt,
      },
    });

    // Create history entry
    await this.prisma.approvalHistory.create({
      data: {
        approvalRequestId: request.id,
        action: 'CREATED',
        performedBy: dto.requestedBy,
      },
    });

    // Notify approvers
    await this.notifyApprovers(request);

    return request;
  }

  async processApproval(
    requestId: string,
    dto: ApprovalDecisionDto,
  ): Promise<ApprovalRequest> {
    const request = await this.prisma.approvalRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Approval request is not pending');
    }

    const updated = await this.prisma.approvalRequest.update({
      where: { id: requestId },
      data: {
        status: dto.decision,
        decidedBy: dto.decidedBy,
        decidedAt: new Date(),
        decisionNotes: dto.notes,
      },
    });

    // Create history entry
    await this.prisma.approvalHistory.create({
      data: {
        approvalRequestId: requestId,
        action: dto.decision,
        performedBy: dto.decidedBy,
        notes: dto.notes,
      },
    });

    // Handle post-approval actions
    if (dto.decision === 'APPROVED') {
      await this.handleApprovalApproved(request);
    }

    return updated;
  }

  private async handleApprovalApproved(request: ApprovalRequest): Promise<void> {
    // Implement post-approval logic based on entity type
    switch (request.entityType) {
      case 'Order':
        // Process order
        break;
      case 'Quote':
        // Convert quote to order
        break;
    }
  }

  private async notifyApprovers(request: ApprovalRequest): Promise<void> {
    // Get portal users with ADMIN role for the customer
    const admins = await this.prisma.portalUser.findMany({
      where: {
        customerId: request.customerId,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    // Create notifications
    for (const admin of admins) {
      await this.prisma.portalNotification.create({
        data: {
          portalUserId: admin.id,
          type: 'APPROVAL_REQUIRED',
          title: `Approval Required: ${request.title}`,
          message: request.description || `${request.requestType} requires your approval`,
          entityType: 'ApprovalRequest',
          entityId: request.id,
          actionUrl: `/portal/approvals/${request.id}`,
        },
      });
    }
  }

  // ==========================================================================
  // MESSAGING
  // ==========================================================================

  async createMessageThread(
    organizationId: string,
    customerId: string,
    subject: string,
    contextType?: string,
    contextId?: string,
    createdBy: string,
  ): Promise<MessageThread> {
    return this.prisma.messageThread.create({
      data: {
        organizationId,
        customerId,
        subject,
        contextType,
        contextId,
        createdBy,
      },
    });
  }

  async sendMessage(dto: CreateMessageDto): Promise<Message> {
    const message = await this.prisma.message.create({
      data: {
        threadId: dto.threadId,
        senderType: dto.senderType,
        senderPortalUserId: dto.senderPortalUserId,
        senderInternalUserId: dto.senderInternalUserId,
        content: dto.content,
        attachments: dto.attachments || [],
      },
    });

    // Update thread's last message timestamp
    await this.prisma.messageThread.update({
      where: { id: dto.threadId },
      data: { lastMessageAt: new Date() },
    });

    // Notify recipients
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: dto.threadId },
    });

    if (thread && dto.senderType === 'INTERNAL_USER') {
      // Notify portal users
      const portalUsers = await this.prisma.portalUser.findMany({
        where: { customerId: thread.customerId, status: 'ACTIVE' },
      });

      for (const user of portalUsers) {
        await this.prisma.portalNotification.create({
          data: {
            portalUserId: user.id,
            type: 'NEW_MESSAGE',
            title: `New Message: ${thread.subject}`,
            message: dto.content.substring(0, 100),
            entityType: 'MessageThread',
            entityId: dto.threadId,
            actionUrl: `/portal/messages/${dto.threadId}`,
          },
        });
      }
    }

    return message;
  }

  async getMessageThreads(
    customerId: string,
    options?: { isOpen?: boolean; page?: number; limit?: number },
  ): Promise<{ threads: MessageThread[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.MessageThreadWhereInput = {
      customerId,
      ...(options?.isOpen !== undefined && { isOpen: options.isOpen }),
    };

    const [threads, total] = await Promise.all([
      this.prisma.messageThread.findMany({
        where,
        skip,
        take: limit,
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
      this.prisma.messageThread.count({ where }),
    ]);

    return { threads, total };
  }

  async getMessages(threadId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { threadId },
      include: {
        senderPortalUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================

  async getNotifications(
    portalUserId: string,
    options?: { unreadOnly?: boolean; page?: number; limit?: number },
  ): Promise<{ notifications: PortalNotification[]; total: number; unreadCount: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.PortalNotificationWhereInput = {
      portalUserId,
      ...(options?.unreadOnly && { isRead: false }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.portalNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.portalNotification.count({ where }),
      this.prisma.portalNotification.count({
        where: { portalUserId, isRead: false },
      }),
    ]);

    return { notifications, total, unreadCount };
  }

  async markNotificationRead(id: string): Promise<void> {
    await this.prisma.portalNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllNotificationsRead(portalUserId: string): Promise<void> {
    await this.prisma.portalNotification.updateMany({
      where: { portalUserId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  // ==========================================================================
  // ACTIVITY LOGGING
  // ==========================================================================

  async logActivity(
    portalUserId: string,
    action: string,
    entityType: string | null,
    entityId: string | null,
    details: any,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.portalActivityLog.create({
      data: {
        portalUserId,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
        userAgent,
      },
    });
  }

  async getActivityLog(
    portalUserId: string,
    options?: { page?: number; limit?: number },
  ): Promise<{ activities: PortalActivityLog[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      this.prisma.portalActivityLog.findMany({
        where: { portalUserId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.portalActivityLog.count({ where: { portalUserId } }),
    ]);

    return { activities, total };
  }

  // ==========================================================================
  // DOCUMENT ACCESS
  // ==========================================================================

  async logDocumentAccess(
    organizationId: string,
    documentType: string,
    documentId: string,
    documentName: string,
    accessorType: 'PORTAL_USER' | 'INTERNAL_USER',
    accessorId: string,
    accessType: 'VIEW' | 'DOWNLOAD',
    ipAddress?: string,
  ): Promise<void> {
    await this.prisma.documentAccessLog.create({
      data: {
        organizationId,
        documentType,
        documentId,
        documentName,
        accessorType,
        ...(accessorType === 'PORTAL_USER'
          ? { portalUserId: accessorId }
          : { internalUserId: accessorId }),
        accessType,
        ipAddress,
      },
    });
  }
}
