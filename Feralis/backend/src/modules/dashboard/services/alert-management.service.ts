import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  EMERGENCY = 'EMERGENCY',
}

export enum AlertCategory {
  // Production alerts
  MACHINE_DOWN = 'MACHINE_DOWN',
  MACHINE_ALARM = 'MACHINE_ALARM',
  CYCLE_TIME_DEVIATION = 'CYCLE_TIME_DEVIATION',
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  SCRAP_THRESHOLD = 'SCRAP_THRESHOLD',
  
  // Inventory alerts
  LOW_STOCK = 'LOW_STOCK',
  STOCK_OUT = 'STOCK_OUT',
  MATERIAL_EXPIRING = 'MATERIAL_EXPIRING',
  
  // Order alerts
  ORDER_AT_RISK = 'ORDER_AT_RISK',
  ORDER_LATE = 'ORDER_LATE',
  RUSH_ORDER = 'RUSH_ORDER',
  
  // Maintenance alerts
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  MAINTENANCE_OVERDUE = 'MAINTENANCE_OVERDUE',
  TOOL_WEAR = 'TOOL_WEAR',
  CALIBRATION_DUE = 'CALIBRATION_DUE',
  
  // Financial alerts
  MARGIN_EROSION = 'MARGIN_EROSION',
  REVENUE_BEHIND = 'REVENUE_BEHIND',
  CASH_FLOW_GAP = 'CASH_FLOW_GAP',
  
  // Capacity alerts
  BOTTLENECK = 'BOTTLENECK',
  OVERCAPACITY = 'OVERCAPACITY',
  RESOURCE_SHORTAGE = 'RESOURCE_SHORTAGE',
  
  // Safety/Compliance alerts
  SAFETY_INCIDENT = 'SAFETY_INCIDENT',
  COMPLIANCE_ISSUE = 'COMPLIANCE_ISSUE',
  AUDIT_FINDING = 'AUDIT_FINDING',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  ESCALATED = 'ESCALATED',
  SUPPRESSED = 'SUPPRESSED',
}

export enum EscalationLevel {
  L1_OPERATOR = 'L1_OPERATOR',
  L2_SUPERVISOR = 'L2_SUPERVISOR',
  L3_MANAGER = 'L3_MANAGER',
  L4_EXECUTIVE = 'L4_EXECUTIVE',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
  WEBHOOK = 'WEBHOOK',
  PAGER = 'PAGER',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Alert {
  id: string;
  alertNumber: string;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  source: AlertSource;
  context: AlertContext;
  escalation: EscalationInfo;
  timestamps: AlertTimestamps;
  actions: AlertAction[];
  notifications: NotificationRecord[];
  tags: string[];
  organizationId: string;
}

export interface AlertSource {
  type: 'MACHINE' | 'WORK_ORDER' | 'INVENTORY' | 'ORDER' | 'QUALITY' | 'MAINTENANCE' | 'FINANCIAL' | 'SYSTEM';
  id: string;
  name: string;
  location?: string;
}

export interface AlertContext {
  // Related entities
  machineId?: string;
  machineName?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  orderId?: string;
  orderNumber?: string;
  partId?: string;
  partNumber?: string;
  customerId?: string;
  customerName?: string;
  
  // Metrics that triggered the alert
  currentValue?: number;
  thresholdValue?: number;
  unit?: string;
  deviation?: number;
  
  // Additional context
  metadata?: Record<string, any>;
}

export interface EscalationInfo {
  currentLevel: EscalationLevel;
  escalatedAt?: Date;
  escalatedTo?: string;
  escalationPath: EscalationStep[];
  autoEscalateAt?: Date;
}

export interface EscalationStep {
  level: EscalationLevel;
  recipients: string[];
  timeoutMinutes: number;
  channels: NotificationChannel[];
}

export interface AlertTimestamps {
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  lastUpdatedAt: Date;
  expiresAt?: Date;
}

export interface AlertAction {
  id: string;
  type: 'ACKNOWLEDGE' | 'RESOLVE' | 'ESCALATE' | 'SUPPRESS' | 'ADD_NOTE' | 'ASSIGN';
  performedBy: string;
  performedAt: Date;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  sentAt: Date;
  deliveredAt?: Date;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  errorMessage?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  category: AlertCategory;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: AlertCondition[];
  escalationPath: EscalationStep[];
  suppressionRules: SuppressionRule[];
  cooldownMinutes: number;
  organizationId: string;
}

export interface AlertCondition {
  metric: string;
  operator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NEQ' | 'CONTAINS' | 'BETWEEN';
  value: number | string | [number, number];
  duration?: number; // Minutes the condition must persist
}

export interface SuppressionRule {
  type: 'TIME_WINDOW' | 'MAINTENANCE' | 'MANUAL' | 'DEPENDENT';
  config: Record<string, any>;
}

export interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<string, number>;
  byStatus: Record<AlertStatus, number>;
  activeCount: number;
  acknowledgedCount: number;
  criticalUnacknowledged: number;
  avgResolutionTimeMinutes: number;
  oldestUnresolved?: Alert;
}

