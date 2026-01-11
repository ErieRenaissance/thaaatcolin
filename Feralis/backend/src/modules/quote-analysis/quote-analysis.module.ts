/**
 * Quote Advanced Analysis Module
 * 
 * Provides comprehensive CAD analysis, toolpath generation, nesting optimization,
 * and 3D process simulation for real-time quoting capabilities.
 * 
 * Features:
 * - Real-time geometry analysis (STEP, IGES, DXF file parsing)
 * - Design for Manufacturability (DFM) assessment
 * - Automatic toolpath generation with intelligent tool selection
 * - Sheet metal unfolding and bend sequence optimization
 * - Laser cut path and nesting optimization
 * - 3D process animation and simulation
 * - Process routing generation
 * - Lead time calculation
 * 
 * @module QuoteAnalysisModule
 */

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { QuoteAnalysisService } from './services/quote-analysis.service';
import { GeometryAnalysisService } from './services/geometry-analysis.service';
import { ToolpathGenerationService } from './services/toolpath-generation.service';
import { NestingService } from './services/nesting.service';
import { SimulationService } from './services/simulation.service';
import { DfmAssessmentService } from './services/dfm-assessment.service';
import { LeadTimeCalculatorService } from './services/lead-time-calculator.service';
import { QuoteAnalysisController } from './controllers/quote-analysis.controller';

@Module({
  imports: [
    PrismaModule,
    // Queue for processing CAD files asynchronously
    BullModule.registerQueue(
      { name: 'geometry-analysis' },
      { name: 'toolpath-generation' },
      { name: 'nesting-optimization' },
      { name: 'simulation-rendering' },
    ),
  ],
  controllers: [QuoteAnalysisController],
  providers: [
    QuoteAnalysisService,
    GeometryAnalysisService,
    ToolpathGenerationService,
    NestingService,
    SimulationService,
    DfmAssessmentService,
    LeadTimeCalculatorService,
  ],
  exports: [
    QuoteAnalysisService,
    GeometryAnalysisService,
    ToolpathGenerationService,
    NestingService,
    SimulationService,
    DfmAssessmentService,
    LeadTimeCalculatorService,
  ],
})
export class QuoteAnalysisModule {}

/**
 * Module Configuration Notes:
 * 
 * 1. DEPENDENCIES:
 *    - @nestjs/bull: For async job processing
 *    - Redis: Required for Bull queue backend
 *    - opencascade.js or similar: For CAD file parsing (STEP/IGES)
 *    - dxf-parser: For DXF file parsing
 * 
 * 2. ENVIRONMENT VARIABLES:
 *    - REDIS_HOST: Redis server host
 *    - REDIS_PORT: Redis server port
 *    - CAD_PROCESSING_TIMEOUT: Max time for CAD analysis (ms)
 *    - SIMULATION_QUALITY: low|medium|high
 * 
 * 3. QUEUE CONFIGURATION:
 *    - geometry-analysis: Priority queue for CAD parsing
 *    - toolpath-generation: CPU-intensive toolpath calculations
 *    - nesting-optimization: Optimization algorithms
 *    - simulation-rendering: 3D rendering jobs
 * 
 * 4. FILE STORAGE:
 *    - Uploaded CAD files stored in /uploads/cad/
 *    - Generated toolpaths stored in /outputs/toolpaths/
 *    - Simulation renders stored in /outputs/simulations/
 * 
 * 5. SUPPORTED FILE FORMATS:
 *    - STEP (.step, .stp) - 3D solid models
 *    - IGES (.iges, .igs) - 3D/2D exchange format
 *    - DXF (.dxf) - 2D drawings
 *    - Future: SOLIDWORKS, Fusion 360 native formats
 */
