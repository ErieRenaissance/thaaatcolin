import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export enum GaugeStatus {
  ACTIVE = 'ACTIVE',
  CALIBRATION_DUE = 'CALIBRATION_DUE',
  OVERDUE = 'OVERDUE',
  IN_CALIBRATION = 'IN_CALIBRATION',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETIRED = 'RETIRED',
  LOST = 'LOST',
  CONDEMNED = 'CONDEMNED',
}

export enum GaugeType {
  CALIPER = 'CALIPER',
  MICROMETER = 'MICROMETER',
  HEIGHT_GAUGE = 'HEIGHT_GAUGE',
  INDICATOR = 'INDICATOR',
  RING_GAUGE = 'RING_GAUGE',
  PLUG_GAUGE = 'PLUG_GAUGE',
  THREAD_GAUGE = 'THREAD_GAUGE',
  PIN_GAUGE = 'PIN_GAUGE',
  FEELER_GAUGE = 'FEELER_GAUGE',
  BORE_GAUGE = 'BORE_GAUGE',
  DEPTH_GAUGE = 'DEPTH_GAUGE',
  SURFACE_PLATE = 'SURFACE_PLATE',
  GAUGE_BLOCK = 'GAUGE_BLOCK',
  CMM = 'CMM',
  OPTICAL_COMPARATOR = 'OPTICAL_COMPARATOR',
  HARDNESS_TESTER = 'HARDNESS_TESTER',
  FORCE_GAUGE = 'FORCE_GAUGE',
  TORQUE_WRENCH = 'TORQUE_WRENCH',
  PRESSURE_GAUGE = 'PRESSURE_GAUGE',
  TEMPERATURE_PROBE = 'TEMPERATURE_PROBE',
  MULTIMETER = 'MULTIMETER',
  SCALE = 'SCALE',
  FIXTURE = 'FIXTURE',
  OTHER = 'OTHER',
}

export enum CalibrationResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  ADJUSTED_PASS = 'ADJUSTED_PASS',
  LIMITED_USE = 'LIMITED_USE',
  CONDEMNED = 'CONDEMNED',
}

