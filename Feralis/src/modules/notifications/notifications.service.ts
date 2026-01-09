// =============================================================================
// FERALIS PLATFORM - NOTIFICATIONS SERVICE
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Notification, NotificationSeverity, NotificationChannel, Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

export interface CreateNotificationDto {
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  category?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  data?: any;
  channels?: NotificationChannel[];
  expiresAt?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        organizationId: dto.organizationId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        severity: dto.severity || NotificationSeverity.INFO,
        category: dto.category,
        entityType: dto.entityType,
        entityId: dto.entityId,
        actionUrl: dto.actionUrl,
        data: dto.data,
        channels: dto.channels || [NotificationChannel.IN_APP],
        expiresAt: dto.expiresAt,
      },
    });

    // Publish to Redis for real-time delivery
    await this.redis.publish(
      `notifications:${dto.userId}`,
      JSON.stringify(notification),
    );

    return notification;
  }

  async findForUser(
    userId: string,
    options: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ items: Notification[]; unreadCount: number }> {
    const { unreadOnly = false, limit = 50, offset = 0 } = options;

    const where: Prisma.NotificationWhereInput = {
      userId,
      isDismissed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: {
          userId,
          isRead: false,
          isDismissed: false,
        },
      }),
    ]);

    return { items, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  async dismiss(notificationId: string, userId: string): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });
  }

  async dismissAll(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isDismissed: false,
      },
      data: {
        isDismissed: true,
        dismissedAt: new Date(),
      },
    });

    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        isDismissed: false,
      },
    });
  }
}
