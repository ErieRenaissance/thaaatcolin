import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// ENUMS AND TYPES
// ============================================================================

export enum FaiStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONDITIONAL = 'CONDITIONAL',
  CANCELLED = 'CANCELLED',
}

export enum FaiType {
  NEW_PART = 'NEW_PART',
  DESIGN_CHANGE = 'DESIGN_CHANGE',
  PROCESS_CHANGE = 'PROCESS_CHANGE',
  TOOLING_CHANGE = 'TOOLING_CHANGE',
  SUPPLIER_CHANGE = 'SUPPLIER_CHANGE',
  REQUALIFICATION = 'REQUALIFICATION',
  CUSTOMER_REQUEST = 'CUSTOMER_REQUEST',
}

export enum MeasurementResult {
  PASS = 'PASS',
  FAIL = 'FAIL',
  DEVIATION = 'DEVIATION',
  NOT_MEASURED = 'NOT_MEASURED',
}

export enum CharacteristicType {
  DIMENSIONAL = 'DIMENSIONAL',
  GEOMETRIC = 'GEOMETRIC',
  SURFACE = 'SURFACE',
  MATERIAL = 'MATERIAL',
  FUNCTIONAL = 'FUNCTIONAL',
  VISUAL = 'VISUAL',
}

export enum ToleranceType {
  BILATERAL = 'BILATERAL',
  UNILATERAL_PLUS = 'UNILATERAL_PLUS',
  UNILATERAL_MINUS = 'UNILATERAL_MINUS',
  LIMIT = 'LIMIT',
  REFERENCE = 'REFERENCE',
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface FaiReport {
  id: string;
  faiNumber: string;
  type: FaiType;
  status: FaiStatus;
  partId: string;
  partNumber: string;
  partName: string;
  revision: string;
  customerId?: string;
  customerName?: string;
  customerPartNumber?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  purchaseOrderNumber?: string;
  
  // Form 1 - Part Information
  form1: FaiForm1;
  
  // Form 2 - Material and Process Accountability
  form2: FaiForm2;
  
  // Form 3 - Characteristic Accountability
  form3: FaiForm3;
  
  // Supporting documents
  documents: FaiDocument[];
  
  // Workflow
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt?: Date;
  submittedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Notes and comments
  notes: FaiNote[];
  
  organizationId: string;
}

export interface FaiForm1 {
  // Part identification
  partNumber: string;
  partName: string;
  serialNumber?: string;
  partRevision: string;
  drawingNumber: string;
  drawingRevision: string;
  
  // Manufacturing information
  manufacturingProcess: string;
  machineUsed?: string;
  toolingUsed?: string;
  fixtureUsed?: string;
  
  // Organization info
  organizationName: string;
  manufacturingLocation: string;
  supplierCode?: string;
  
  // Customer info
  customerName?: string;
  purchaseOrder?: string;
  salesOrder?: string;
  
  // Dates
  drawingDate: Date;
  faiDate: Date;
  
  // Signatures
  preparedBy: string;
  preparedDate: Date;
  approvedBy?: string;
  approvedDate?: Date;
  
  // Additional notes
  reasonForFai: string;
  baselinePartNumber?: string;
  baselinePartRevision?: string;
  otherChanges?: string;
}

export interface FaiForm2 {
  materials: MaterialAccountability[];
  processes: ProcessAccountability[];
  functionalTests: FunctionalTest[];
}

export interface MaterialAccountability {
  id: string;
  itemNumber: number;
  materialName: string;
  specification: string;
  code?: string;
  certificationNumber?: string;
  certificationDate?: Date;
  supplier?: string;
  result: MeasurementResult;
  notes?: string;
}

export interface ProcessAccountability {
  id: string;
  itemNumber: number;
  processName: string;
  specification: string;
  code?: string;
  processSource?: 'INTERNAL' | 'EXTERNAL';
  supplierName?: string;
  certificationNumber?: string;
  approvalDate?: Date;
  result: MeasurementResult;
  notes?: string;
}

export interface FunctionalTest {
  id: string;
  itemNumber: number;
  testName: string;
  specification: string;
  testProcedure: string;
  acceptanceCriteria: string;
  actualResult: string;
  result: MeasurementResult;
  testDate: Date;
  testedBy: string;
  notes?: string;
}

export interface FaiForm3 {
  characteristics: DimensionalCharacteristic[];
  summary: CharacteristicSummary;
}

export interface DimensionalCharacteristic {
  id: string;
  characteristicNumber: number;
  referenceLocation: string;
  characteristicDesignator?: string;
  requirement: string;
  