export enum CalibrationSource {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export enum CertificateType {
  CALIBRATION = 'CALIBRATION',
  NIST_TRACEABLE = 'NIST_TRACEABLE',
  ISO_17025 = 'ISO_17025',
  MANUFACTURER = 'MANUFACTURER',
  ADJUSTMENT = 'ADJUSTMENT',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Gauge {
  id: string;
  gaugeId: string;
  name: string;
  type: GaugeType;
  status: GaugeStatus;
  description?: string;
  
  // Identification
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  assetTag?: string;
  
  // Specifications
  range?: string;
  resolution?: string;
  accuracy?: string;
  units?: string;
  
  // Calibration settings
  calibrationIntervalDays: number;
  calibrationSource: CalibrationSource;
  calibrationVendorId?: string;
  calibrationVendorName?: string;
  calibrationProcedure?: string;
  toleranceBand?: string;
  
  // Current calibration status
  lastCalibrationDate?: Date;
  nextCalibrationDate?: Date;
  lastCalibrationResult?: CalibrationResult;
  lastCalibrationRecordId?: string;
  calibrationsDue: number;
  calibrationsOverdue: number;
  
  // Location and assignment
  location?: string;
  facilityId?: string;
  facilityName?: string;
  departmentId?: string;
  departmentName?: string;
  assignedToUserId?: string;
  assignedToUserName?: string;
  
  // Purchase info
  purchaseDate?: Date;
  purchasePrice?: number;
  purchaseOrderNumber?: string;
  warrantyExpiration?: Date;
  
  // History
  totalCalibrations: number;
  failureCount: number;
  adjustmentCount: number;
  
  // Metadata
  notes?: string;
  tags: string[];
  isActive: boolean;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalibrationRecord {
  id: string;
  calibrationNumber: string;
  gaugeId: string;
  gaugeName: string;
  gaugeSerialNumber?: string;
  
  // Calibration details
  calibrationDate: Date;
  dueDate: Date;
  source: CalibrationSource;
  vendorId?: string;
  vendorName?: string;
  calibratedBy?: string;
  calibratedByUserId?: string;
  
  // Results
  result: CalibrationResult;
  asFoundCondition?: string;
  asLeftCondition?: string;
  adjustmentsMade?: string;
  outOfToleranceReadings?: string;
  limitationsNoted?: string;
  
  // Measurements
  measurements: CalibrationMeasurement[];
  
  // Certificate
  certificateNumber?: string;
  certificateType?: CertificateType;
  certificateFileId?: string;
  certificateExpirationDate?: Date;
  
  // Standards used
  standardsUsed: CalibrationStandard[];
  
  // Environment
  temperature?: number;
  temperatureUnit?: string;
  humidity?: number;
  
  // Cost
  cost?: number;
  invoiceNumber?: string;
  
  // Workflow
  reviewedBy?: string;
  reviewedByUserId?: string;
  reviewedAt?: Date;
  approvedBy?: string;
  approvedByUserId?: string;
  approvedAt?: Date;
  
  // Notes
  notes?: string;
  
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalibrationMeasurement {
  id: string;
  recordId: string;
  measurementPoint: string;
  nominalValue: number;
  tolerance: number;
  asFoundValue: number;
  asLeftValue?: number;
  units: string;
  result: CalibrationResult;
  deviation: number;
  deviationPercent: number;
  notes?: string;
}

export interface CalibrationStandard {
  id: string;
  recordId: string;
  standardId: string;
  standardName: string;
  standardSerialNumber?: string;
  calibrationDate?: Date;
  certificateNumber?: string;
  traceableToNist: boolean;
}

export interface CalibrationSchedule {
  id: string;
  gaugeId: string;
  gaugeName: string;
  gaugeType: GaugeType;
  location?: string;
  scheduledDate: Date;
  source: CalibrationSource;
  vendorName?: string;
  estimatedCost?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED';
  assignedTo?: string;
  notes?: string;
  organizationId: string;
}

export interface CalibrationAlert {
  id: string;
  gaugeId: string;
  gaugeName: string;
  gaugeSerialNumber?: string;
  alertType: 'DUE_SOON' | 'OVERDUE' | 'FAILED' | 'EXPIRING_CERTIFICATE';
  daysUntilDue?: number;
  daysOverdue?: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

export interface GaugeSummary {
  total: number;
  active: number;
  inCalibration: number;
  dueSoon: number;
  overdue: number;
  outOfService: number;
  byType: { type: GaugeType; count: number }[];
  byLocation: { location: string; count: number }[];
  byStatus: { status: GaugeStatus; count: number }[];
}

export interface CalibrationDashboard {
  summary: GaugeSummary;
  upcomingCalibrations: CalibrationSchedule[];
  overdueGauges: Gauge[];
  recentCalibrations: CalibrationRecord[];
  alerts: CalibrationAlert[];
  costSummary: {
    monthToDate: number;
    yearToDate: number;
    budgeted: number;
    projected: number;
  };
  complianceMetrics: {
    onTimeRate: number;
    passRate: number;
    avgDaysOverdue: number;
  };
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

@Injectable()
export class CalibrationManagementService {
  private readonly logger = new Logger(CalibrationManagementService.name);
  private gaugeCache: Map<string, Gauge[]> = new Map();
  private alertCache: Map<string, CalibrationAlert[]> = new Map();
  private cacheTimestamp: Date = new Date();

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================================================
  // GAUGE MANAGEMENT
  // ==========================================================================

  async createGauge(data: {
    gaugeId: string;
    name: string;
    type: GaugeType;
    organizationId: string;
    description?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    assetTag?: string;
    range?: string;
    resolution?: string;
    accuracy?: string;
    units?: string;
    calibrationIntervalDays: number;
    calibrationSource?: CalibrationSource;
    calibrationVendorId?: string;
    calibrationProcedure?: string;
    toleranceBand?: string;
    location?: string;
    facilityId?: string;
    departmentId?: string;
    assignedToUserId?: string;
    purchaseDate?: Date;
    purchasePrice?: number;
    purchaseOrderNumber?: string;
    warrantyExpiration?: Date;
    notes?: string;
    tags?: string[];
    initialCalibrationDate?: Date;
  }): Promise<Gauge> {
    this.logger.log(`Creating gauge: ${data.gaugeId}`);

    // Check for duplicate gauge ID
    const existing = await this.prisma.gauge.findFirst({
      where: {
        organizationId: data.organizationId,
        gaugeId: data.gaugeId,
      },
    });

    if (existing) {
      throw new BadRequestException(`Gauge ${data.gaugeId} already exists`);
    }

    // Calculate next calibration date
    const lastCalibrationDate = data.initialCalibrationDate || new Date();
    const nextCalibrationDate = new Date(lastCalibrationDate);
    nextCalibrationDate.setDate(nextCalibrationDate.getDate() + data.calibrationIntervalDays);

    // Get vendor name if provided
    let vendorName: string | undefined;
    if (data.calibrationVendorId) {
      const vendor = await this.prisma.supplier.findUnique({
        where: { id: data.calibrationVendorId },
        select: { name: true },
      });
      vendorName = vendor?.name;
    }

    // Get facility and department names
    let facilityName: string | undefined;
    let departmentName: string | undefined;
    if (data.facilityId) {
      const facility = await this.prisma.facility.findUnique({
        where: { id: data.facilityId },
        select: { name: true },
      });
      facilityName = facility?.name;
    }

    // Get assigned user name
    let assignedToUserName: string | undefined;
    if (data.assignedToUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.assignedToUserId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        assignedToUserName = `${user.firstName} ${user.lastName}`;
      }
    }

    const gauge = await this.prisma.gauge.create({
      data: {
        gaugeId: data.gaugeId,
        name: data.name,
        type: data.type,
        status: GaugeStatus.ACTIVE,
        description: data.description,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        assetTag: data.assetTag,
        range: data.range,
        resolution: data.resolution,
        accuracy: data.accuracy,
        units: data.units,
        calibrationIntervalDays: data.calibrationIntervalDays,
        calibrationSource: data.calibrationSource || CalibrationSource.EXTERNAL,
        calibrationVendorId: data.calibrationVendorId,
        calibrationProcedure: data.calibrationProcedure,
        toleranceBand: data.toleranceBand,
        lastCalibrationDate: data.initialCalibrationDate,
        nextCalibrationDate,
        location: data.location,
        facilityId: data.facilityId,
        departmentId: data.departmentId,
        assignedToUserId: data.assignedToUserId,
        purchaseDate: data.purchaseDate,
        purchasePrice: data.purchasePrice ? new Decimal(data.purchasePrice) : undefined,
        purchaseOrderNumber: data.purchaseOrderNumber,
        warrantyExpiration: data.warrantyExpiration,
        notes: data.notes,
        tags: data.tags || [],
        isActive: true,
        totalCalibrations: data.initialCalibrationDate ? 1 : 0,
        failureCount: 0,
        adjustmentCount: 0,
        organizationId: data.organizationId,
      },
    });

    this.invalidateCache(data.organizationId);

    return this.mapGaugeToInterface(gauge, vendorName, facilityName, departmentName, assignedToUserName);
  }

  async updateGauge(
    gaugeId: string,
    organizationId: string,
    data: Partial<{
      name: string;
      type: GaugeType;
      status: GaugeStatus;
      description: string;
      manufacturer: string;
      model: string;
      serialNumber: string;
      assetTag: string;
      range: string;
      resolution: string;
      accuracy: string;
      units: string;
      calibrationIntervalDays: number;
      calibrationSource: CalibrationSource;
      calibrationVendorId: string;
      calibrationProcedure: string;
      toleranceBand: string;
      location: string;
      facilityId: string;
      departmentId: string;
      assignedToUserId: string;
      notes: string;
      tags: string[];
    }>,
  ): Promise<Gauge> {
    this.logger.log(`Updating gauge: ${gaugeId}`);

    const gauge = await this.prisma.gauge.findFirst({
      where: { id: gaugeId, organizationId },
    });

    if (!gauge) {
      throw new NotFoundException(`Gauge ${gaugeId} not found`);
    }

    // Recalculate next calibration date if interval changed
    let nextCalibrationDate = gauge.nextCalibrationDate;
    if (data.calibrationIntervalDays && gauge.lastCalibrationDate) {
      nextCalibrationDate = new Date(gauge.lastCalibrationDate);
      nextCalibrationDate.setDate(nextCalibrationDate.getDate() + data.calibrationIntervalDays);
    }

    const updated = await this.prisma.gauge.update({
      where: { id: gaugeId },
      data: {
        ...data,
        nextCalibrationDate,
        purchasePrice: undefined, // Don't update purchase price here
      },
    });

    this.invalidateCache(organizationId);

    return this.getGauge(gaugeId, organizationId);
  }

  async getGauge(gaugeId: string, organizationId: string): Promise<Gauge> {
    const gauge = await this.prisma.gauge.findFirst({
      where: { id: gaugeId, organizationId },
      include: {
        facility: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        calibrationVendor: { select: { name: true } },
      },
    });

    if (!gauge) {
      throw new NotFoundException(`Gauge ${gaugeId} not found`);
    }

    return this.mapGaugeToInterface(
      gauge,
      gauge.calibrationVendor?.name,
      gauge.facility?.name,
      undefined,
      gauge.assignedTo ? `${gauge.assignedTo.firstName} ${gauge.assignedTo.lastName}` : undefined,
    );
  }

  async getGaugeByGaugeId(gaugeIdCode: string, organizationId: string): Promise<Gauge> {
    const gauge = await this.prisma.gauge.findFirst({
      where: { gaugeId: gaugeIdCode, organizationId },
      include: {
        facility: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        calibrationVendor: { select: { name: true } },
      },
    });

    if (!gauge) {
      throw new NotFoundException(`Gauge ${gaugeIdCode} not found`);
    }

    return this.mapGaugeToInterface(
      gauge,
      gauge.calibrationVendor?.name,
      gauge.facility?.name,
      undefined,
      gauge.assignedTo ? `${gauge.assignedTo.firstName} ${gauge.assignedTo.lastName}` : undefined,
    );
  }

  async listGauges(
    organizationId: string,
    filters?: {
      status?: GaugeStatus[];
      type?: GaugeType[];
      location?: string;
      facilityId?: string;
      assignedToUserId?: string;
      dueBefore?: Date;
      search?: string;
      isActive?: boolean;
    },
    pagination?: { page: number; limit: number },
  ): Promise<{ gauges: Gauge[]; total: number; page: number; limit: number }> {
    const where: any = { organizationId };

    if (filters?.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters?.type?.length) {
      where.type = { in: filters.type };
    }
    if (filters?.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }
    if (filters?.facilityId) {
      where.facilityId = filters.facilityId;
    }
    if (filters?.assignedToUserId) {
      where.assignedToUserId = filters.assignedToUserId;
    }
    if (filters?.dueBefore) {
      where.nextCalibrationDate = { lte: filters.dueBefore };
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }
    if (filters?.search) {
      where.OR = [
        { gaugeId: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
        { assetTag: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 50;

    const [gauges, total] = await Promise.all([
      this.prisma.gauge.findMany({
        where,
        include: {
          facility: { select: { name: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
          calibrationVendor: { select: { name: true } },
        },
        orderBy: { nextCalibrationDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.gauge.count({ where }),
    ]);

    return {
      gauges: gauges.map((g) =>
        this.mapGaugeToInterface(
          g,
          g.calibrationVendor?.name,
          g.facility?.name,
          undefined,
          g.assignedTo ? `${g.assignedTo.firstName} ${g.assignedTo.lastName}` : undefined,
        ),
      ),
      total,
      page,
      limit,
    };
  }

  async retireGauge(gaugeId: string, organizationId: string, reason?: string): Promise<Gauge> {
    this.logger.log(`Retiring gauge: ${gaugeId}`);

    const gauge = await this.prisma.gauge.findFirst({
      where: { id: gaugeId, organizationId },
    });

    if (!gauge) {
      throw new NotFoundException(`Gauge ${gaugeId} not found`);
    }

    const updated = await this.prisma.gauge.update({
      where: { id: gaugeId },
      data: {
        status: GaugeStatus.RETIRED,
        isActive: false,
        notes: reason ? `${gauge.notes || ''}\nRetired: ${reason}`.trim() : gauge.notes,
      },
    });

    this.invalidateCache(organizationId);

    return this.getGauge(gaugeId, organizationId);
  }

  // ==========================================================================
  // CALIBRATION RECORDS
  // ==========================================================================

  async createCalibrationRecord(data: {
    gaugeId: string;
    organizationId: string;
    calibrationDate: Date;
    source: CalibrationSource;
    result: CalibrationResult;
    calibratedByUserId?: string;
    vendorId?: string;
    vendorName?: string;
    asFoundCondition?: string;
    asLeftCondition?: string;
    adjustmentsMade?: string;
    outOfToleranceReadings?: string;
    limitationsNoted?: string;
    certificateNumber?: string;
    certificateType?: CertificateType;
    certificateFileId?: string;
    certificateExpirationDate?: Date;
    temperature?: number;
    temperatureUnit?: string;
    humidity?: number;
    cost?: number;
    invoiceNumber?: string;
    notes?: string;
    measurements?: Array<{
      measurementPoint: string;
      nominalValue: number;
      tolerance: number;
      asFoundValue: number;
      asLeftValue?: number;
      units: string;
      notes?: string;
    }>;
    standardsUsed?: Array<{
      standardId: string;
      standardName: string;
      standardSerialNumber?: string;
      calibrationDate?: Date;
      certificateNumber?: string;
      traceableToNist: boolean;
    }>;
  }): Promise<CalibrationRecord> {
    this.logger.log(`Creating calibration record for gauge: ${data.gaugeId}`);

    // Get gauge
    const gauge = await this.prisma.gauge.findFirst({
      where: { id: data.gaugeId, organizationId: data.organizationId },
    });

    if (!gauge) {
      throw new NotFoundException(`Gauge ${data.gaugeId} not found`);
    }

    // Generate calibration number
    const year = new Date().getFullYear().toString().slice(-2);
    const count = await this.prisma.calibrationRecord.count({
      where: { organizationId: data.organizationId },
    });
    const calibrationNumber = `CAL-${year}-${(count + 1).toString().padStart(5, '0')}`;

    // Get calibrator name
    let calibratedBy: string | undefined;
    if (data.calibratedByUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.calibratedByUserId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        calibratedBy = `${user.firstName} ${user.lastName}`;
      }
    }

    // Calculate next due date
    const nextDueDate = new Date(data.calibrationDate);
    nextDueDate.setDate(nextDueDate.getDate() + gauge.calibrationIntervalDays);

    // Create record with measurements and standards
    const record = await this.prisma.calibrationRecord.create({
      data: {
        calibrationNumber,
        gaugeId: data.gaugeId,
        calibrationDate: data.calibrationDate,
        dueDate: nextDueDate,
        source: data.source,
        vendorId: data.vendorId,
        vendorName: data.vendorName,
        calibratedBy,
        calibratedByUserId: data.calibratedByUserId,
        result: data.result,
        asFoundCondition: data.asFoundCondition,
        asLeftCondition: data.asLeftCondition,
        adjustmentsMade: data.adjustmentsMade,
        outOfToleranceReadings: data.outOfToleranceReadings,
        limitationsNoted: data.limitationsNoted,
        certificateNumber: data.certificateNumber,
        certificateType: data.certificateType,
        certificateFileId: data.certificateFileId,
        certificateExpirationDate: data.certificateExpirationDate,
        temperature: data.temperature ? new Decimal(data.temperature) : undefined,
        temperatureUnit: data.temperatureUnit,
        humidity: data.humidity ? new Decimal(data.humidity) : undefined,
        cost: data.cost ? new Decimal(data.cost) : undefined,
        invoiceNumber: data.invoiceNumber,
        notes: data.notes,
        organizationId: data.organizationId,
        measurements: data.measurements
          ? {
              create: data.measurements.map((m) => {
                const deviation = m.asFoundValue - m.nominalValue;
                const deviationPercent = m.nominalValue !== 0 ? (deviation / m.nominalValue) * 100 : 0;
                const measurementResult =
                  Math.abs(deviation) <= m.tolerance ? CalibrationResult.PASS : CalibrationResult.FAIL;

                return {
                  measurementPoint: m.measurementPoint,
                  nominalValue: new Decimal(m.nominalValue),
                  tolerance: new Decimal(m.tolerance),
                  asFoundValue: new Decimal(m.asFoundValue),
                  asLeftValue: m.asLeftValue ? new Decimal(m.asLeftValue) : undefined,
                  units: m.units,
                  result: measurementResult,
                  deviation: new Decimal(deviation),
                  deviationPercent: new Decimal(deviationPercent),
                  notes: m.notes,
                };
              }),
            }
          : undefined,
        standardsUsed: data.standardsUsed
          ? {
              create: data.standardsUsed.map((s) => ({
                standardId: s.standardId,
                standardName: s.standardName,
                standardSerialNumber: s.standardSerialNumber,
                calibrationDate: s.calibrationDate,
                certificateNumber: s.certificateNumber,
                traceableToNist: s.traceableToNist,
              })),
            }
          : undefined,
      },
      include: {
        measurements: true,
        standardsUsed: true,
        gauge: { select: { name: true, serialNumber: true } },
      },
    });

    // Update gauge with calibration info
    let newStatus = GaugeStatus.ACTIVE;
    if (data.result === CalibrationResult.FAIL || data.result === CalibrationResult.CONDEMNED) {
      newStatus = GaugeStatus.OUT_OF_SERVICE;
    } else if (data.result === CalibrationResult.LIMITED_USE) {
      newStatus = GaugeStatus.ACTIVE; // Active but with limitations
    }

    await this.prisma.gauge.update({
      where: { id: data.gaugeId },
      data: {
        status: newStatus,
        lastCalibrationDate: data.calibrationDate,
        nextCalibrationDate: nextDueDate,
        lastCalibrationResult: data.result,
        lastCalibrationRecordId: record.id,
        totalCalibrations: { increment: 1 },
        failureCount:
          data.result === CalibrationResult.FAIL || data.result === CalibrationResult.CONDEMNED
            ? { increment: 1 }
            : undefined,
        adjustmentCount: data.result === CalibrationResult.ADJUSTED_PASS ? { increment: 1 } : undefined,
      },
    });

    this.invalidateCache(data.organizationId);

    return this.mapCalibrationRecordToInterface(record);
  }

  async getCalibrationRecord(recordId: string, organizationId: string): Promise<CalibrationRecord> {
    const record = await this.prisma.calibrationRecord.findFirst({
      where: { id: recordId, organizationId },
      include: {
        measurements: true,
        standardsUsed: true,
        gauge: { select: { name: true, serialNumber: true } },
        reviewer: { select: { firstName: true, lastName: true } },
        approver: { select: { firstName: true, lastName: true } },
      },
    });

    if (!record) {
      throw new NotFoundException(`Calibration record ${recordId} not found`);
    }

    return this.mapCalibrationRecordToInterface(record);
  }

  async getCalibrationHistory(
    gaugeId: string,
    organizationId: string,
    limit: number = 20,
  ): Promise<CalibrationRecord[]> {
    const records = await this.prisma.calibrationRecord.findMany({
      where: { gaugeId, organizationId },
      include: {
        measurements: true,
        standardsUsed: true,
        gauge: { select: { name: true, serialNumber: true } },
      },
      orderBy: { calibrationDate: 'desc' },
      take: limit,
    });

    return records.map((r) => this.mapCalibrationRecordToInterface(r));
  }

  async approveCalibrationRecord(
    recordId: string,
    organizationId: string,
    approverId: string,
  ): Promise<CalibrationRecord> {
    this.logger.log(`Approving calibration record: ${recordId}`);

    const record = await this.prisma.calibrationRecord.findFirst({
      where: { id: recordId, organizationId },
    });

    if (!record) {
      throw new NotFoundException(`Calibration record ${recordId} not found`);
    }

    if (record.approvedAt) {
      throw new BadRequestException('Calibration record already approved');
    }

    // Get approver name
    const approver = await this.prisma.user.findUnique({
      where: { id: approverId },
      select: { firstName: true, lastName: true },
    });

    const updated = await this.prisma.calibrationRecord.update({
      where: { id: recordId },
      data: {
        approvedBy: approver ? `${approver.firstName} ${approver.lastName}` : undefined,
        approvedByUserId: approverId,
        approvedAt: new Date(),
      },
      include: {
        measurements: true,
        standardsUsed: true,
        gauge: { select: { name: true, serialNumber: true } },
      },
    });

    return this.mapCalibrationRecordToInterface(updated);
  }

  // ==========================================================================
  // CALIBRATION SCHEDULING
  // ==========================================================================

  async getUpcomingCalibrations(
    organizationId: string,
    daysAhead: number = 30,
  ): Promise<CalibrationSchedule[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const gauges = await this.prisma.gauge.findMany({
      where: {
        organizationId,
        isActive: true,
        nextCalibrationDate: { lte: futureDate },
        status: { notIn: [GaugeStatus.RETIRED, GaugeStatus.LOST, GaugeStatus.CONDEMNED] },
      },
      include: {
        calibrationVendor: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
      orderBy: { nextCalibrationDate: 'asc' },
    });

    return gauges.map((g) => {
      const now = new Date();
      const dueDate = g.nextCalibrationDate || new Date();
      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (daysUntilDue <= 0) {
        priority = 'CRITICAL';
      } else if (daysUntilDue <= 7) {
        priority = 'HIGH';
      } else if (daysUntilDue <= 14) {
        priority = 'MEDIUM';
      }

      return {
        id: g.id,
        gaugeId: g.gaugeId,
        gaugeName: g.name,
        gaugeType: g.type as GaugeType,
        location: g.location || undefined,
        scheduledDate: dueDate,
        source: g.calibrationSource as CalibrationSource,
        vendorName: g.calibrationVendor?.name,
        estimatedCost: undefined,
        priority,
        status: daysUntilDue < 0 ? 'SCHEDULED' : 'SCHEDULED',
        assignedTo: g.assignedTo ? `${g.assignedTo.firstName} ${g.assignedTo.lastName}` : undefined,
        notes: undefined,
        organizationId: g.organizationId,
      };
    });
  }

  async getOverdueGauges(organizationId: string): Promise<Gauge[]> {
    const now = new Date();

    const gauges = await this.prisma.gauge.findMany({
      where: {
        organizationId,
        isActive: true,
        nextCalibrationDate: { lt: now },
        status: { notIn: [GaugeStatus.RETIRED, GaugeStatus.LOST, GaugeStatus.CONDEMNED, GaugeStatus.IN_CALIBRATION] },
      },
      include: {
        facility: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
        calibrationVendor: { select: { name: true } },
      },
      orderBy: { nextCalibrationDate: 'asc' },
    });

    return gauges.map((g) =>
      this.mapGaugeToInterface(
        g,
        g.calibrationVendor?.name,
        g.facility?.name,
        undefined,
        g.assignedTo ? `${g.assignedTo.firstName} ${g.assignedTo.lastName}` : undefined,
      ),
    );
  }

  async sendToCalibration(gaugeId: string, organizationId: string, notes?: string): Promise<Gauge> {
    this.logger.log(`Sending gauge to calibration: ${gaugeId}`);

    const gauge = await this.prisma.gauge.findFirst({
      where: { id: gaugeId, organizationId },
    });

    if (!gauge) {
      throw new NotFoundException(`Gauge ${gaugeId} not found`);
    }

    await this.prisma.gauge.update({
      where: { id: gaugeId },
      data: {
        status: GaugeStatus.IN_CALIBRATION,
        notes: notes ? `${gauge.notes || ''}\nSent to calibration: ${notes}`.trim() : gauge.notes,
      },
    });

    this.invalidateCache(organizationId);

    return this.getGauge(gaugeId, organizationId);
  }

  // ==========================================================================
  // ALERTS
  // ==========================================================================

  async getCalibrationAlerts(organizationId: string): Promise<CalibrationAlert[]> {
    const cached = this.alertCache.get(organizationId);
    if (cached && new Date().getTime() - this.cacheTimestamp.getTime() < 60000) {
      return cached;
    }

    const alerts: CalibrationAlert[] = [];
    const now = new Date();

    // Get gauges with upcoming or overdue calibrations
    const gauges = await this.prisma.gauge.findMany({
      where: {
        organizationId,
        isActive: true,
        status: { notIn: [GaugeStatus.RETIRED, GaugeStatus.LOST, GaugeStatus.CONDEMNED, GaugeStatus.IN_CALIBRATION] },
      },
      select: {
        id: true,
        gaugeId: true,
        name: true,
        serialNumber: true,
        nextCalibrationDate: true,
        lastCalibrationResult: true,
      },
    });

    for (const gauge of gauges) {
      if (!gauge.nextCalibrationDate) continue;

      const daysUntilDue = Math.floor(
        (gauge.nextCalibrationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilDue < 0) {
        // Overdue
        alerts.push({
          id: `${gauge.id}-overdue`,
          gaugeId: gauge.id,
          gaugeName: gauge.name,
          gaugeSerialNumber: gauge.serialNumber || undefined,
          alertType: 'OVERDUE',
          daysOverdue: Math.abs(daysUntilDue),
          severity: Math.abs(daysUntilDue) > 30 ? 'CRITICAL' : Math.abs(daysUntilDue) > 14 ? 'HIGH' : 'MEDIUM',
          message: `Gauge ${gauge.gaugeId} is ${Math.abs(daysUntilDue)} days overdue for calibration`,
          createdAt: now,
        });
      } else if (daysUntilDue <= 14) {
        // Due soon
        alerts.push({
          id: `${gauge.id}-due-soon`,
          gaugeId: gauge.id,
          gaugeName: gauge.name,
          gaugeSerialNumber: gauge.serialNumber || undefined,
          alertType: 'DUE_SOON',
          daysUntilDue,
          severity: daysUntilDue <= 3 ? 'HIGH' : daysUntilDue <= 7 ? 'MEDIUM' : 'LOW',
          message: `Gauge ${gauge.gaugeId} calibration due in ${daysUntilDue} days`,
          createdAt: now,
        });
      }

      // Check for failed last calibration
      if (gauge.lastCalibrationResult === CalibrationResult.FAIL) {
        alerts.push({
          id: `${gauge.id}-failed`,
          gaugeId: gauge.id,
          gaugeName: gauge.name,
          gaugeSerialNumber: gauge.serialNumber || undefined,
          alertType: 'FAILED',
          severity: 'CRITICAL',
          message: `Gauge ${gauge.gaugeId} failed last calibration`,
          createdAt: now,
        });
      }
    }

    // Sort by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    this.alertCache.set(organizationId, alerts);
    this.cacheTimestamp = now;

    return alerts;
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  async getCalibrationDashboard(organizationId: string): Promise<CalibrationDashboard> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Get summary
    const summary = await this.getGaugeSummary(organizationId);

    // Get upcoming calibrations
    const upcomingCalibrations = await this.getUpcomingCalibrations(organizationId, 30);

    // Get overdue gauges
    const overdueGauges = await this.getOverdueGauges(organizationId);

    // Get recent calibrations
    const recentCalibrations = await this.prisma.calibrationRecord.findMany({
      where: { organizationId },
      include: {
        measurements: true,
        standardsUsed: true,
        gauge: { select: { name: true, serialNumber: true } },
      },
      orderBy: { calibrationDate: 'desc' },
      take: 10,
    });

    // Get alerts
    const alerts = await this.getCalibrationAlerts(organizationId);

    // Calculate cost summary
    const [mtdCosts, ytdCosts] = await Promise.all([
      this.prisma.calibrationRecord.aggregate({
        where: {
          organizationId,
          calibrationDate: { gte: startOfMonth },
        },
        _sum: { cost: true },
      }),
      this.prisma.calibrationRecord.aggregate({
        where: {
          organizationId,
          calibrationDate: { gte: startOfYear },
        },
        _sum: { cost: true },
      }),
    ]);

    // Calculate compliance metrics
    const [totalCalibrations, onTimeCalibrations, passedCalibrations] = await Promise.all([
      this.prisma.calibrationRecord.count({
        where: {
          organizationId,
          calibrationDate: { gte: startOfYear },
        },
      }),
      this.prisma.calibrationRecord.count({
        where: {
          organizationId,
          calibrationDate: { gte: startOfYear },
          // On-time logic would need calibration date vs previous due date comparison
        },
      }),
      this.prisma.calibrationRecord.count({
        where: {
          organizationId,
          calibrationDate: { gte: startOfYear },
          result: { in: [CalibrationResult.PASS, CalibrationResult.ADJUSTED_PASS] },
        },
      }),
    ]);

    // Calculate average days overdue
    const overdueSum = overdueGauges.reduce((sum, g) => {
      if (g.nextCalibrationDate) {
        const daysOverdue = Math.floor((now.getTime() - g.nextCalibrationDate.getTime()) / (1000 * 60 * 60 * 24));
        return sum + daysOverdue;
      }
      return sum;
    }, 0);

    return {
      summary,
      upcomingCalibrations: upcomingCalibrations.slice(0, 10),
      overdueGauges: overdueGauges.slice(0, 10),
      recentCalibrations: recentCalibrations.map((r) => this.mapCalibrationRecordToInterface(r)),
      alerts: alerts.slice(0, 20),
      costSummary: {
        monthToDate: Number(mtdCosts._sum.cost) || 0,
        yearToDate: Number(ytdCosts._sum.cost) || 0,
        budgeted: 0, // Would come from configuration
        projected: (Number(ytdCosts._sum.cost) || 0) * (12 / (now.getMonth() + 1)),
      },
      complianceMetrics: {
        onTimeRate: totalCalibrations > 0 ? (onTimeCalibrations / totalCalibrations) * 100 : 100,
        passRate: totalCalibrations > 0 ? (passedCalibrations / totalCalibrations) * 100 : 100,
        avgDaysOverdue: overdueGauges.length > 0 ? overdueSum / overdueGauges.length : 0,
      },
    };
  }

  async getGaugeSummary(organizationId: string): Promise<GaugeSummary> {
    const now = new Date();
    const dueSoonDate = new Date();
    dueSoonDate.setDate(dueSoonDate.getDate() + 14);

    const [total, byStatus, byType, byLocation] = await Promise.all([
      this.prisma.gauge.count({ where: { organizationId, isActive: true } }),
      this.prisma.gauge.groupBy({
        by: ['status'],
        where: { organizationId, isActive: true },
        _count: true,
      }),
      this.prisma.gauge.groupBy({
        by: ['type'],
        where: { organizationId, isActive: true },
        _count: true,
      }),
      this.prisma.gauge.groupBy({
        by: ['location'],
        where: { organizationId, isActive: true, location: { not: null } },
        _count: true,
      }),
    ]);

    // Count due soon and overdue
    const [dueSoon, overdue] = await Promise.all([
      this.prisma.gauge.count({
        where: {
          organizationId,
          isActive: true,
          nextCalibrationDate: { gte: now, lte: dueSoonDate },
          status: { notIn: [GaugeStatus.RETIRED, GaugeStatus.LOST, GaugeStatus.CONDEMNED, GaugeStatus.IN_CALIBRATION] },
        },
      }),
      this.prisma.gauge.count({
        where: {
          organizationId,
          isActive: true,
          nextCalibrationDate: { lt: now },
          status: { notIn: [GaugeStatus.RETIRED, GaugeStatus.LOST, GaugeStatus.CONDEMNED, GaugeStatus.IN_CALIBRATION] },
        },
      }),
    ]);

    const statusMap = new Map(byStatus.map((s) => [s.status, s._count]));

    return {
      total,
      active: statusMap.get(GaugeStatus.ACTIVE) || 0,
      inCalibration: statusMap.get(GaugeStatus.IN_CALIBRATION) || 0,
      dueSoon,
      overdue,
      outOfService: statusMap.get(GaugeStatus.OUT_OF_SERVICE) || 0,
      byType: byType.map((t) => ({ type: t.type as GaugeType, count: t._count })),
      byLocation: byLocation
        .filter((l) => l.location)
        .map((l) => ({ location: l.location!, count: l._count })),
      byStatus: byStatus.map((s) => ({ status: s.status as GaugeStatus, count: s._count })),
    };
  }

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  async getCalibrationReport(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCalibrations: number;
    byResult: { result: CalibrationResult; count: number }[];
    bySource: { source: CalibrationSource; count: number }[];
    byVendor: { vendorName: string; count: number }[];
    byGaugeType: { type: GaugeType; count: number }[];
    totalCost: number;
    avgCostPerCalibration: number;
    onTimeRate: number;
    passRate: number;
    records: CalibrationRecord[];
  }> {
    const where = {
      organizationId,
      calibrationDate: { gte: startDate, lte: endDate },
    };

    const [records, byResult, bySource, byVendor, totalCost] = await Promise.all([
      this.prisma.calibrationRecord.findMany({
        where,
        include: {
          measurements: true,
          standardsUsed: true,
          gauge: { select: { name: true, serialNumber: true, type: true } },
        },
        orderBy: { calibrationDate: 'desc' },
      }),
      this.prisma.calibrationRecord.groupBy({
        by: ['result'],
        where,
        _count: true,
      }),
      this.prisma.calibrationRecord.groupBy({
        by: ['source'],
        where,
        _count: true,
      }),
      this.prisma.calibrationRecord.groupBy({
        by: ['vendorName'],
        where: { ...where, vendorName: { not: null } },
        _count: true,
      }),
      this.prisma.calibrationRecord.aggregate({
        where,
        _sum: { cost: true },
      }),
    ]);

    // Calculate gauge type breakdown
    const gaugeTypeCount = new Map<string, number>();
    for (const record of records) {
      const type = (record as any).gauge?.type || 'OTHER';
      gaugeTypeCount.set(type, (gaugeTypeCount.get(type) || 0) + 1);
    }

    const totalCalibrations = records.length;
    const passedCount = byResult
      .filter((r) => r.result === CalibrationResult.PASS || r.result === CalibrationResult.ADJUSTED_PASS)
      .reduce((sum, r) => sum + r._count, 0);

    return {
      totalCalibrations,
      byResult: byResult.map((r) => ({ result: r.result as CalibrationResult, count: r._count })),
      bySource: bySource.map((s) => ({ source: s.source as CalibrationSource, count: s._count })),
      byVendor: byVendor
        .filter((v) => v.vendorName)
        .map((v) => ({ vendorName: v.vendorName!, count: v._count })),
      byGaugeType: Array.from(gaugeTypeCount.entries()).map(([type, count]) => ({
        type: type as GaugeType,
        count,
      })),
      totalCost: Number(totalCost._sum.cost) || 0,
      avgCostPerCalibration: totalCalibrations > 0 ? (Number(totalCost._sum.cost) || 0) / totalCalibrations : 0,
      onTimeRate: 100, // Would need historical due date comparison
      passRate: totalCalibrations > 0 ? (passedCount / totalCalibrations) * 100 : 100,
      records: records.map((r) => this.mapCalibrationRecordToInterface(r)),
    };
  }

  async getGaugeUsageReport(
    gaugeId: string,
    organizationId: string,
  ): Promise<{
    gauge: Gauge;
    calibrationHistory: CalibrationRecord[];
    statistics: {
      totalCalibrations: number;
      passCount: number;
      failCount: number;
      adjustmentCount: number;
      avgDaysBetweenCalibrations: number;
      totalCost: number;
      avgCostPerCalibration: number;
      lastCalibration?: CalibrationRecord;
      nextDue?: Date;
      currentStatus: GaugeStatus;
    };
  }> {
    const gauge = await this.getGauge(gaugeId, organizationId);
    const calibrationHistory = await this.getCalibrationHistory(gaugeId, organizationId, 100);

    let avgDaysBetweenCalibrations = 0;
    if (calibrationHistory.length >= 2) {
      let totalDays = 0;
      for (let i = 0; i < calibrationHistory.length - 1; i++) {
        const daysDiff = Math.floor(
          (calibrationHistory[i].calibrationDate.getTime() - calibrationHistory[i + 1].calibrationDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        totalDays += daysDiff;
      }
      avgDaysBetweenCalibrations = totalDays / (calibrationHistory.length - 1);
    }

    const totalCost = calibrationHistory.reduce((sum, r) => sum + (r.cost || 0), 0);

    return {
      gauge,
      calibrationHistory,
      statistics: {
        totalCalibrations: gauge.totalCalibrations,
        passCount: calibrationHistory.filter(
          (r) => r.result === CalibrationResult.PASS || r.result === CalibrationResult.ADJUSTED_PASS,
        ).length,
        failCount: gauge.failureCount,
        adjustmentCount: gauge.adjustmentCount,
        avgDaysBetweenCalibrations,
        totalCost,
        avgCostPerCalibration: gauge.totalCalibrations > 0 ? totalCost / gauge.totalCalibrations : 0,
        lastCalibration: calibrationHistory[0],
        nextDue: gauge.nextCalibrationDate || undefined,
        currentStatus: gauge.status,
      },
    };
  }

  // ==========================================================================
  // SCHEDULED TASKS
  // ==========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async updateCalibrationStatuses(): Promise<void> {
    this.logger.log('Running daily calibration status update');

    const now = new Date();

    // Update gauges that are now overdue
    await this.prisma.gauge.updateMany({
      where: {
        isActive: true,
        status: { in: [GaugeStatus.ACTIVE, GaugeStatus.CALIBRATION_DUE] },
        nextCalibrationDate: { lt: now },
      },
      data: {
        status: GaugeStatus.OVERDUE,
      },
    });

    // Update gauges that are due soon
    const dueSoonDate = new Date();
    dueSoonDate.setDate(dueSoonDate.getDate() + 7);

    await this.prisma.gauge.updateMany({
      where: {
        isActive: true,
        status: GaugeStatus.ACTIVE,
        nextCalibrationDate: { gte: now, lte: dueSoonDate },
      },
      data: {
        status: GaugeStatus.CALIBRATION_DUE,
      },
    });

    // Clear cache for all organizations
    this.gaugeCache.clear();
    this.alertCache.clear();
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private invalidateCache(organizationId: string): void {
    this.gaugeCache.delete(organizationId);
    this.alertCache.delete(organizationId);
  }

  private mapGaugeToInterface(
    gauge: any,
    vendorName?: string,
    facilityName?: string,
    departmentName?: string,
    assignedToUserName?: string,
  ): Gauge {
    const now = new Date();
    let calibrationsDue = 0;
    let calibrationsOverdue = 0;

    if (gauge.nextCalibrationDate) {
      const daysUntilDue = Math.floor(
        (gauge.nextCalibrationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilDue < 0) {
        calibrationsOverdue = 1;
      } else if (daysUntilDue <= 14) {
        calibrationsDue = 1;
      }
    }

    return {
      id: gauge.id,
      gaugeId: gauge.gaugeId,
      name: gauge.name,
      type: gauge.type as GaugeType,
      status: gauge.status as GaugeStatus,
      description: gauge.description || undefined,
      manufacturer: gauge.manufacturer || undefined,
      model: gauge.model || undefined,
      serialNumber: gauge.serialNumber || undefined,
      assetTag: gauge.assetTag || undefined,
      range: gauge.range || undefined,
      resolution: gauge.resolution || undefined,
      accuracy: gauge.accuracy || undefined,
      units: gauge.units || undefined,
      calibrationIntervalDays: gauge.calibrationIntervalDays,
      calibrationSource: gauge.calibrationSource as CalibrationSource,
      calibrationVendorId: gauge.calibrationVendorId || undefined,
      calibrationVendorName: vendorName,
      calibrationProcedure: gauge.calibrationProcedure || undefined,
      toleranceBand: gauge.toleranceBand || undefined,
      lastCalibrationDate: gauge.lastCalibrationDate || undefined,
      nextCalibrationDate: gauge.nextCalibrationDate || undefined,
      lastCalibrationResult: gauge.lastCalibrationResult as CalibrationResult | undefined,
      lastCalibrationRecordId: gauge.lastCalibrationRecordId || undefined,
      calibrationsDue,
      calibrationsOverdue,
      location: gauge.location || undefined,
      facilityId: gauge.facilityId || undefined,
      facilityName,
      departmentId: gauge.departmentId || undefined,
      departmentName,
      assignedToUserId: gauge.assignedToUserId || undefined,
      assignedToUserName,
      purchaseDate: gauge.purchaseDate || undefined,
      purchasePrice: gauge.purchasePrice ? Number(gauge.purchasePrice) : undefined,
      purchaseOrderNumber: gauge.purchaseOrderNumber || undefined,
      warrantyExpiration: gauge.warrantyExpiration || undefined,
      totalCalibrations: gauge.totalCalibrations || 0,
      failureCount: gauge.failureCount || 0,
      adjustmentCount: gauge.adjustmentCount || 0,
      notes: gauge.notes || undefined,
      tags: gauge.tags || [],
      isActive: gauge.isActive,
      organizationId: gauge.organizationId,
      createdAt: gauge.createdAt,
      updatedAt: gauge.updatedAt,
    };
  }

  private mapCalibrationRecordToInterface(record: any): CalibrationRecord {
    return {
      id: record.id,
      calibrationNumber: record.calibrationNumber,
      gaugeId: record.gaugeId,
      gaugeName: record.gauge?.name || '',
      gaugeSerialNumber: record.gauge?.serialNumber || undefined,
      calibrationDate: record.calibrationDate,
      dueDate: record.dueDate,
      source: record.source as CalibrationSource,
      vendorId: record.vendorId || undefined,
      vendorName: record.vendorName || undefined,
      calibratedBy: record.calibratedBy || undefined,
      calibratedByUserId: record.calibratedByUserId || undefined,
      result: record.result as CalibrationResult,
      asFoundCondition: record.asFoundCondition || undefined,
      asLeftCondition: record.asLeftCondition || undefined,
      adjustmentsMade: record.adjustmentsMade || undefined,
      outOfToleranceReadings: record.outOfToleranceReadings || undefined,
      limitationsNoted: record.limitationsNoted || undefined,
      measurements: (record.measurements || []).map((m: any) => ({
        id: m.id,
        recordId: m.recordId,
        measurementPoint: m.measurementPoint,
        nominalValue: Number(m.nominalValue),
        tolerance: Number(m.tolerance),
        asFoundValue: Number(m.asFoundValue),
        asLeftValue: m.asLeftValue ? Number(m.asLeftValue) : undefined,
        units: m.units,
        result: m.result as CalibrationResult,
        deviation: Number(m.deviation),
        deviationPercent: Number(m.deviationPercent),
        notes: m.notes || undefined,
      })),
      certificateNumber: record.certificateNumber || undefined,
      certificateType: record.certificateType as CertificateType | undefined,
      certificateFileId: record.certificateFileId || undefined,
      certificateExpirationDate: record.certificateExpirationDate || undefined,
      standardsUsed: (record.standardsUsed || []).map((s: any) => ({
        id: s.id,
        recordId: s.recordId,
        standardId: s.standardId,
        standardName: s.standardName,
        standardSerialNumber: s.standardSerialNumber || undefined,
        calibrationDate: s.calibrationDate || undefined,
        certificateNumber: s.certificateNumber || undefined,
        traceableToNist: s.traceableToNist,
      })),
      temperature: record.temperature ? Number(record.temperature) : undefined,
      temperatureUnit: record.temperatureUnit || undefined,
      humidity: record.humidity ? Number(record.humidity) : undefined,
      cost: record.cost ? Number(record.cost) : undefined,
      invoiceNumber: record.invoiceNumber || undefined,
      reviewedBy: record.reviewedBy || undefined,
      reviewedByUserId: record.reviewedByUserId || undefined,
      reviewedAt: record.reviewedAt || undefined,
      approvedBy: record.approvedBy || undefined,
      approvedByUserId: record.approvedByUserId || undefined,
      approvedAt: record.approvedAt || undefined,
      notes: record.notes || undefined,
      organizationId: record.organizationId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
