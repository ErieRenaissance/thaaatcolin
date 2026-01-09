// =============================================================================
// FERALIS PLATFORM - AUDIT SERVICE
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { AuditLog, Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';

export interface AuditLogEntry {
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  userId?: string;
  organizationId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  requestId?: string;
}

export interface AuditQueryParams {
  organizationId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an audit entry
   */
  async log(entry: AuditLogEntry): Promise<AuditLog> {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityName: entry.entityName,
          oldValues: entry.oldValues,
          newValues: entry.newValues,
          metadata: entry.metadata,
          userId: entry.userId,
          organizationId: entry.organizationId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          sessionId: entry.sessionId,
          requestId: entry.requestId,
        },
      });

      return auditLog;
    } catch (error) {
      // Don't throw - audit logging should not break the main flow
      this.logger.error('Failed to create audit log', error);
      return null;
    }
  }

  /**
   * Log with change tracking (before/after values)
   */
  async logChange(
    action: string,
    entityType: string,
    entityId: string,
    oldEntity: any,
    newEntity: any,
    context: Partial<AuditLogEntry>,
  ): Promise<AuditLog> {
    const changes = this.computeChanges(oldEntity, newEntity);

    if (Object.keys(changes.oldValues).length === 0) {
      return null; // No changes to log
    }

    return this.log({
      action,
      entityType,
      entityId,
      entityName: newEntity?.name || oldEntity?.name,
      oldValues: changes.oldValues,
      newValues: changes.newValues,
      ...context,
    });
  }

  /**
   * Query audit logs
   */
  async query(params: AuditQueryParams): Promise<PaginatedAuditLogs> {
    const {
      organizationId,
      userId,
      entityType,
      entityId,
      action,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params;

    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (organizationId) where.organizationId = organizationId;
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  /**
   * Get audit history for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit = 100,
  ): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Compute changes between two objects
   */
  private computeChanges(oldObj: any, newObj: any): {
    oldValues: Record<string, any>;
    newValues: Record<string, any>;
  } {
    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (!oldObj || !newObj) {
      return { oldValues, newValues };
    }

    // Fields to ignore
    const ignoredFields = [
      'updatedAt',
      'updatedBy',
      'createdAt',
      'createdBy',
      'passwordHash',
      'mfaSecret',
      'mfaBackupCodes',
      'resetToken',
      'verificationToken',
    ];

    const allKeys = new Set([
      ...Object.keys(oldObj),
      ...Object.keys(newObj),
    ]);

    for (const key of allKeys) {
      if (ignoredFields.includes(key)) continue;

      const oldVal = oldObj[key];
      const newVal = newObj[key];

      // Skip if both are undefined/null
      if (oldVal == null && newVal == null) continue;

      // Compare JSON stringified values for objects
      const oldStr = JSON.stringify(oldVal);
      const newStr = JSON.stringify(newVal);

      if (oldStr !== newStr) {
        oldValues[key] = oldVal;
        newValues[key] = newVal;
      }
    }

    return { oldValues, newValues };
  }
}