  // Tolerance
  nominal: number;
  toleranceType: ToleranceType;
  upperTolerance?: number;
  lowerTolerance?: number;
  upperLimit?: number;
  lowerLimit?: number;
  
  // Measurement
  actualValue: number;
  measurementMethod?: string;
  gageUsed?: string;
  gageId?: string;
  
  // Result
  result: MeasurementResult;
  deviation?: number;
  deviationPercent?: number;
  
  // Flags
  isKeyCharacteristic: boolean;
  isDesignatedCharacteristic: boolean;
  characteristicType: CharacteristicType;
  
  notes?: string;
}

export interface CharacteristicSummary {
  totalCharacteristics: number;
  passed: number;
  failed: number;
  deviations: number;
  notMeasured: number;
  passRate: number;
  keyCharacteristicsPassed: number;
  keyCharacteristicsTotal: number;
}

export interface FaiDocument {
  id: string;
  documentType: 'DRAWING' | 'CERTIFICATE' | 'TEST_REPORT' | 'PHOTO' | 'CMM_REPORT' | 'OTHER';
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  uploadedBy: string;
  uploadedAt: Date;
  description?: string;
}

export interface FaiNote {
  id: string;
  noteType: 'COMMENT' | 'CORRECTION' | 'APPROVAL' | 'REJECTION' | 'DEVIATION';
  content: string;
  createdBy: string;
  createdAt: Date;
  isInternal: boolean;
}

export interface FaiTemplate {
  id: string;
  name: string;
  description: string;
  partId?: string;
  characteristics: Omit<DimensionalCharacteristic, 'id' | 'actualValue' | 'result' | 'deviation' | 'deviationPercent'>[];
  materials: Omit<MaterialAccountability, 'id' | 'result' | 'certificationNumber' | 'certificationDate'>[];
  processes: Omit<ProcessAccountability, 'id' | 'result' | 'certificationNumber' | 'approvalDate'>[];
  functionalTests: Omit<FunctionalTest, 'id' | 'result' | 'actualResult' | 'testDate' | 'testedBy'>[];
  organizationId: string;
  createdBy: string;
  createdAt: Date;
  isActive: boolean;
}

export interface FaiDashboard {
  summary: {
    pending: number;
    inProgress: number;
    awaitingApproval: number;
    approved: number;
    rejected: number;
    total: number;
  };
  recentFais: FaiReport[];
  awaitingApproval: FaiReport[];
  overdueFais: FaiReport[];
  passRateByMonth: { month: string; passRate: number; count: number }[];
  failuresByReason: { reason: string; count: number }[];
}

// ============================================================================
// FAI SERVICE
// ============================================================================

@Injectable()
export class FirstArticleInspectionService {
  private readonly logger = new Logger(FirstArticleInspectionService.name);
  
  // FAI number counter
  private faiCounters: Map<string, number> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // FAI CREATION AND MANAGEMENT
  // ============================================================================

  /**
   * Create a new FAI report
   */
  async createFaiReport(
    organizationId: string,
    createdBy: string,
    partId: string,
    type: FaiType,
    workOrderId?: string,
    templateId?: string,
  ): Promise<FaiReport> {
    // Get part information
    const part = await this.prisma.part.findUnique({
      where: { id: partId },
      include: { customer: true },
    });
    
    if (!part) {
      throw new NotFoundException(`Part ${partId} not found`);
    }
    
    // Get work order if provided
    let workOrder = null;
    if (workOrderId) {
      workOrder = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });
    }
    
    // Generate FAI number
    const faiNumber = await this.generateFaiNumber(organizationId);
    
    // Load template if provided
    let template: FaiTemplate | null = null;
    if (templateId) {
      template = await this.getFaiTemplate(templateId);
    }
    