export interface AlertFeed {
  alerts: Alert[];
  summary: AlertSummary;
  lastUpdated: Date;
  hasMore: boolean;
  nextCursor?: string;
}

export interface AlertFilter {
  categories?: AlertCategory[];
  severities?: AlertSeverity[];
  statuses?: AlertStatus[];
  sources?: string[];
  dateRange?: { start: Date; end: Date };
  searchTerm?: string;
  tags?: string[];
  limit?: number;
  cursor?: string;
}

export interface AlertTrend {
  period: string;
  dataPoints: AlertTrendPoint[];
  comparison: {
    previousPeriod: number;
    changePercent: number;
    trend: 'INCREASING' | 'DECREASING' | 'STABLE';
  };
}

export interface AlertTrendPoint {
  timestamp: Date;
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  resolved: number;
  avgResolutionMinutes: number;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  categories: AlertCategory[];
  steps: EscalationStep[];
  enabled: boolean;
  organizationId: string;
}

export interface AlertDashboard {
  summary: AlertSummary;
  recentAlerts: Alert[];
  topCategories: { category: AlertCategory; count: number; avgResolutionMinutes: number }[];
  escalationQueue: Alert[];
  trend24h: AlertTrend;
  responseMetrics: {
    avgAcknowledgeTimeMinutes: number;
    avgResolutionTimeMinutes: number;
    escalationRate: number;
    reopenRate: number;
  };
}

// ============================================================================
// ALERT MANAGEMENT SERVICE
// ============================================================================

@Injectable()
export class AlertManagementService {
  private readonly logger = new Logger(AlertManagementService.name);
  
  // In-memory alert cache for real-time access
  private alertCache: Map<string, Alert[]> = new Map();
  private lastCacheRefresh: Map<string, Date> = new Map();
  private readonly CACHE_TTL_SECONDS = 30;
  
  // Alert counter for generating alert numbers
  private alertCounters: Map<string, number> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // ALERT CREATION AND MANAGEMENT
  // ============================================================================

