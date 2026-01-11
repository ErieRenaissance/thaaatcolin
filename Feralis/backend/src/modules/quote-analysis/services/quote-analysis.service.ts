/**
 * Quote Analysis Service
 * 
 * Main orchestration service for CAD analysis, toolpath generation,
 * nesting optimization, and simulation for real-time quoting.
 * 
 * @module QuoteAnalysisService
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../prisma/prisma.service';
import { GeometryAnalysisService } from './geometry-analysis.service';
import { ToolpathGenerationService } from './toolpath-generation.service';
import { NestingService } from './nesting.service';
import { SimulationService } from './simulation.service';
import { DfmAssessmentService } from './dfm-assessment.service';
import { LeadTimeCalculatorService } from './lead-time-calculator.service';
import {
  AnalyzeQuoteDto,
  GeometryAnalysisResultDto,
  ToolpathResultDto,
  NestingResultDto,
  SimulationResultDto,
  QuoteAnalysisSummaryDto,
} from '../dto';

@Injectable()
export class QuoteAnalysisService {
  private readonly logger = new Logger(QuoteAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly geometryService: GeometryAnalysisService,
    private readonly toolpathService: ToolpathGenerationService,
    private readonly nestingService: NestingService,
    private readonly simulationService: SimulationService,
    private readonly dfmService: DfmAssessmentService,
    private readonly leadTimeService: LeadTimeCalculatorService,
    @InjectQueue('geometry-analysis') private readonly geometryQueue: Queue,
    @InjectQueue('toolpath-generation') private readonly toolpathQueue: Queue,
    @InjectQueue('nesting-optimization') private readonly nestingQueue: Queue,
    @InjectQueue('simulation-rendering') private readonly simulationQueue: Queue,
  ) {}

  // ============================================================
  // FULL QUOTE ANALYSIS ORCHESTRATION
  // ============================================================

  /**
   * Initiates comprehensive analysis for a quote line item
   * Runs geometry analysis, DFM assessment, toolpath generation, and simulation
   */
  async analyzeQuoteLine(
    quoteLineId: string,
    options: AnalyzeQuoteDto,
  ): Promise<{ jobId: string; status: string }> {
    this.logger.log(`Starting analysis for quote line: ${quoteLineId}`);

    // Verify quote line exists and get part info
    const quoteLine = await this.prisma.quoteLine.findUnique({
      where: { id: quoteLineId },
      include: {
        part: true,
        quote: {
          include: { customer: true },
        },
      },
    });

    if (!quoteLine) {
      throw new NotFoundException(`Quote line ${quoteLineId} not found`);
    }

    // Create geometry analysis record
    const analysis = await this.prisma.quoteGeometryAnalysis.create({
      data: {
        quoteLineId,
        status: 'PENDING',
        fileUrl: options.cadFileUrl,
        fileFormat: this.detectFileFormat(options.cadFileUrl),
        analysisConfig: options.analysisConfig || {},
      },
    });

    // Queue the full analysis pipeline
    const job = await this.geometryQueue.add('full-analysis', {
      analysisId: analysis.id,
      quoteLineId,
      partId: quoteLine.partId,
      cadFileUrl: options.cadFileUrl,
      options: {
        generateToolpath: options.generateToolpath ?? true,
        generateNesting: options.generateNesting ?? quoteLine.part?.partType === 'SHEET_METAL',
        generateSimulation: options.generateSimulation ?? true,
        runDfmAssessment: options.runDfmAssessment ?? true,
      },
    });

    return {
      jobId: job.id.toString(),
      status: 'QUEUED',
    };
  }

  /**
   * Process the full analysis pipeline (called by queue worker)
   */
  async processFullAnalysis(data: {
    analysisId: string;
    quoteLineId: string;
    partId: string;
    cadFileUrl: string;
    options: any;
  }): Promise<QuoteAnalysisSummaryDto> {
    const { analysisId, quoteLineId, partId, cadFileUrl, options } = data;

    try {
      // Step 1: Update status to processing
      await this.updateAnalysisStatus(analysisId, 'ANALYZING');

      // Step 2: Geometry Analysis
      this.logger.log(`Step 1/5: Analyzing geometry for ${analysisId}`);
      const geometryResult = await this.geometryService.analyzeGeometry(cadFileUrl);
      
      await this.prisma.quoteGeometryAnalysis.update({
        where: { id: analysisId },
        data: {
          boundingBox: geometryResult.boundingBox,
          volume: geometryResult.volume,
          surfaceArea: geometryResult.surfaceArea,
          centerOfMass: geometryResult.centerOfMass,
          features: geometryResult.features,
          featureCount: geometryResult.featureCount,
          complexity: geometryResult.complexity,
        },
      });

      // Step 3: DFM Assessment
      let dfmResult = null;
      if (options.runDfmAssessment) {
        this.logger.log(`Step 2/5: Running DFM assessment for ${analysisId}`);
        dfmResult = await this.dfmService.assessManufacturability(geometryResult);
        
        await this.prisma.quoteGeometryAnalysis.update({
          where: { id: analysisId },
          data: {
            dfmIssues: dfmResult.issues,
            dfmScore: dfmResult.overallScore,
            dfmRecommendations: dfmResult.recommendations,
          },
        });
      }

      // Step 4: Toolpath Generation
      let toolpathResult = null;
      if (options.generateToolpath) {
        this.logger.log(`Step 3/5: Generating toolpath for ${analysisId}`);
        toolpathResult = await this.toolpathService.generateToolpath(
          geometryResult,
          { partId }
        );

        await this.prisma.quoteToolpath.create({
          data: {
            quoteLineId,
            machineType: toolpathResult.machineType,
            toolpathData: toolpathResult.toolpathData,
            estimatedCycleTime: toolpathResult.estimatedCycleTime,
            toolsRequired: toolpathResult.toolsRequired,
            operations: toolpathResult.operations,
            feedsAndSpeeds: toolpathResult.feedsAndSpeeds,
            gcode: toolpathResult.gcode,
          },
        });
      }

      // Step 5: Nesting (for sheet metal parts)
      let nestingResult = null;
      if (options.generateNesting && geometryResult.isSheetMetal) {
        this.logger.log(`Step 4/5: Optimizing nesting for ${analysisId}`);
        nestingResult = await this.nestingService.optimizeNesting(geometryResult, {
          sheetSize: options.sheetSize,
          quantity: options.quantity || 1,
        });

        await this.prisma.quoteNesting.create({
          data: {
            quoteLineId,
            sheetMaterialId: nestingResult.materialId,
            sheetWidth: nestingResult.sheetWidth,
            sheetLength: nestingResult.sheetLength,
            partsPerSheet: nestingResult.partsPerSheet,
            materialUtilization: nestingResult.utilization,
            nestingLayout: nestingResult.layout,
            layoutSvg: nestingResult.layoutSvg,
          },
        });
      }

      // Step 6: Simulation
      let simulationResult = null;
      if (options.generateSimulation) {
        this.logger.log(`Step 5/5: Generating simulation for ${analysisId}`);
        simulationResult = await this.simulationService.generateSimulation(
          geometryResult,
          toolpathResult,
        );

        await this.prisma.quoteSimulation.create({
          data: {
            quoteLineId,
            simulationType: simulationResult.type,
            animationUrl: simulationResult.animationUrl,
            thumbnailUrl: simulationResult.thumbnailUrl,
            duration: simulationResult.duration,
            keyframes: simulationResult.keyframes,
            metadata: simulationResult.metadata,
          },
        });
      }

      // Step 7: Calculate lead time and update quote line
      const leadTime = await this.leadTimeService.calculateLeadTime({
        geometryResult,
        toolpathResult,
        currentCapacity: await this.getCapacitySnapshot(),
      });

      // Update analysis status to complete
      await this.updateAnalysisStatus(analysisId, 'COMPLETE');

      // Return summary
      return {
        analysisId,
        quoteLineId,
        status: 'COMPLETE',
        geometry: {
          volume: geometryResult.volume,
          surfaceArea: geometryResult.surfaceArea,
          complexity: geometryResult.complexity,
          featureCount: geometryResult.featureCount,
        },
        dfm: dfmResult ? {
          score: dfmResult.overallScore,
          issueCount: dfmResult.issues.length,
          criticalIssues: dfmResult.issues.filter((i: any) => i.severity === 'CRITICAL').length,
        } : null,
        toolpath: toolpathResult ? {
          cycleTime: toolpathResult.estimatedCycleTime,
          toolCount: toolpathResult.toolsRequired.length,
          operationCount: toolpathResult.operations.length,
        } : null,
        nesting: nestingResult ? {
          partsPerSheet: nestingResult.partsPerSheet,
          utilization: nestingResult.utilization,
        } : null,
        simulation: simulationResult ? {
          available: true,
          url: simulationResult.animationUrl,
        } : null,
        estimatedLeadTime: leadTime,
      };
    } catch (error) {
      this.logger.error(`Analysis failed for ${analysisId}: ${error.message}`);
      await this.updateAnalysisStatus(analysisId, 'FAILED', error.message);
      throw error;
    }
  }

  // ============================================================
  // INDIVIDUAL ANALYSIS METHODS
  // ============================================================

  /**
   * Run geometry analysis only
   */
  async analyzeGeometry(
    quoteLineId: string,
    cadFileUrl: string,
  ): Promise<GeometryAnalysisResultDto> {
    const quoteLine = await this.prisma.quoteLine.findUnique({
      where: { id: quoteLineId },
    });

    if (!quoteLine) {
      throw new NotFoundException(`Quote line ${quoteLineId} not found`);
    }

    const result = await this.geometryService.analyzeGeometry(cadFileUrl);

    // Store the analysis
    await this.prisma.quoteGeometryAnalysis.create({
      data: {
        quoteLineId,
        status: 'COMPLETE',
        fileUrl: cadFileUrl,
        fileFormat: this.detectFileFormat(cadFileUrl),
        boundingBox: result.boundingBox,
        volume: result.volume,
        surfaceArea: result.surfaceArea,
        centerOfMass: result.centerOfMass,
        features: result.features,
        featureCount: result.featureCount,
        complexity: result.complexity,
      },
    });

    return result;
  }

  /**
   * Generate toolpath for a quote line
   */
  async generateToolpath(
    quoteLineId: string,
    options?: { machineType?: string; strategy?: string },
  ): Promise<ToolpathResultDto> {
    // Get existing geometry analysis
    const analysis = await this.prisma.quoteGeometryAnalysis.findFirst({
      where: { quoteLineId, status: 'COMPLETE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) {
      throw new BadRequestException(
        'Geometry analysis must be completed before toolpath generation',
      );
    }

    const quoteLine = await this.prisma.quoteLine.findUnique({
      where: { id: quoteLineId },
      include: { part: true },
    });

    const geometryResult = {
      boundingBox: analysis.boundingBox as any,
      volume: analysis.volume,
      surfaceArea: analysis.surfaceArea,
      features: analysis.features as any,
      featureCount: analysis.featureCount,
      complexity: analysis.complexity as any,
    };

    const result = await this.toolpathService.generateToolpath(
      geometryResult,
      {
        partId: quoteLine.partId,
        machineType: options?.machineType,
        strategy: options?.strategy,
      },
    );

    // Store the toolpath
    await this.prisma.quoteToolpath.create({
      data: {
        quoteLineId,
        machineType: result.machineType,
        toolpathData: result.toolpathData,
        estimatedCycleTime: result.estimatedCycleTime,
        toolsRequired: result.toolsRequired,
        operations: result.operations,
        feedsAndSpeeds: result.feedsAndSpeeds,
        gcode: result.gcode,
      },
    });

    return result;
  }

  /**
   * Generate nesting layout for sheet metal parts
   */
  async generateNesting(
    quoteLineId: string,
    options: { sheetWidth: number; sheetLength: number; quantity: number },
  ): Promise<NestingResultDto> {
    const analysis = await this.prisma.quoteGeometryAnalysis.findFirst({
      where: { quoteLineId, status: 'COMPLETE' },
      orderBy: { createdAt: 'desc' },
    });

    if (!analysis) {
      throw new BadRequestException(
        'Geometry analysis must be completed before nesting',
      );
    }

    const geometryResult = {
      boundingBox: analysis.boundingBox as any,
      features: analysis.features as any,
      isSheetMetal: true,
    };

    const result = await this.nestingService.optimizeNesting(geometryResult, {
      sheetSize: { width: options.sheetWidth, length: options.sheetLength },
      quantity: options.quantity,
    });

    // Store the nesting result
    await this.prisma.quoteNesting.create({
      data: {
        quoteLineId,
        sheetWidth: options.sheetWidth,
        sheetLength: options.sheetLength,
        partsPerSheet: result.partsPerSheet,
        materialUtilization: result.utilization,
        nestingLayout: result.layout,
        layoutSvg: result.layoutSvg,
      },
    });

    return result;
  }

  /**
   * Generate 3D simulation/animation
   */
  async generateSimulation(quoteLineId: string): Promise<SimulationResultDto> {
    const [analysis, toolpath] = await Promise.all([
      this.prisma.quoteGeometryAnalysis.findFirst({
        where: { quoteLineId, status: 'COMPLETE' },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quoteToolpath.findFirst({
        where: { quoteLineId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!analysis) {
      throw new BadRequestException(
        'Geometry analysis must be completed before simulation',
      );
    }

    const geometryResult = {
      boundingBox: analysis.boundingBox as any,
      features: analysis.features as any,
    };

    const toolpathResult = toolpath ? {
      toolpathData: toolpath.toolpathData as any,
      operations: toolpath.operations as any,
    } : null;

    const result = await this.simulationService.generateSimulation(
      geometryResult,
      toolpathResult,
    );

    // Store the simulation
    await this.prisma.quoteSimulation.create({
      data: {
        quoteLineId,
        simulationType: result.type,
        animationUrl: result.animationUrl,
        thumbnailUrl: result.thumbnailUrl,
        duration: result.duration,
        keyframes: result.keyframes,
        metadata: result.metadata,
      },
    });

    return result;
  }

  // ============================================================
  // RETRIEVAL METHODS
  // ============================================================

  /**
   * Get analysis status for a quote line
   */
  async getAnalysisStatus(quoteLineId: string): Promise<{
    geometryAnalysis: any;
    toolpath: any;
    nesting: any;
    simulation: any;
  }> {
    const [geometryAnalysis, toolpath, nesting, simulation] = await Promise.all([
      this.prisma.quoteGeometryAnalysis.findFirst({
        where: { quoteLineId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quoteToolpath.findFirst({
        where: { quoteLineId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quoteNesting.findFirst({
        where: { quoteLineId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quoteSimulation.findFirst({
        where: { quoteLineId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      geometryAnalysis,
      toolpath,
      nesting,
      simulation,
    };
  }

  /**
   * Get full analysis results for a quote
   */
  async getQuoteAnalysis(quoteId: string): Promise<any[]> {
    const quoteLines = await this.prisma.quoteLine.findMany({
      where: { quoteId },
      include: {
        part: true,
      },
    });

    const results = await Promise.all(
      quoteLines.map(async (line) => {
        const status = await this.getAnalysisStatus(line.id);
        return {
          quoteLineId: line.id,
          partNumber: line.part?.partNumber,
          ...status,
        };
      }),
    );

    return results;
  }

  /**
   * Get geometry analysis by ID
   */
  async getGeometryAnalysis(analysisId: string): Promise<any> {
    const analysis = await this.prisma.quoteGeometryAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      throw new NotFoundException(`Analysis ${analysisId} not found`);
    }

    return analysis;
  }

  /**
   * Get toolpath data
   */
  async getToolpath(toolpathId: string): Promise<any> {
    const toolpath = await this.prisma.quoteToolpath.findUnique({
      where: { id: toolpathId },
    });

    if (!toolpath) {
      throw new NotFoundException(`Toolpath ${toolpathId} not found`);
    }

    return toolpath;
  }

  /**
   * Get nesting layout
   */
  async getNesting(nestingId: string): Promise<any> {
    const nesting = await this.prisma.quoteNesting.findUnique({
      where: { id: nestingId },
    });

    if (!nesting) {
      throw new NotFoundException(`Nesting ${nestingId} not found`);
    }

    return nesting;
  }

  /**
   * Get simulation data
   */
  async getSimulation(simulationId: string): Promise<any> {
    const simulation = await this.prisma.quoteSimulation.findUnique({
      where: { id: simulationId },
    });

    if (!simulation) {
      throw new NotFoundException(`Simulation ${simulationId} not found`);
    }

    return simulation;
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private detectFileFormat(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const formatMap: Record<string, string> = {
      step: 'STEP',
      stp: 'STEP',
      iges: 'IGES',
      igs: 'IGES',
      dxf: 'DXF',
    };
    return formatMap[extension] || 'UNKNOWN';
  }

  private async updateAnalysisStatus(
    analysisId: string,
    status: string,
    errorMessage?: string,
  ): Promise<void> {
    await this.prisma.quoteGeometryAnalysis.update({
      where: { id: analysisId },
      data: {
        status,
        ...(status === 'COMPLETE' && { completedAt: new Date() }),
        ...(errorMessage && { errorMessage }),
      },
    });
  }

  private async getCapacitySnapshot(): Promise<any> {
    // Get current machine availability and queue depth
    const machines = await this.prisma.machine.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        workCenter: true,
      },
    });

    const pendingWorkOrders = await this.prisma.workOrder.count({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
    });

    return {
      availableMachines: machines.length,
      pendingWorkOrders,
      estimatedQueueDays: Math.ceil(pendingWorkOrders / machines.length / 2), // Simple estimation
    };
  }
}