    const faiReport: FaiReport = {
      id: this.generateId(),
      faiNumber,
      type,
      status: FaiStatus.PENDING,
      partId,
      partNumber: part.partNumber,
      partName: part.name,
      revision: part.revision || 'A',
      customerId: part.customerId || undefined,
      customerName: part.customer?.name,
      customerPartNumber: part.customerPartNumber || undefined,
      workOrderId: workOrderId || undefined,
      workOrderNumber: workOrder?.workOrderNumber,
      
      form1: {
        partNumber: part.partNumber,
        partName: part.name,
        partRevision: part.revision || 'A',
        drawingNumber: part.drawingNumber || part.partNumber,
        drawingRevision: part.revision || 'A',
        manufacturingProcess: '',
        organizationName: '',
        manufacturingLocation: '',
        drawingDate: new Date(),
        faiDate: new Date(),
        preparedBy: createdBy,
        preparedDate: new Date(),
        reasonForFai: this.getReasonForFai(type),
      },
      
      form2: {
        materials: template?.materials.map((m, i) => ({
          ...m,
          id: this.generateId(),
          itemNumber: i + 1,
          result: MeasurementResult.NOT_MEASURED,
        })) || [],
        processes: template?.processes.map((p, i) => ({
          ...p,
          id: this.generateId(),
          itemNumber: i + 1,
          result: MeasurementResult.NOT_MEASURED,
        })) || [],
        functionalTests: template?.functionalTests.map((t, i) => ({
          ...t,
          id: this.generateId(),
          itemNumber: i + 1,
          result: MeasurementResult.NOT_MEASURED,
          actualResult: '',
          testDate: new Date(),
          testedBy: '',
        })) || [],
      },
      
      form3: {
        characteristics: template?.characteristics.map((c, i) => ({
          ...c,
          id: this.generateId(),
          characteristicNumber: i + 1,
          actualValue: 0,
          result: MeasurementResult.NOT_MEASURED,
        })) || [],
        summary: {
          totalCharacteristics: template?.characteristics.length || 0,
          passed: 0,
          failed: 0,
          deviations: 0,
          notMeasured: template?.characteristics.length || 0,
          passRate: 0,
          keyCharacteristicsPassed: 0,
          keyCharacteristicsTotal: template?.characteristics.filter(c => c.isKeyCharacteristic).length || 0,
        },
      },
      
      documents: [],
      notes: [],
      
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
      organizationId,
    };
    
    // Store the FAI report
    await this.storeFaiReport(faiReport);
    
    this.logger.log(`Created FAI report ${faiNumber} for part ${part.partNumber}`);
    