  /**
   * Create a new alert
   */
  async createAlert(
    organizationId: string,
    category: AlertCategory,
    severity: AlertSeverity,
    title: string,
    message: string,
    source: AlertSource,
    context: AlertContext = {},
    tags: string[] = [],
  ): Promise<Alert> {
    // Check for duplicate/similar active alerts (deduplication)
    const existingAlert = await this.findSimilarActiveAlert(
      organizationId,
      category,
      source,
    );
    
    if (existingAlert) {
      // Update existing alert instead of creating duplicate
      return this.updateAlertOccurrence(existingAlert);
    }
    
    // Check suppression rules
    const isSuppressed = await this.checkSuppressionRules(
      organizationId,
      category,
      source,
    );
    
    // Generate alert number
    const alertNumber = await this.generateAlertNumber(organizationId, category);
    
    // Get escalation policy
    const escalationPath = await this.getEscalationPath(organizationId, category, severity);
    
    const alert: Alert = {
      id: this.generateId(),
      alertNumber,
      category,
      severity,
      status: isSuppressed ? AlertStatus.SUPPRESSED : AlertStatus.ACTIVE,
      title,
      message,
      source,
      context,
      escalation: {
        currentLevel: EscalationLevel.L1_OPERATOR,
        escalationPath,
        autoEscalateAt: this.calculateAutoEscalationTime(escalationPath),
      },
      timestamps: {
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      },
      actions: [],
      notifications: [],
      tags,
      organizationId,
    };
    
    // Store alert
    await this.storeAlert(alert);
    
    // Send initial notifications if not suppressed
    if (!isSuppressed) {
      await this.sendAlertNotifications(alert);
    }
    
    // Invalidate cache
    this.invalidateCache(organizationId);
    
    this.logger.log(`Created alert ${alertNumber}: ${title} (${severity})`);
    
    return alert;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertId: string,
    userId: string,
    notes?: string,
  ): Promise<Alert> {
    const alert = await this.getAlertById(alertId);
    
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    if (alert.status !== AlertStatus.ACTIVE && alert.status !== AlertStatus.ESCALATED) {
      throw new Error(`Alert ${alertId} cannot be acknowledged in status ${alert.status}`);
    }
    
    alert.status = AlertStatus.ACKNOWLEDGED;
    alert.timestamps.acknowledgedAt = new Date();
    alert.timestamps.acknowledgedBy = userId;
    alert.timestamps.lastUpdatedAt = new Date();
    
    alert.actions.push({
      id: this.generateId(),
      type: 'ACKNOWLEDGE',
      performedBy: userId,
      performedAt: new Date(),
      notes,
    });
    
    await this.updateAlert(alert);
    this.invalidateCache(alert.organizationId);
    
    this.logger.log(`Alert ${alert.alertNumber} acknowledged by ${userId}`);
    
    return alert;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(
    alertId: string,
    userId: string,
    resolution: string,
    rootCause?: string,
  ): Promise<Alert> {
    const alert = await this.getAlertById(alertId);
    
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    if (alert.status === AlertStatus.RESOLVED) {
      throw new Error(`Alert ${alertId} is already resolved`);
    }
    
    alert.status = AlertStatus.RESOLVED;
    alert.timestamps.resolvedAt = new Date();
    alert.timestamps.resolvedBy = userId;
    alert.timestamps.lastUpdatedAt = new Date();
    
    alert.actions.push({
      id: this.generateId(),
      type: 'RESOLVE',
      performedBy: userId,
      performedAt: new Date(),
      notes: resolution,
      metadata: { rootCause },
    });
    
    await this.updateAlert(alert);
    this.invalidateCache(alert.organizationId);
    
    this.logger.log(`Alert ${alert.alertNumber} resolved by ${userId}`);
    
    return alert;
  }

  /**
   * Escalate an alert manually
   */
  async escalateAlert(
    alertId: string,
    userId: string,
    reason: string,
    targetLevel?: EscalationLevel,
  ): Promise<Alert> {
    const alert = await this.getAlertById(alertId);
    
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    const currentLevelIndex = Object.values(EscalationLevel).indexOf(alert.escalation.currentLevel);
    const levels = Object.values(EscalationLevel);
    
    let newLevel: EscalationLevel;
    if (targetLevel) {
      newLevel = targetLevel;
    } else {
      // Escalate to next level
      newLevel = levels[Math.min(currentLevelIndex + 1, levels.length - 1)] as EscalationLevel;
    }
    
    alert.status = AlertStatus.ESCALATED;
    alert.escalation.currentLevel = newLevel;
    alert.escalation.escalatedAt = new Date();
    alert.escalation.autoEscalateAt = this.calculateAutoEscalationTime(
      alert.escalation.escalationPath,
      newLevel,
    );
    alert.timestamps.lastUpdatedAt = new Date();
    
    alert.actions.push({
      id: this.generateId(),
      type: 'ESCALATE',
      performedBy: userId,
      performedAt: new Date(),
      notes: reason,
      metadata: { fromLevel: alert.escalation.currentLevel, toLevel: newLevel },
    });
    
    await this.updateAlert(alert);
    
    // Send escalation notifications
    await this.sendEscalationNotifications(alert, newLevel);
    
    this.invalidateCache(alert.organizationId);
    
    this.logger.log(`Alert ${alert.alertNumber} escalated to ${newLevel} by ${userId}`);
    
    return alert;
  }

  /**
   * Suppress an alert
   */
  async suppressAlert(
    alertId: string,
    userId: string,
    reason: string,
    durationMinutes?: number,
  ): Promise<Alert> {
    const alert = await this.getAlertById(alertId);
    
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    alert.status = AlertStatus.SUPPRESSED;
    alert.timestamps.lastUpdatedAt = new Date();
    
    if (durationMinutes) {
      alert.timestamps.expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    }
    
    alert.actions.push({
      id: this.generateId(),
      type: 'SUPPRESS',
      performedBy: userId,
      performedAt: new Date(),
      notes: reason,
      metadata: { durationMinutes },
    });
    
    await this.updateAlert(alert);
    this.invalidateCache(alert.organizationId);
    
    this.logger.log(`Alert ${alert.alertNumber} suppressed by ${userId}`);
    
    return alert;
  }

  /**
   * Add a note to an alert
   */
  async addAlertNote(
    alertId: string,
    userId: string,
    note: string,
  ): Promise<Alert> {
    const alert = await this.getAlertById(alertId);
    
    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }
    
    alert.timestamps.lastUpdatedAt = new Date();
    
    alert.actions.push({
      id: this.generateId(),
      type: 'ADD_NOTE',
      performedBy: userId,
      performedAt: new Date(),
      notes: note,
    });
    
    await this.updateAlert(alert);
    
    return alert;
  }

  // ============================================================================
  // ALERT RETRIEVAL
  // ============================================================================

  /**
   * Get alert feed with filtering and pagination
   */
  async getAlertFeed(
    organizationId: string,
    filter: AlertFilter = {},
  ): Promise<AlertFeed> {
    // Check cache first
    const cacheKey = `${organizationId}:${JSON.stringify(filter)}`;
    const cached = this.getCachedAlerts(organizationId);
    
    let alerts: Alert[];
    
    if (cached && this.isCacheValid(organizationId)) {
      alerts = this.applyFilter(cached, filter);
    } else {
      alerts = await this.loadAlertsFromDatabase(organizationId, filter);
      this.cacheAlerts(organizationId, alerts);
    }
    
    const limit = filter.limit || 50;
    const hasMore = alerts.length > limit;
    const paginatedAlerts = alerts.slice(0, limit);
    
    const summary = this.calculateSummary(alerts);
    
    return {
      alerts: paginatedAlerts,
      summary,
      lastUpdated: new Date(),
      hasMore,
      nextCursor: hasMore ? paginatedAlerts[paginatedAlerts.length - 1]?.id : undefined,
    };
  }