    return faiReport;
  }

  /**
   * Update FAI Form 1 (Part Information)
   */
  async updateForm1(
    faiId: string,
    userId: string,
    form1Data: Partial<FaiForm1>,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    if (faiReport.status === FaiStatus.APPROVED) {
      throw new BadRequestException('Cannot modify approved FAI report');
    }
    
    faiReport.form1 = { ...faiReport.form1, ...form1Data };
    faiReport.updatedAt = new Date();
    
    if (faiReport.status === FaiStatus.PENDING) {
      faiReport.status = FaiStatus.IN_PROGRESS;
    }
    
    await this.updateFaiReport(faiReport);
    
    return faiReport;
  }

  /**
   * Add material accountability record
   */
  async addMaterial(
    faiId: string,
    userId: string,
    material: Omit<MaterialAccountability, 'id' | 'itemNumber'>,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    const newMaterial: MaterialAccountability = {
      ...material,
      id: this.generateId(),
      itemNumber: faiReport.form2.materials.length + 1,
    };
    
    faiReport.form2.materials.push(newMaterial);
    faiReport.updatedAt = new Date();
    
    await this.updateFaiReport(faiReport);
    
    return faiReport;
  }

  /**
   * Add process accountability record
   */
  async addProcess(
    faiId: string,
    userId: string,
    process: Omit<ProcessAccountability, 'id' | 'itemNumber'>,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    const newProcess: ProcessAccountability = {
      ...process,
      id: this.generateId(),
      itemNumber: faiReport.form2.processes.length + 1,
    };
    
    faiReport.form2.processes.push(newProcess);
    faiReport.updatedAt = new Date();
    
    await this.updateFaiReport(faiReport);
    
    return faiReport;
  }

  /**
   * Add dimensional characteristic
   */
  async addCharacteristic(
    faiId: string,
    userId: string,
    characteristic: Omit<DimensionalCharacteristic, 'id' | 'characteristicNumber' | 'deviation' | 'deviationPercent'>,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    // Calculate deviation
    const { deviation, deviationPercent } = this.calculateDeviation(characteristic);
    
    const newCharacteristic: DimensionalCharacteristic = {
      ...characteristic,
      id: this.generateId(),
      characteristicNumber: faiReport.form3.characteristics.length + 1,
      deviation,
      deviationPercent,
    };
    
    faiReport.form3.characteristics.push(newCharacteristic);
    faiReport.form3.summary = this.calculateCharacteristicSummary(faiReport.form3.characteristics);
    faiReport.updatedAt = new Date();
    
    await this.updateFaiReport(faiReport);
    
    return faiReport;
  }

  /**
   * Record measurement for a characteristic
   */
  async recordMeasurement(
    faiId: string,
    characteristicId: string,
    userId: string,
    actualValue: number,
    measurementMethod?: string,
    gageUsed?: string,
    gageId?: string,
    notes?: string,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    const characteristic = faiReport.form3.characteristics.find(c => c.id === characteristicId);
    
    if (!characteristic) {
      throw new NotFoundException(`Characteristic ${characteristicId} not found`);
    }
    
    characteristic.actualValue = actualValue;
    characteristic.measurementMethod = measurementMethod;
    characteristic.gageUsed = gageUsed;
    characteristic.gageId = gageId;
    characteristic.notes = notes;
    
    // Calculate deviation and result
    const { deviation, deviationPercent } = this.calculateDeviation(characteristic);
    characteristic.deviation = deviation;
    characteristic.deviationPercent = deviationPercent;
    characteristic.result = this.determineResult(characteristic);
    
    faiReport.form3.summary = this.calculateCharacteristicSummary(faiReport.form3.characteristics);
    faiReport.updatedAt = new Date();
    
    await this.updateFaiReport(faiReport);
    
    return faiReport;
  }

  /**
   * Bulk import measurements (e.g., from CMM report)
   */
  async bulkImportMeasurements(
    faiId: string,
    userId: string,
    measurements: { characteristicNumber: number; actualValue: number; gageId?: string }[],
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    for (const measurement of measurements) {
      const characteristic = faiReport.form3.characteristics.find(
        c => c.characteristicNumber === measurement.characteristicNumber
      );
      
      if (characteristic) {
        characteristic.actualValue = measurement.actualValue;
        characteristic.gageId = measurement.gageId;
        
        const { deviation, deviationPercent } = this.calculateDeviation(characteristic);
        characteristic.deviation = deviation;
        characteristic.deviationPercent = deviationPercent;
        characteristic.result = this.determineResult(characteristic);
      }
    }
    
    faiReport.form3.summary = this.calculateCharacteristicSummary(faiReport.form3.characteristics);
    faiReport.updatedAt = new Date();
    
    await this.updateFaiReport(faiReport);
    
    return faiReport;
  }

  // ============================================================================
  // FAI WORKFLOW
  // ============================================================================

  /**
   * Submit FAI for approval
   */
  async submitForApproval(
    faiId: string,
    userId: string,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    // Validate completeness
    const validationErrors = this.validateFaiCompleteness(faiReport);
    if (validationErrors.length > 0) {
      throw new BadRequestException(`FAI report is incomplete: ${validationErrors.join(', ')}`);
    }
    
    faiReport.status = FaiStatus.AWAITING_APPROVAL;
    faiReport.submittedAt = new Date();
    faiReport.submittedBy = userId;
    faiReport.updatedAt = new Date();
    
    faiReport.notes.push({
      id: this.generateId(),
      noteType: 'COMMENT',
      content: 'FAI submitted for approval',
      createdBy: userId,
      createdAt: new Date(),
      isInternal: false,
    });
    
    await this.updateFaiReport(faiReport);
    
    this.logger.log(`FAI ${faiReport.faiNumber} submitted for approval`);
    
    return faiReport;
  }

  /**
   * Approve FAI report
   */
  async approveFai(
    faiId: string,
    userId: string,
    comments?: string,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    if (faiReport.status !== FaiStatus.AWAITING_APPROVAL) {
      throw new BadRequestException(`FAI report must be in AWAITING_APPROVAL status`);
    }
    
    faiReport.status = FaiStatus.APPROVED;
    faiReport.approvedAt = new Date();
    faiReport.approvedBy = userId;
    faiReport.form1.approvedBy = userId;
    faiReport.form1.approvedDate = new Date();
    faiReport.updatedAt = new Date();
    
    faiReport.notes.push({
      id: this.generateId(),
      noteType: 'APPROVAL',
      content: comments || 'FAI approved',
      createdBy: userId,
      createdAt: new Date(),
      isInternal: false,
    });
    
    await this.updateFaiReport(faiReport);
    
    // Update part FAI status
    await this.prisma.part.update({
      where: { id: faiReport.partId },
      data: { 
        faiStatus: 'APPROVED',
        faiApprovedDate: new Date(),
      },
    });
    
    this.logger.log(`FAI ${faiReport.faiNumber} approved`);
    
    return faiReport;
  }

  /**
   * Reject FAI report
   */
  async rejectFai(
    faiId: string,
    userId: string,
    reason: string,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    faiReport.status = FaiStatus.REJECTED;
    faiReport.rejectedAt = new Date();
    faiReport.rejectedBy = userId;
    faiReport.rejectionReason = reason;
    faiReport.updatedAt = new Date();
    
    faiReport.notes.push({
      id: this.generateId(),
      noteType: 'REJECTION',
      content: reason,
      createdBy: userId,
      createdAt: new Date(),
      isInternal: false,
    });
    
    await this.updateFaiReport(faiReport);
    
    this.logger.log(`FAI ${faiReport.faiNumber} rejected: ${reason}`);
    
    return faiReport;
  }

  /**
   * Conditionally approve FAI with deviations
   */
  async conditionallyApproveFai(
    faiId: string,
    userId: string,
    conditions: string,
    deviationIds: string[],
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    faiReport.status = FaiStatus.CONDITIONAL;
    faiReport.approvedAt = new Date();
    faiReport.approvedBy = userId;
    faiReport.updatedAt = new Date();
    
    faiReport.notes.push({
      id: this.generateId(),
      noteType: 'DEVIATION',
      content: `Conditionally approved with deviations: ${conditions}. Affected characteristics: ${deviationIds.join(', ')}`,
      createdBy: userId,
      createdAt: new Date(),
      isInternal: false,
    });
    
    await this.updateFaiReport(faiReport);
    
    this.logger.log(`FAI ${faiReport.faiNumber} conditionally approved`);
    
    return faiReport;
  }

  // ============================================================================
  // FAI RETRIEVAL
  // ============================================================================

  /**
   * Get FAI report by ID
   */
  async getFaiReport(faiId: string): Promise<FaiReport | null> {
    // In real implementation, load from database
    return null;
  }

  /**
   * Get FAI reports for organization
   */
  async getFaiReports(
    organizationId: string,
    filter?: {
      status?: FaiStatus[];
      type?: FaiType[];
      partId?: string;
      customerId?: string;
      dateRange?: { start: Date; end: Date };
      searchTerm?: string;
    },
  ): Promise<FaiReport[]> {
    // In real implementation, query database with filters
    return [];
  }

  /**
   * Get FAI dashboard
   */
  async getFaiDashboard(organizationId: string): Promise<FaiDashboard> {
    const [allFais, recentFais] = await Promise.all([
      this.getFaiReports(organizationId),
      this.getFaiReports(organizationId),
    ]);
    
    return {
      summary: {
        pending: allFais.filter(f => f.status === FaiStatus.PENDING).length,
        inProgress: allFais.filter(f => f.status === FaiStatus.IN_PROGRESS).length,
        awaitingApproval: allFais.filter(f => f.status === FaiStatus.AWAITING_APPROVAL).length,
        approved: allFais.filter(f => f.status === FaiStatus.APPROVED).length,
        rejected: allFais.filter(f => f.status === FaiStatus.REJECTED).length,
        total: allFais.length,
      },
      recentFais: recentFais.slice(0, 10),
      awaitingApproval: allFais.filter(f => f.status === FaiStatus.AWAITING_APPROVAL),
      overdueFais: [], // Would calculate based on due dates
      passRateByMonth: [],
      failuresByReason: [],
    };
  }

  // ============================================================================
  // FAI TEMPLATES
  // ============================================================================

  /**
   * Create FAI template from existing FAI
   */
  async createTemplateFromFai(
    faiId: string,
    userId: string,
    templateName: string,
    description: string,
  ): Promise<FaiTemplate> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    const template: FaiTemplate = {
      id: this.generateId(),
      name: templateName,
      description,
      partId: faiReport.partId,
      characteristics: faiReport.form3.characteristics.map(c => ({
        referenceLocation: c.referenceLocation,
        characteristicDesignator: c.characteristicDesignator,
        requirement: c.requirement,
        nominal: c.nominal,
        toleranceType: c.toleranceType,
        upperTolerance: c.upperTolerance,
        lowerTolerance: c.lowerTolerance,
        upperLimit: c.upperLimit,
        lowerLimit: c.lowerLimit,
        measurementMethod: c.measurementMethod,
        isKeyCharacteristic: c.isKeyCharacteristic,
        isDesignatedCharacteristic: c.isDesignatedCharacteristic,
        characteristicType: c.characteristicType,
      })),
      materials: faiReport.form2.materials.map(m => ({
        materialName: m.materialName,
        specification: m.specification,
        code: m.code,
        supplier: m.supplier,
      })),
      processes: faiReport.form2.processes.map(p => ({
        processName: p.processName,
        specification: p.specification,
        code: p.code,
        processSource: p.processSource,
        supplierName: p.supplierName,
      })),
      functionalTests: faiReport.form2.functionalTests.map(t => ({
        testName: t.testName,
        specification: t.specification,
        testProcedure: t.testProcedure,
        acceptanceCriteria: t.acceptanceCriteria,
      })),
      organizationId: faiReport.organizationId,
      createdBy: userId,
      createdAt: new Date(),
      isActive: true,
    };
    
    // Store template
    await this.storeFaiTemplate(template);
    
    return template;
  }

  /**
   * Get FAI template by ID
   */
  async getFaiTemplate(templateId: string): Promise<FaiTemplate | null> {
    // In real implementation, load from database
    return null;
  }

  /**
   * Get available templates for organization
   */
  async getFaiTemplates(organizationId: string): Promise<FaiTemplate[]> {
    // In real implementation, query database
    return [];
  }

  // ============================================================================
  // DOCUMENT MANAGEMENT
  // ============================================================================

  /**
   * Add document to FAI
   */
  async addDocument(
    faiId: string,
    userId: string,
    document: Omit<FaiDocument, 'id' | 'uploadedBy' | 'uploadedAt'>,
  ): Promise<FaiReport> {
    const faiReport = await this.getFaiReport(faiId);
    
    if (!faiReport) {
      throw new NotFoundException(`FAI report ${faiId} not found`);
    }
    
    const newDocument: FaiDocument = {
      ...document,
      id: this.generateId(),
      uploadedBy: userId,
      uploadedAt: new Date(),
    };
    
    faiReport.documents.push(newDocument);
    faiReport.updatedAt = new Date();
    
    await this.updateFaiReport(faiReport);
    
    return faiReport;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async generateFaiNumber(organizationId: string): Promise<string> {
    const counter = (this.faiCounters.get(organizationId) || 0) + 1;
    this.faiCounters.set(organizationId, counter);
    
    const year = new Date().getFullYear().toString().slice(-2);
    return `FAI-${year}-${counter.toString().padStart(5, '0')}`;
  }

  private getReasonForFai(type: FaiType): string {
    const reasons: Record<FaiType, string> = {
      [FaiType.NEW_PART]: 'Initial production of new part',
      [FaiType.DESIGN_CHANGE]: 'Engineering design change',
      [FaiType.PROCESS_CHANGE]: 'Manufacturing process change',
      [FaiType.TOOLING_CHANGE]: 'Tooling or fixture change',
      [FaiType.SUPPLIER_CHANGE]: 'Supplier or material change',
      [FaiType.REQUALIFICATION]: 'Periodic requalification',
      [FaiType.CUSTOMER_REQUEST]: 'Customer requested FAI',
    };
    return reasons[type];
  }

  private calculateDeviation(
    characteristic: Partial<DimensionalCharacteristic>,
  ): { deviation: number; deviationPercent: number } {
    if (characteristic.actualValue === undefined || characteristic.nominal === undefined) {
      return { deviation: 0, deviationPercent: 0 };
    }
    
    const deviation = characteristic.actualValue - characteristic.nominal;
    const deviationPercent = characteristic.nominal !== 0 
      ? (deviation / characteristic.nominal) * 100 
      : 0;
    
    return {
      deviation: Math.round(deviation * 10000) / 10000,
      deviationPercent: Math.round(deviationPercent * 100) / 100,
    };
  }

  private determineResult(characteristic: DimensionalCharacteristic): MeasurementResult {
    if (characteristic.actualValue === undefined) {
      return MeasurementResult.NOT_MEASURED;
    }
    
    let upperLimit: number;
    let lowerLimit: number;
    
    switch (characteristic.toleranceType) {
      case ToleranceType.BILATERAL:
        upperLimit = characteristic.nominal + (characteristic.upperTolerance || 0);
        lowerLimit = characteristic.nominal - (characteristic.lowerTolerance || characteristic.upperTolerance || 0);
        break;
      case ToleranceType.UNILATERAL_PLUS:
        upperLimit = characteristic.nominal + (characteristic.upperTolerance || 0);
        lowerLimit = characteristic.nominal;
        break;
      case ToleranceType.UNILATERAL_MINUS:
        upperLimit = characteristic.nominal;
        lowerLimit = characteristic.nominal - (characteristic.lowerTolerance || 0);
        break;
      case ToleranceType.LIMIT:
        upperLimit = characteristic.upperLimit || characteristic.nominal;
        lowerLimit = characteristic.lowerLimit || characteristic.nominal;
        break;
      case ToleranceType.REFERENCE:
        return MeasurementResult.PASS; // Reference dimensions always pass
      default:
        return MeasurementResult.NOT_MEASURED;
    }
    
    if (characteristic.actualValue >= lowerLimit && characteristic.actualValue <= upperLimit) {
      return MeasurementResult.PASS;
    }
    
    // Check if it's a minor deviation (within 10% of tolerance)
    const tolerance = upperLimit - lowerLimit;
    const outsideTolerance = Math.max(
      characteristic.actualValue - upperLimit,
      lowerLimit - characteristic.actualValue,
    );
    
    if (outsideTolerance <= tolerance * 0.1) {
      return MeasurementResult.DEVIATION;
    }
    
    return MeasurementResult.FAIL;
  }

  private calculateCharacteristicSummary(
    characteristics: DimensionalCharacteristic[],
  ): CharacteristicSummary {
    const passed = characteristics.filter(c => c.result === MeasurementResult.PASS).length;
    const failed = characteristics.filter(c => c.result === MeasurementResult.FAIL).length;
    const deviations = characteristics.filter(c => c.result === MeasurementResult.DEVIATION).length;
    const notMeasured = characteristics.filter(c => c.result === MeasurementResult.NOT_MEASURED).length;
    
    const keyCharacteristics = characteristics.filter(c => c.isKeyCharacteristic);
    const keyPassed = keyCharacteristics.filter(c => c.result === MeasurementResult.PASS).length;
    
    const measured = characteristics.length - notMeasured;
    
    return {
      totalCharacteristics: characteristics.length,
      passed,
      failed,
      deviations,
      notMeasured,
      passRate: measured > 0 ? Math.round((passed / measured) * 100) : 0,
      keyCharacteristicsPassed: keyPassed,
      keyCharacteristicsTotal: keyCharacteristics.length,
    };
  }

  private validateFaiCompleteness(faiReport: FaiReport): string[] {
    const errors: string[] = [];
    
    // Form 1 validation
    if (!faiReport.form1.drawingNumber) errors.push('Drawing number is required');
    if (!faiReport.form1.manufacturingProcess) errors.push('Manufacturing process is required');
    if (!faiReport.form1.organizationName) errors.push('Organization name is required');
    
    // Form 3 validation
    const unmeasured = faiReport.form3.characteristics.filter(
      c => c.result === MeasurementResult.NOT_MEASURED
    );
    if (unmeasured.length > 0) {
      errors.push(`${unmeasured.length} characteristics not measured`);
    }
    
    // Key characteristics must all pass
    const keyFailed = faiReport.form3.characteristics.filter(
      c => c.isKeyCharacteristic && c.result === MeasurementResult.FAIL
    );
    if (keyFailed.length > 0) {
      errors.push(`${keyFailed.length} key characteristics failed`);
    }
    
    return errors;
  }

  private async storeFaiReport(faiReport: FaiReport): Promise<void> {
    // In real implementation, store in database
  }

  private async updateFaiReport(faiReport: FaiReport): Promise<void> {
    // In real implementation, update in database
  }

  private async storeFaiTemplate(template: FaiTemplate): Promise<void> {
    // In real implementation, store in database
  }
}