  /**
   * Get a single alert by ID
   */
  async getAlertById(alertId: string): Promise<Alert | null> {
    // Check all caches first
    for (const [_, alerts] of this.alertCache) {
      const found = alerts.find(a => a.id === alertId);
      if (found) return found;
    }
    
    // Load from database
    return this.loadAlertFromDatabase(alertId);
  }

  /**
   * Get active alerts for a specific source (machine, work order, etc.)
   */
  async getAlertsForSource(
    organizationId: string,
    sourceType: string,
    sourceId: string,
  ): Promise<Alert[]> {
    const feed = await this.getAlertFeed(organizationId, {
      sources: [`${sourceType}:${sourceId}`],
      statuses: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED],
    });
    
    return feed.alerts;
  }

  /**
   * Get alerts requiring attention (active + escalated, sorted by severity)
   */
  async getAlertsRequiringAttention(organizationId: string): Promise<Alert[]> {
    const feed = await this.getAlertFeed(organizationId, {
      statuses: [AlertStatus.ACTIVE, AlertStatus.ESCALATED],
    });
    
    // Sort by severity (EMERGENCY first) then by age (oldest first)
    const severityOrder = {
      [AlertSeverity.EMERGENCY]: 0,
      [AlertSeverity.CRITICAL]: 1,
      [AlertSeverity.WARNING]: 2,
      [AlertSeverity.INFO]: 3,
    };
    
    return feed.alerts.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return a.timestamps.createdAt.getTime() - b.timestamps.createdAt.getTime();
    });
  }

  // ============================================================================
  // ALERT DASHBOARD
  // ============================================================================

  /**
   * Get comprehensive alert dashboard
   */
  async getAlertDashboard(organizationId: string): Promise<AlertDashboard> {
    const [allAlerts, trend24h] = await Promise.all([
      this.getAlertFeed(organizationId, {}),
      this.getAlertTrend(organizationId, '24h'),
    ]);
    
    const activeAlerts = allAlerts.alerts.filter(
      a => a.status === AlertStatus.ACTIVE || a.status === AlertStatus.ESCALATED,
    );
    
    const escalationQueue = activeAlerts.filter(
      a => a.status === AlertStatus.ESCALATED,
    );
    
    // Calculate top categories
    const categoryStats = new Map<AlertCategory, { count: number; totalResolutionTime: number; resolvedCount: number }>();
    
    for (const alert of allAlerts.alerts) {
      const stats = categoryStats.get(alert.category) || { count: 0, totalResolutionTime: 0, resolvedCount: 0 };
      stats.count++;
      
      if (alert.status === AlertStatus.RESOLVED && alert.timestamps.resolvedAt) {
        const resolutionTime = (alert.timestamps.resolvedAt.getTime() - alert.timestamps.createdAt.getTime()) / 60000;
        stats.totalResolutionTime += resolutionTime;
        stats.resolvedCount++;
      }
      
      categoryStats.set(alert.category, stats);
    }
    
    const topCategories = Array.from(categoryStats.entries())
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        avgResolutionMinutes: stats.resolvedCount > 0 
          ? Math.round(stats.totalResolutionTime / stats.resolvedCount)
          : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Calculate response metrics
    const responseMetrics = this.calculateResponseMetrics(allAlerts.alerts);
    
    return {
      summary: allAlerts.summary,
      recentAlerts: activeAlerts.slice(0, 10),
      topCategories,
      escalationQueue,
      trend24h,
      responseMetrics,
    };
  }

  /**
   * Get alert trend for specified period
   */
  async getAlertTrend(
    organizationId: string,
    period: '24h' | '7d' | '30d',
  ): Promise<AlertTrend> {
    const now = new Date();
    let startDate: Date;
    let intervalMinutes: number;
    let dataPointCount: number;
    
    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        intervalMinutes = 60; // Hourly
        dataPointCount = 24;
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        intervalMinutes = 24 * 60; // Daily
        dataPointCount = 7;
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        intervalMinutes = 24 * 60; // Daily
        dataPointCount = 30;
        break;
    }
    
    const alerts = await this.loadAlertsFromDatabase(organizationId, {
      dateRange: { start: startDate, end: now },
    });
    
    // Build data points
    const dataPoints: AlertTrendPoint[] = [];
    
    for (let i = 0; i < dataPointCount; i++) {
      const pointStart = new Date(startDate.getTime() + i * intervalMinutes * 60 * 1000);
      const pointEnd = new Date(pointStart.getTime() + intervalMinutes * 60 * 1000);
      
      const pointAlerts = alerts.filter(
        a => a.timestamps.createdAt >= pointStart && a.timestamps.createdAt < pointEnd,
      );
      
      const resolved = pointAlerts.filter(a => a.status === AlertStatus.RESOLVED);
      const totalResolutionTime = resolved.reduce((sum, a) => {
        if (a.timestamps.resolvedAt) {
          return sum + (a.timestamps.resolvedAt.getTime() - a.timestamps.createdAt.getTime()) / 60000;
        }
        return sum;
      }, 0);
      
      dataPoints.push({
        timestamp: pointStart,
        total: pointAlerts.length,
        bySeverity: {
          [AlertSeverity.INFO]: pointAlerts.filter(a => a.severity === AlertSeverity.INFO).length,
          [AlertSeverity.WARNING]: pointAlerts.filter(a => a.severity === AlertSeverity.WARNING).length,
          [AlertSeverity.CRITICAL]: pointAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
          [AlertSeverity.EMERGENCY]: pointAlerts.filter(a => a.severity === AlertSeverity.EMERGENCY).length,
        },
        resolved: resolved.length,
        avgResolutionMinutes: resolved.length > 0 ? Math.round(totalResolutionTime / resolved.length) : 0,
      });
    }
    
    // Calculate comparison with previous period
    const previousStart = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()));
    const previousAlerts = await this.loadAlertsFromDatabase(organizationId, {
      dateRange: { start: previousStart, end: startDate },
    });
    
    const currentTotal = alerts.length;
    const previousTotal = previousAlerts.length;
    const changePercent = previousTotal > 0 
      ? ((currentTotal - previousTotal) / previousTotal) * 100 
      : 0;
    
    return {
      period,
      dataPoints,
      comparison: {
        previousPeriod: previousTotal,
        changePercent: Math.round(changePercent * 10) / 10,
        trend: changePercent > 5 ? 'INCREASING' : changePercent < -5 ? 'DECREASING' : 'STABLE',
      },
    };
  }

  // ============================================================================
  // ALERT RULES AND POLICIES
  // ============================================================================

  /**
   * Get all alert rules for organization
   */
  async getAlertRules(organizationId: string): Promise<AlertRule[]> {
    // In a real implementation, this would load from database
    // For now, return default rules
    return this.getDefaultAlertRules(organizationId);
  }

  /**
   * Get escalation policies
   */
  async getEscalationPolicies(organizationId: string): Promise<EscalationPolicy[]> {
    // Default escalation policies
    return [
      {
        id: 'default-production',
        name: 'Production Escalation',
        description: 'Standard escalation for production alerts',
        categories: [
          AlertCategory.MACHINE_DOWN,
          AlertCategory.MACHINE_ALARM,
          AlertCategory.QUALITY_ISSUE,
        ],
        steps: [
          {
            level: EscalationLevel.L1_OPERATOR,
            recipients: ['operators@company.com'],
            timeoutMinutes: 15,
            channels: [NotificationChannel.IN_APP, NotificationChannel.PUSH],
          },
          {
            level: EscalationLevel.L2_SUPERVISOR,
            recipients: ['supervisors@company.com'],
            timeoutMinutes: 30,
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
          },
          {
            level: EscalationLevel.L3_MANAGER,
            recipients: ['plant-manager@company.com'],
            timeoutMinutes: 60,
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
          },
        ],
        enabled: true,
        organizationId,
      },
      {
        id: 'default-critical',
        name: 'Critical Alert Escalation',
        description: 'Fast escalation for critical alerts',
        categories: [
          AlertCategory.SAFETY_INCIDENT,
          AlertCategory.ORDER_LATE,
        ],
        steps: [
          {
            level: EscalationLevel.L2_SUPERVISOR,
            recipients: ['supervisors@company.com', 'safety@company.com'],
            timeoutMinutes: 5,
            channels: [NotificationChannel.IN_APP, NotificationChannel.SMS, NotificationChannel.PUSH],
          },
          {
            level: EscalationLevel.L3_MANAGER,
            recipients: ['plant-manager@company.com'],
            timeoutMinutes: 15,
            channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
          },
          {
            level: EscalationLevel.L4_EXECUTIVE,
            recipients: ['coo@company.com'],
            timeoutMinutes: 30,
            channels: [NotificationChannel.EMAIL, NotificationChannel.SMS, NotificationChannel.PAGER],
          },
        ],
        enabled: true,
        organizationId,
      },
    ];
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  /**
   * Bulk acknowledge alerts
   */
  async bulkAcknowledge(
    alertIds: string[],
    userId: string,
    notes?: string,
  ): Promise<{ successful: string[]; failed: { id: string; error: string }[] }> {
    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];
    
    for (const alertId of alertIds) {
      try {
        await this.acknowledgeAlert(alertId, userId, notes);
        successful.push(alertId);
      } catch (error) {
        failed.push({ id: alertId, error: error.message });
      }
    }
    
    return { successful, failed };
  }

  /**
   * Bulk resolve alerts
   */
  async bulkResolve(
    alertIds: string[],
    userId: string,
    resolution: string,
  ): Promise<{ successful: string[]; failed: { id: string; error: string }[] }> {
    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];
    
    for (const alertId of alertIds) {
      try {
        await this.resolveAlert(alertId, userId, resolution);
        successful.push(alertId);
      } catch (error) {
        failed.push({ id: alertId, error: error.message });
      }
    }
    
    return { successful, failed };
  }

  // ============================================================================
  // SCHEDULED TASKS
  // ============================================================================

  /**
   * Process auto-escalations
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processAutoEscalations(): Promise<void> {
    const now = new Date();
    
    // Get all alerts that need auto-escalation
    for (const [orgId, alerts] of this.alertCache) {
      for (const alert of alerts) {
        if (
          (alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.ESCALATED) &&
          alert.escalation.autoEscalateAt &&
          alert.escalation.autoEscalateAt <= now
        ) {
          try {
            await this.escalateAlert(alert.id, 'SYSTEM', 'Auto-escalation due to timeout');
          } catch (error) {
            this.logger.error(`Failed to auto-escalate alert ${alert.alertNumber}: ${error.message}`);
          }
        }
      }
    }
  }

  /**
   * Unsuppress expired alerts
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processExpiredSuppressions(): Promise<void> {
    const now = new Date();
    
    for (const [orgId, alerts] of this.alertCache) {
      for (const alert of alerts) {
        if (
          alert.status === AlertStatus.SUPPRESSED &&
          alert.timestamps.expiresAt &&
          alert.timestamps.expiresAt <= now
        ) {
          alert.status = AlertStatus.ACTIVE;
          alert.timestamps.lastUpdatedAt = now;
          alert.timestamps.expiresAt = undefined;
          
          await this.updateAlert(alert);
          
          // Re-send notifications
          await this.sendAlertNotifications(alert);
          
          this.logger.log(`Alert ${alert.alertNumber} unsuppressed after expiration`);
        }
      }
    }
  }

  /**
   * Refresh alert cache periodically
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async refreshAlertCache(): Promise<void> {
    // Refresh cache for each organization that has stale data
    for (const [orgId, lastRefresh] of this.lastCacheRefresh) {
      if (!this.isCacheValid(orgId)) {
        try {
          const alerts = await this.loadAlertsFromDatabase(orgId, {
            statuses: [AlertStatus.ACTIVE, AlertStatus.ACKNOWLEDGED, AlertStatus.ESCALATED],
          });
          this.cacheAlerts(orgId, alerts);
        } catch (error) {
          this.logger.error(`Failed to refresh cache for org ${orgId}: ${error.message}`);
        }
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateAlertNumber(organizationId: string, category: AlertCategory): Promise<string> {
    const counter = (this.alertCounters.get(organizationId) || 0) + 1;
    this.alertCounters.set(organizationId, counter);
    
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    
    return `${prefix}-${timestamp}-${counter.toString().padStart(4, '0')}`;
  }

  private async findSimilarActiveAlert(
    organizationId: string,
    category: AlertCategory,
    source: AlertSource,
  ): Promise<Alert | null> {
    const cached = this.getCachedAlerts(organizationId);
    if (!cached) return null;
    
    return cached.find(
      a => a.category === category &&
           a.source.type === source.type &&
           a.source.id === source.id &&
           (a.status === AlertStatus.ACTIVE || a.status === AlertStatus.ACKNOWLEDGED),
    ) || null;
  }

  private async updateAlertOccurrence(alert: Alert): Promise<Alert> {
    alert.timestamps.lastUpdatedAt = new Date();
    alert.context.metadata = {
      ...alert.context.metadata,
      occurrenceCount: ((alert.context.metadata?.occurrenceCount as number) || 1) + 1,
      lastOccurrence: new Date(),
    };
    
    await this.updateAlert(alert);
    return alert;
  }

  private async checkSuppressionRules(
    organizationId: string,
    category: AlertCategory,
    source: AlertSource,
  ): Promise<boolean> {
    // Check if machine is in maintenance mode
    if (source.type === 'MACHINE') {
      const machine = await this.prisma.machine.findUnique({
        where: { id: source.id },
      });
      
      if (machine?.status === 'MAINTENANCE') {
        return true;
      }
    }
    
    // Add more suppression rule checks as needed
    return false;
  }

  private async getEscalationPath(
    organizationId: string,
    category: AlertCategory,
    severity: AlertSeverity,
  ): Promise<EscalationStep[]> {
    const policies = await this.getEscalationPolicies(organizationId);
    
    // Find matching policy
    const matchingPolicy = policies.find(
      p => p.enabled && p.categories.includes(category),
    );
    
    if (matchingPolicy) {
      return matchingPolicy.steps;
    }
    
    // Return default escalation path
    return [
      {
        level: EscalationLevel.L1_OPERATOR,
        recipients: [],
        timeoutMinutes: severity === AlertSeverity.CRITICAL ? 10 : 30,
        channels: [NotificationChannel.IN_APP],
      },
      {
        level: EscalationLevel.L2_SUPERVISOR,
        recipients: [],
        timeoutMinutes: severity === AlertSeverity.CRITICAL ? 20 : 60,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      },
    ];
  }

  private calculateAutoEscalationTime(
    escalationPath: EscalationStep[],
    currentLevel?: EscalationLevel,
  ): Date | undefined {
    const levelIndex = currentLevel 
      ? escalationPath.findIndex(s => s.level === currentLevel)
      : 0;
    
    if (levelIndex < 0 || levelIndex >= escalationPath.length - 1) {
      return undefined; // No more escalation levels
    }
    
    const currentStep = escalationPath[levelIndex];
    return new Date(Date.now() + currentStep.timeoutMinutes * 60 * 1000);
  }

  private async storeAlert(alert: Alert): Promise<void> {
    // Store in database (simplified - in real implementation, use proper Prisma model)
    // For now, just update the cache
    const cached = this.getCachedAlerts(alert.organizationId) || [];
    cached.push(alert);
    this.alertCache.set(alert.organizationId, cached);
  }

  private async updateAlert(alert: Alert): Promise<void> {
    const cached = this.getCachedAlerts(alert.organizationId) || [];
    const index = cached.findIndex(a => a.id === alert.id);
    
    if (index >= 0) {
      cached[index] = alert;
    } else {
      cached.push(alert);
    }
    
    this.alertCache.set(alert.organizationId, cached);
  }

  private async loadAlertFromDatabase(alertId: string): Promise<Alert | null> {
    // In real implementation, load from database
    // For now, return null (cache miss)
    return null;
  }

  private async loadAlertsFromDatabase(
    organizationId: string,
    filter: AlertFilter = {},
  ): Promise<Alert[]> {
    // In real implementation, load from database with proper filtering
    // For now, return cached data or empty array
    return this.getCachedAlerts(organizationId) || [];
  }

  private async sendAlertNotifications(alert: Alert): Promise<void> {
    const step = alert.escalation.escalationPath.find(
      s => s.level === alert.escalation.currentLevel,
    );
    
    if (!step) return;
    
    for (const channel of step.channels) {
      for (const recipient of step.recipients) {
        const notification: NotificationRecord = {
          id: this.generateId(),
          channel,
          recipient,
          sentAt: new Date(),
          status: 'PENDING',
        };
        
        alert.notifications.push(notification);
        
        // In real implementation, actually send the notification
        // For now, just mark as sent
        notification.status = 'SENT';
        notification.deliveredAt = new Date();
      }
    }
  }

  private async sendEscalationNotifications(alert: Alert, level: EscalationLevel): Promise<void> {
    const step = alert.escalation.escalationPath.find(s => s.level === level);
    
    if (!step) return;
    
    for (const channel of step.channels) {
      for (const recipient of step.recipients) {
        const notification: NotificationRecord = {
          id: this.generateId(),
          channel,
          recipient,
          sentAt: new Date(),
          status: 'SENT',
        };
        
        alert.notifications.push(notification);
      }
    }
  }

  private getCachedAlerts(organizationId: string): Alert[] | undefined {
    return this.alertCache.get(organizationId);
  }

  private cacheAlerts(organizationId: string, alerts: Alert[]): void {
    this.alertCache.set(organizationId, alerts);
    this.lastCacheRefresh.set(organizationId, new Date());
  }

  private isCacheValid(organizationId: string): boolean {
    const lastRefresh = this.lastCacheRefresh.get(organizationId);
    if (!lastRefresh) return false;
    
    const age = (Date.now() - lastRefresh.getTime()) / 1000;
    return age < this.CACHE_TTL_SECONDS;
  }

  private invalidateCache(organizationId: string): void {
    this.lastCacheRefresh.delete(organizationId);
  }

  private applyFilter(alerts: Alert[], filter: AlertFilter): Alert[] {
    let filtered = [...alerts];
    
    if (filter.categories?.length) {
      filtered = filtered.filter(a => filter.categories!.includes(a.category));
    }
    
    if (filter.severities?.length) {
      filtered = filtered.filter(a => filter.severities!.includes(a.severity));
    }
    
    if (filter.statuses?.length) {
      filtered = filtered.filter(a => filter.statuses!.includes(a.status));
    }
    
    if (filter.dateRange) {
      filtered = filtered.filter(
        a => a.timestamps.createdAt >= filter.dateRange!.start &&
             a.timestamps.createdAt <= filter.dateRange!.end,
      );
    }
    
    if (filter.searchTerm) {
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(
        a => a.title.toLowerCase().includes(term) ||
             a.message.toLowerCase().includes(term) ||
             a.alertNumber.toLowerCase().includes(term),
      );
    }
    
    if (filter.tags?.length) {
      filtered = filtered.filter(
        a => filter.tags!.some(t => a.tags.includes(t)),
      );
    }
    
    // Sort by severity then creation date
    filtered.sort((a, b) => {
      const severityOrder = { EMERGENCY: 0, CRITICAL: 1, WARNING: 2, INFO: 3 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.timestamps.createdAt.getTime() - a.timestamps.createdAt.getTime();
    });
    
    return filtered;
  }

  private calculateSummary(alerts: Alert[]): AlertSummary {
    const summary: AlertSummary = {
      total: alerts.length,
      bySeverity: {
        [AlertSeverity.INFO]: 0,
        [AlertSeverity.WARNING]: 0,
        [AlertSeverity.CRITICAL]: 0,
        [AlertSeverity.EMERGENCY]: 0,
      },
      byCategory: {},
      byStatus: {
        [AlertStatus.ACTIVE]: 0,
        [AlertStatus.ACKNOWLEDGED]: 0,
        [AlertStatus.IN_PROGRESS]: 0,
        [AlertStatus.RESOLVED]: 0,
        [AlertStatus.ESCALATED]: 0,
        [AlertStatus.SUPPRESSED]: 0,
      },
      activeCount: 0,
      acknowledgedCount: 0,
      criticalUnacknowledged: 0,
      avgResolutionTimeMinutes: 0,
    };
    
    let totalResolutionTime = 0;
    let resolvedCount = 0;
    
    for (const alert of alerts) {
      summary.bySeverity[alert.severity]++;
      summary.byStatus[alert.status]++;
      summary.byCategory[alert.category] = (summary.byCategory[alert.category] || 0) + 1;
      
      if (alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.ESCALATED) {
        summary.activeCount++;
      }
      
      if (alert.status === AlertStatus.ACKNOWLEDGED) {
        summary.acknowledgedCount++;
      }
      
      if (
        (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.EMERGENCY) &&
        alert.status === AlertStatus.ACTIVE
      ) {
        summary.criticalUnacknowledged++;
      }
      
      if (alert.status === AlertStatus.RESOLVED && alert.timestamps.resolvedAt) {
        totalResolutionTime += (alert.timestamps.resolvedAt.getTime() - alert.timestamps.createdAt.getTime()) / 60000;
        resolvedCount++;
      }
      
      // Track oldest unresolved
      if (alert.status !== AlertStatus.RESOLVED && alert.status !== AlertStatus.SUPPRESSED) {
        if (!summary.oldestUnresolved || alert.timestamps.createdAt < summary.oldestUnresolved.timestamps.createdAt) {
          summary.oldestUnresolved = alert;
        }
      }
    }
    
    summary.avgResolutionTimeMinutes = resolvedCount > 0 
      ? Math.round(totalResolutionTime / resolvedCount)
      : 0;
    
    return summary;
  }

  private calculateResponseMetrics(alerts: Alert[]): {
    avgAcknowledgeTimeMinutes: number;
    avgResolutionTimeMinutes: number;
    escalationRate: number;
    reopenRate: number;
  } {
    let totalAckTime = 0;
    let ackCount = 0;
    let totalResTime = 0;
    let resCount = 0;
    let escalatedCount = 0;
    
    for (const alert of alerts) {
      if (alert.timestamps.acknowledgedAt) {
        totalAckTime += (alert.timestamps.acknowledgedAt.getTime() - alert.timestamps.createdAt.getTime()) / 60000;
        ackCount++;
      }
      
      if (alert.status === AlertStatus.RESOLVED && alert.timestamps.resolvedAt) {
        totalResTime += (alert.timestamps.resolvedAt.getTime() - alert.timestamps.createdAt.getTime()) / 60000;
        resCount++;
      }
      
      if (alert.status === AlertStatus.ESCALATED || alert.actions.some(a => a.type === 'ESCALATE')) {
        escalatedCount++;
      }
    }
    
    return {
      avgAcknowledgeTimeMinutes: ackCount > 0 ? Math.round(totalAckTime / ackCount) : 0,
      avgResolutionTimeMinutes: resCount > 0 ? Math.round(totalResTime / resCount) : 0,
      escalationRate: alerts.length > 0 ? Math.round((escalatedCount / alerts.length) * 100) : 0,
      reopenRate: 0, // Would need tracking of reopen events
    };
  }

  private getDefaultAlertRules(organizationId: string): AlertRule[] {
    return [
      {
        id: 'machine-down-rule',
        name: 'Machine Down Alert',
        description: 'Alert when machine status changes to DOWN or ALARM',
        category: AlertCategory.MACHINE_DOWN,
        severity: AlertSeverity.CRITICAL,
        enabled: true,
        conditions: [
          { metric: 'machine.status', operator: 'EQ', value: 'DOWN' },
        ],
        escalationPath: [],
        suppressionRules: [],
        cooldownMinutes: 5,
        organizationId,
      },
      {
        id: 'low-stock-rule',
        name: 'Low Stock Alert',
        description: 'Alert when inventory falls below reorder point',
        category: AlertCategory.LOW_STOCK,
        severity: AlertSeverity.WARNING,
        enabled: true,
        conditions: [
          { metric: 'inventory.quantity', operator: 'LTE', value: 'reorder_point' },
        ],
        escalationPath: [],
        suppressionRules: [],
        cooldownMinutes: 60,
        organizationId,
      },
      {
        id: 'order-at-risk-rule',
        name: 'Order At Risk Alert',
        description: 'Alert when order is at risk of missing delivery date',
        category: AlertCategory.ORDER_AT_RISK,
        severity: AlertSeverity.WARNING,
        enabled: true,
        conditions: [
          { metric: 'order.daysToDelivery', operator: 'LTE', value: 3 },
          { metric: 'order.completionPercent', operator: 'LT', value: 80 },
        ],
        escalationPath: [],
        suppressionRules: [],
        cooldownMinutes: 240,
        organizationId,
      },
    ];
  }
}
