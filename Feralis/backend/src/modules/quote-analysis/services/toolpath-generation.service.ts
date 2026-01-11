/**
 * Toolpath Generation Service
 * 
 * Generates optimal CNC toolpaths from geometry analysis,
 * with intelligent tool selection and machining strategy optimization.
 * 
 * Supports:
 * - 3-axis milling
 * - 5-axis milling
 * - Turning/lathe
 * - Laser cutting
 * - Press brake operations
 * 
 * @module ToolpathGenerationService
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

// Machining operation types
export enum OperationType {
  FACING = 'FACING',
  ROUGHING = 'ROUGHING',
  SEMI_FINISHING = 'SEMI_FINISHING',
  FINISHING = 'FINISHING',
  DRILLING = 'DRILLING',
  TAPPING = 'TAPPING',
  BORING = 'BORING',
  REAMING = 'REAMING',
  POCKETING = 'POCKETING',
  CONTOURING = 'CONTOURING',
  CHAMFERING = 'CHAMFERING',
  THREADING = 'THREADING',
  LASER_CUTTING = 'LASER_CUTTING',
  BENDING = 'BENDING',
}

export enum MachineType {
  CNC_MILL_3AXIS = 'CNC_MILL_3AXIS',
  CNC_MILL_5AXIS = 'CNC_MILL_5AXIS',
  CNC_LATHE = 'CNC_LATHE',
  LASER_CUTTER = 'LASER_CUTTER',
  PRESS_BRAKE = 'PRESS_BRAKE',
  WATERJET = 'WATERJET',
  EDM = 'EDM',
}

export interface ToolpathOperation {
  id: string;
  sequence: number;
  type: OperationType;
  toolId: string;
  toolName: string;
  feedRate: number;        // mm/min
  spindleSpeed: number;    // RPM
  depthOfCut: number;      // mm
  stepover: number;        // mm or %
  coolant: 'FLOOD' | 'MIST' | 'AIR' | 'NONE';
  estimatedTime: number;   // seconds
  gcode: string;
  toolpathLength: number;  // mm
  materialRemovalRate: number; // cm³/min
}

export interface ToolRequirement {
  toolId: string;
  toolType: string;
  diameter: number;
  length: number;
  flutes?: number;
  material: string;
  coating?: string;
  usage: string[];
}

export interface ToolpathResult {
  machineType: MachineType;
  toolpathData: {
    operations: ToolpathOperation[];
    setupCount: number;
    totalToolchanges: number;
    workholding: string;
  };
  estimatedCycleTime: number; // seconds
  toolsRequired: ToolRequirement[];
  operations: ToolpathOperation[];
  feedsAndSpeeds: Record<string, { feed: number; speed: number }>;
  gcode: string;
  ncProgram: string;
}

@Injectable()
export class ToolpathGenerationService {
  private readonly logger = new Logger(ToolpathGenerationService.name);

  // Material-based cutting parameters (example values)
  private readonly materialParams: Record<string, any> = {
    'ALUMINUM_6061': {
      surfaceSpeed: 300, // m/min
      feedPerTooth: 0.1, // mm
      depthFactor: 1.0,
      coolant: 'FLOOD',
    },
    'STEEL_1018': {
      surfaceSpeed: 100,
      feedPerTooth: 0.08,
      depthFactor: 0.5,
      coolant: 'FLOOD',
    },
    'STAINLESS_304': {
      surfaceSpeed: 60,
      feedPerTooth: 0.06,
      depthFactor: 0.4,
      coolant: 'FLOOD',
    },
    'TITANIUM_6AL4V': {
      surfaceSpeed: 40,
      feedPerTooth: 0.04,
      depthFactor: 0.3,
      coolant: 'FLOOD',
    },
    'BRASS': {
      surfaceSpeed: 200,
      feedPerTooth: 0.12,
      depthFactor: 0.8,
      coolant: 'AIR',
    },
    'PLASTIC_DELRIN': {
      surfaceSpeed: 400,
      feedPerTooth: 0.15,
      depthFactor: 1.2,
      coolant: 'AIR',
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate complete toolpath from geometry analysis
   */
  async generateToolpath(
    geometryResult: any,
    options: {
      partId?: string;
      machineType?: string;
      strategy?: string;
      material?: string;
    },
  ): Promise<ToolpathResult> {
    this.logger.log('Generating toolpath...');

    // Determine best machine type based on geometry
    const machineType = options.machineType 
      ? (options.machineType as MachineType)
      : this.selectMachineType(geometryResult);

    // Get material parameters
    const material = options.material || 'ALUMINUM_6061';
    const materialParams = this.materialParams[material] || this.materialParams['ALUMINUM_6061'];

    // Generate operations based on machine type
    let operations: ToolpathOperation[];
    let toolsRequired: ToolRequirement[];

    switch (machineType) {
      case MachineType.CNC_MILL_3AXIS:
      case MachineType.CNC_MILL_5AXIS:
        ({ operations, toolsRequired } = await this.generateMillingToolpath(
          geometryResult,
          machineType,
          materialParams,
        ));
        break;
      case MachineType.CNC_LATHE:
        ({ operations, toolsRequired } = await this.generateTurningToolpath(
          geometryResult,
          materialParams,
        ));
        break;
      case MachineType.LASER_CUTTER:
        ({ operations, toolsRequired } = await this.generateLaserToolpath(
          geometryResult,
        ));
        break;
      case MachineType.PRESS_BRAKE:
        ({ operations, toolsRequired } = await this.generateBendingSequence(
          geometryResult,
        ));
        break;
      default:
        throw new BadRequestException(`Unsupported machine type: ${machineType}`);
    }

    // Calculate total cycle time
    const estimatedCycleTime = operations.reduce((sum, op) => sum + op.estimatedTime, 0);

    // Generate G-code
    const gcode = this.generateGCode(operations, machineType);
    const ncProgram = this.formatNCProgram(gcode, {
      programNumber: Math.floor(Math.random() * 9000) + 1000,
      partName: options.partId || 'PART',
      material,
      machineType,
    });

    // Build feeds and speeds lookup
    const feedsAndSpeeds: Record<string, { feed: number; speed: number }> = {};
    for (const op of operations) {
      feedsAndSpeeds[op.type] = {
        feed: op.feedRate,
        speed: op.spindleSpeed,
      };
    }

    return {
      machineType,
      toolpathData: {
        operations,
        setupCount: this.calculateSetupCount(operations, machineType),
        totalToolchanges: new Set(operations.map(op => op.toolId)).size - 1,
        workholding: this.recommendWorkholding(geometryResult, machineType),
      },
      estimatedCycleTime,
      toolsRequired,
      operations,
      feedsAndSpeeds,
      gcode,
      ncProgram,
    };
  }

  // ============================================================
  // MILLING TOOLPATH GENERATION
  // ============================================================

  private async generateMillingToolpath(
    geometry: any,
    machineType: MachineType,
    materialParams: any,
  ): Promise<{ operations: ToolpathOperation[]; toolsRequired: ToolRequirement[] }> {
    const operations: ToolpathOperation[] = [];
    const toolsRequired: ToolRequirement[] = [];
    let sequence = 1;

    // Step 1: Facing operation (if needed)
    if (this.needsFacing(geometry)) {
      const facingTool = this.selectFacingTool(geometry);
      toolsRequired.push(facingTool);

      operations.push(this.createOperation({
        sequence: sequence++,
        type: OperationType.FACING,
        tool: facingTool,
        materialParams,
        geometry,
        depthOfCut: 1.0,
        stepover: facingTool.diameter * 0.7,
      }));
    }

    // Step 2: Roughing operations
    const roughingTool = this.selectRoughingTool(geometry);
    toolsRequired.push(roughingTool);

    operations.push(this.createOperation({
      sequence: sequence++,
      type: OperationType.ROUGHING,
      tool: roughingTool,
      materialParams,
      geometry,
      depthOfCut: roughingTool.diameter * 0.5 * materialParams.depthFactor,
      stepover: roughingTool.diameter * 0.4,
    }));

    // Step 3: Semi-finishing
    const semiFinishTool = this.selectSemiFinishTool(geometry);
    if (!toolsRequired.find(t => t.toolId === semiFinishTool.toolId)) {
      toolsRequired.push(semiFinishTool);
    }

    operations.push(this.createOperation({
      sequence: sequence++,
      type: OperationType.SEMI_FINISHING,
      tool: semiFinishTool,
      materialParams,
      geometry,
      depthOfCut: semiFinishTool.diameter * 0.2,
      stepover: semiFinishTool.diameter * 0.3,
    }));

    // Step 4: Finishing operations
    const finishTool = this.selectFinishingTool(geometry);
    if (!toolsRequired.find(t => t.toolId === finishTool.toolId)) {
      toolsRequired.push(finishTool);
    }

    operations.push(this.createOperation({
      sequence: sequence++,
      type: OperationType.FINISHING,
      tool: finishTool,
      materialParams,
      geometry,
      depthOfCut: finishTool.diameter * 0.1,
      stepover: finishTool.diameter * 0.1,
    }));

    // Step 5: Drilling operations (for holes)
    const holes = geometry.features?.filter((f: any) => f.type === 'HOLE') || [];
    for (const hole of holes) {
      const drillTool = this.selectDrillTool(hole);
      if (!toolsRequired.find(t => t.toolId === drillTool.toolId)) {
        toolsRequired.push(drillTool);
      }

      operations.push(this.createDrillingOperation({
        sequence: sequence++,
        hole,
        tool: drillTool,
        materialParams,
      }));
    }

    // Step 6: Tapping operations (for threaded holes)
    const threads = geometry.features?.filter((f: any) => f.type === 'THREAD') || [];
    for (const thread of threads) {
      const tapTool = this.selectTapTool(thread);
      if (!toolsRequired.find(t => t.toolId === tapTool.toolId)) {
        toolsRequired.push(tapTool);
      }

      operations.push(this.createTappingOperation({
        sequence: sequence++,
        thread,
        tool: tapTool,
      }));
    }

    // Step 7: Chamfering/deburring
    if (this.needsChamfering(geometry)) {
      const chamferTool = this.selectChamferTool();
      toolsRequired.push(chamferTool);

      operations.push(this.createOperation({
        sequence: sequence++,
        type: OperationType.CHAMFERING,
        tool: chamferTool,
        materialParams,
        geometry,
        depthOfCut: 0.5,
        stepover: 0,
      }));
    }

    return { operations, toolsRequired };
  }

  // ============================================================
  // TURNING TOOLPATH GENERATION
  // ============================================================

  private async generateTurningToolpath(
    geometry: any,
    materialParams: any,
  ): Promise<{ operations: ToolpathOperation[]; toolsRequired: ToolRequirement[] }> {
    const operations: ToolpathOperation[] = [];
    const toolsRequired: ToolRequirement[] = [];
    let sequence = 1;

    // Facing
    const facingInsert = this.selectTurningInsert('FACING');
    toolsRequired.push(facingInsert);

    operations.push({
      id: `op_${sequence}`,
      sequence: sequence++,
      type: OperationType.FACING,
      toolId: facingInsert.toolId,
      toolName: facingInsert.toolType,
      feedRate: this.calculateTurningFeed(facingInsert, materialParams),
      spindleSpeed: this.calculateTurningSpeed(geometry.boundingBox.width, materialParams),
      depthOfCut: 1.0,
      stepover: 0,
      coolant: materialParams.coolant,
      estimatedTime: 30,
      gcode: '',
      toolpathLength: geometry.boundingBox.width / 2,
      materialRemovalRate: 10,
    });

    // Rough turning
    const roughInsert = this.selectTurningInsert('ROUGHING');
    if (!toolsRequired.find(t => t.toolId === roughInsert.toolId)) {
      toolsRequired.push(roughInsert);
    }

    operations.push({
      id: `op_${sequence}`,
      sequence: sequence++,
      type: OperationType.ROUGHING,
      toolId: roughInsert.toolId,
      toolName: roughInsert.toolType,
      feedRate: this.calculateTurningFeed(roughInsert, materialParams),
      spindleSpeed: this.calculateTurningSpeed(geometry.boundingBox.width, materialParams),
      depthOfCut: 2.0,
      stepover: 0,
      coolant: materialParams.coolant,
      estimatedTime: 120,
      gcode: '',
      toolpathLength: geometry.boundingBox.height * 10,
      materialRemovalRate: 20,
    });

    // Finish turning
    const finishInsert = this.selectTurningInsert('FINISHING');
    toolsRequired.push(finishInsert);

    operations.push({
      id: `op_${sequence}`,
      sequence: sequence++,
      type: OperationType.FINISHING,
      toolId: finishInsert.toolId,
      toolName: finishInsert.toolType,
      feedRate: this.calculateTurningFeed(finishInsert, materialParams) * 0.5,
      spindleSpeed: this.calculateTurningSpeed(geometry.boundingBox.width, materialParams) * 1.2,
      depthOfCut: 0.25,
      stepover: 0,
      coolant: materialParams.coolant,
      estimatedTime: 90,
      gcode: '',
      toolpathLength: geometry.boundingBox.height * 2,
      materialRemovalRate: 2,
    });

    return { operations, toolsRequired };
  }

  // ============================================================
  // LASER CUTTING TOOLPATH GENERATION
  // ============================================================

  private async generateLaserToolpath(
    geometry: any,
  ): Promise<{ operations: ToolpathOperation[]; toolsRequired: ToolRequirement[] }> {
    const operations: ToolpathOperation[] = [];
    const toolsRequired: ToolRequirement[] = [];

    // Calculate cut path from geometry perimeter
    const perimeter = geometry.surfaceArea ? Math.sqrt(geometry.surfaceArea) * 4 : 400;
    
    // Laser "tool" (just for tracking)
    const laserTool: ToolRequirement = {
      toolId: 'LASER_CO2',
      toolType: 'CO2 Laser',
      diameter: 0.2, // kerf width
      length: 0,
      material: 'N/A',
      usage: ['LASER_CUTTING'],
    };
    toolsRequired.push(laserTool);

    operations.push({
      id: 'op_1',
      sequence: 1,
      type: OperationType.LASER_CUTTING,
      toolId: laserTool.toolId,
      toolName: laserTool.toolType,
      feedRate: 3000, // mm/min typical for thin sheet
      spindleSpeed: 0, // N/A for laser
      depthOfCut: geometry.boundingBox.depth || 3, // material thickness
      stepover: 0,
      coolant: 'AIR', // assist gas
      estimatedTime: (perimeter / 3000) * 60, // seconds
      gcode: '',
      toolpathLength: perimeter,
      materialRemovalRate: 0,
    });

    return { operations, toolsRequired };
  }

  // ============================================================
  // PRESS BRAKE SEQUENCE GENERATION
  // ============================================================

  private async generateBendingSequence(
    geometry: any,
  ): Promise<{ operations: ToolpathOperation[]; toolsRequired: ToolRequirement[] }> {
    const operations: ToolpathOperation[] = [];
    const toolsRequired: ToolRequirement[] = [];

    // Extract bend information from geometry
    const bends = geometry.features?.filter((f: any) => f.type === 'BEND') || [];
    
    // If no bends detected, estimate from sheet metal detection
    const bendCount = bends.length || 4;

    // Standard V-die tooling
    const vDieTool: ToolRequirement = {
      toolId: 'V_DIE_16MM',
      toolType: 'V-Die 16mm Opening',
      diameter: 16,
      length: 1000,
      material: 'TOOL_STEEL',
      usage: ['BENDING'],
    };
    toolsRequired.push(vDieTool);

    const punchTool: ToolRequirement = {
      toolId: 'PUNCH_88DEG',
      toolType: '88° Punch',
      diameter: 0,
      length: 1000,
      material: 'TOOL_STEEL',
      usage: ['BENDING'],
    };
    toolsRequired.push(punchTool);

    // Create operation for each bend
    for (let i = 0; i < bendCount; i++) {
      const bend = bends[i] || { dimensions: { angle: 90, length: 100 } };
      
      operations.push({
        id: `op_${i + 1}`,
        sequence: i + 1,
        type: OperationType.BENDING,
        toolId: vDieTool.toolId,
        toolName: `Bend ${i + 1}: ${bend.dimensions?.angle || 90}°`,
        feedRate: 0,
        spindleSpeed: 0,
        depthOfCut: 0,
        stepover: 0,
        coolant: 'NONE',
        estimatedTime: 15, // seconds per bend
        gcode: '',
        toolpathLength: bend.dimensions?.length || 100,
        materialRemovalRate: 0,
      });
    }

    return { operations, toolsRequired };
  }

  // ============================================================
  // TOOL SELECTION
  // ============================================================

  private selectMachineType(geometry: any): MachineType {
    // Check if it's sheet metal (flat with bends)
    if (geometry.isSheetMetal) {
      if (geometry.boundingBox.depth < 6) {
        return MachineType.LASER_CUTTER;
      }
      return MachineType.PRESS_BRAKE;
    }

    // Check if it's a rotational part (lathe)
    if (this.isRotationalPart(geometry)) {
      return MachineType.CNC_LATHE;
    }

    // Check complexity for 3-axis vs 5-axis
    if (geometry.complexity === 'VERY_HIGH' || this.hasUndercutFeatures(geometry)) {
      return MachineType.CNC_MILL_5AXIS;
    }

    return MachineType.CNC_MILL_3AXIS;
  }

  private isRotationalPart(geometry: any): boolean {
    // Check if part is cylindrical
    const bb = geometry.boundingBox;
    if (!bb) return false;

    const dims = [bb.width, bb.height, bb.depth].sort((a, b) => a - b);
    const aspectRatio = dims[2] / dims[0];

    // If two dimensions are similar and much smaller than third, could be cylindrical
    const similarity = dims[1] / dims[0];
    return similarity < 1.2 && aspectRatio > 2;
  }

  private hasUndercutFeatures(geometry: any): boolean {
    const features = geometry.features || [];
    return features.some((f: any) => 
      f.type === 'POCKET' && f.dimensions?.undercut
    );
  }

  private selectFacingTool(geometry: any): ToolRequirement {
    const width = geometry.boundingBox?.width || 100;
    const diameter = Math.min(width * 0.6, 50); // Face mill up to 50mm

    return {
      toolId: `FACE_${diameter}`,
      toolType: 'Face Mill',
      diameter,
      length: 50,
      flutes: 4,
      material: 'CARBIDE',
      coating: 'TiAlN',
      usage: ['FACING'],
    };
  }

  private selectRoughingTool(geometry: any): ToolRequirement {
    return {
      toolId: 'ROUGHING_20',
      toolType: 'Roughing End Mill',
      diameter: 20,
      length: 75,
      flutes: 4,
      material: 'CARBIDE',
      coating: 'TiAlN',
      usage: ['ROUGHING'],
    };
  }

  private selectSemiFinishTool(geometry: any): ToolRequirement {
    return {
      toolId: 'ENDMILL_12',
      toolType: 'End Mill',
      diameter: 12,
      length: 50,
      flutes: 4,
      material: 'CARBIDE',
      coating: 'TiAlN',
      usage: ['SEMI_FINISHING'],
    };
  }

  private selectFinishingTool(geometry: any): ToolRequirement {
    return {
      toolId: 'ENDMILL_6',
      toolType: 'End Mill',
      diameter: 6,
      length: 30,
      flutes: 4,
      material: 'CARBIDE',
      coating: 'TiAlN',
      usage: ['FINISHING'],
    };
  }

  private selectDrillTool(hole: any): ToolRequirement {
    const diameter = hole.dimensions?.diameter || 10;
    return {
      toolId: `DRILL_${diameter}`,
      toolType: 'Twist Drill',
      diameter,
      length: diameter * 5,
      flutes: 2,
      material: 'HSS',
      coating: 'TiN',
      usage: ['DRILLING'],
    };
  }

  private selectTapTool(thread: any): ToolRequirement {
    const size = thread.dimensions?.size || 'M10';
    return {
      toolId: `TAP_${size}`,
      toolType: `Tap ${size}`,
      diameter: parseFloat(size.replace('M', '')) || 10,
      length: 50,
      material: 'HSS',
      coating: 'TiN',
      usage: ['TAPPING'],
    };
  }

  private selectChamferTool(): ToolRequirement {
    return {
      toolId: 'CHAMFER_90',
      toolType: 'Chamfer Mill 90°',
      diameter: 12,
      length: 30,
      flutes: 4,
      material: 'CARBIDE',
      usage: ['CHAMFERING'],
    };
  }

  private selectTurningInsert(operation: string): ToolRequirement {
    const inserts: Record<string, ToolRequirement> = {
      FACING: {
        toolId: 'CNMG_120408',
        toolType: 'CNMG Insert',
        diameter: 12.7,
        length: 0,
        material: 'CARBIDE',
        coating: 'CVD',
        usage: ['FACING'],
      },
      ROUGHING: {
        toolId: 'WNMG_080408',
        toolType: 'WNMG Insert',
        diameter: 8,
        length: 0,
        material: 'CARBIDE',
        coating: 'CVD',
        usage: ['ROUGHING'],
      },
      FINISHING: {
        toolId: 'VNMG_160404',
        toolType: 'VNMG Insert',
        diameter: 16,
        length: 0,
        material: 'CARBIDE',
        coating: 'PVD',
        usage: ['FINISHING'],
      },
    };
    return inserts[operation] || inserts.ROUGHING;
  }

  // ============================================================
  // CALCULATION HELPERS
  // ============================================================

  private createOperation(params: {
    sequence: number;
    type: OperationType;
    tool: ToolRequirement;
    materialParams: any;
    geometry: any;
    depthOfCut: number;
    stepover: number;
  }): ToolpathOperation {
    const { sequence, type, tool, materialParams, geometry, depthOfCut, stepover } = params;

    const spindleSpeed = this.calculateSpindleSpeed(tool.diameter, materialParams.surfaceSpeed);
    const feedRate = this.calculateFeedRate(spindleSpeed, tool.flutes || 4, materialParams.feedPerTooth);

    // Estimate toolpath length based on geometry
    const toolpathLength = this.estimateToolpathLength(geometry, type);
    const estimatedTime = (toolpathLength / feedRate) * 60; // Convert to seconds

    return {
      id: `op_${sequence}`,
      sequence,
      type,
      toolId: tool.toolId,
      toolName: tool.toolType,
      feedRate,
      spindleSpeed,
      depthOfCut,
      stepover,
      coolant: materialParams.coolant,
      estimatedTime,
      gcode: '',
      toolpathLength,
      materialRemovalRate: this.calculateMRR(feedRate, depthOfCut, stepover),
    };
  }

  private createDrillingOperation(params: {
    sequence: number;
    hole: any;
    tool: ToolRequirement;
    materialParams: any;
  }): ToolpathOperation {
    const { sequence, hole, tool, materialParams } = params;

    const spindleSpeed = this.calculateSpindleSpeed(tool.diameter, materialParams.surfaceSpeed * 0.6);
    const feedRate = spindleSpeed * 0.02; // Feed per rev for drilling

    return {
      id: `op_${sequence}`,
      sequence,
      type: OperationType.DRILLING,
      toolId: tool.toolId,
      toolName: tool.toolType,
      feedRate,
      spindleSpeed,
      depthOfCut: hole.dimensions?.depth || 20,
      stepover: 0,
      coolant: materialParams.coolant,
      estimatedTime: 10,
      gcode: '',
      toolpathLength: hole.dimensions?.depth || 20,
      materialRemovalRate: 0,
    };
  }

  private createTappingOperation(params: {
    sequence: number;
    thread: any;
    tool: ToolRequirement;
  }): ToolpathOperation {
    const { sequence, thread, tool } = params;
    const pitch = thread.dimensions?.pitch || 1.5;

    return {
      id: `op_${sequence}`,
      sequence,
      type: OperationType.TAPPING,
      toolId: tool.toolId,
      toolName: tool.toolType,
      feedRate: 500 * pitch, // Sync with spindle
      spindleSpeed: 500,
      depthOfCut: thread.dimensions?.depth || 15,
      stepover: 0,
      coolant: 'MIST',
      estimatedTime: 8,
      gcode: '',
      toolpathLength: thread.dimensions?.depth || 15,
      materialRemovalRate: 0,
    };
  }

  private calculateSpindleSpeed(diameter: number, surfaceSpeed: number): number {
    // N = (Vc * 1000) / (π * D)
    return Math.round((surfaceSpeed * 1000) / (Math.PI * diameter));
  }

  private calculateFeedRate(rpm: number, flutes: number, feedPerTooth: number): number {
    // F = N * z * fz
    return Math.round(rpm * flutes * feedPerTooth);
  }

  private calculateTurningSpeed(diameter: number, materialParams: any): number {
    return Math.round((materialParams.surfaceSpeed * 1000) / (Math.PI * diameter));
  }

  private calculateTurningFeed(tool: ToolRequirement, materialParams: any): number {
    return materialParams.feedPerTooth * 10; // mm/rev converted to mm/min
  }

  private calculateMRR(feedRate: number, depthOfCut: number, stepover: number): number {
    // Material Removal Rate in cm³/min
    return (feedRate * depthOfCut * stepover) / 1000;
  }

  private estimateToolpathLength(geometry: any, operationType: OperationType): number {
    const bb = geometry.boundingBox;
    if (!bb) return 1000;

    const area = bb.width * bb.height;
    
    switch (operationType) {
      case OperationType.FACING:
        return area / 30; // Approximate
      case OperationType.ROUGHING:
        return area * bb.depth / 50;
      case OperationType.SEMI_FINISHING:
        return area / 10;
      case OperationType.FINISHING:
        return area / 5;
      default:
        return 100;
    }
  }

  private needsFacing(geometry: any): boolean {
    return true; // Most prismatic parts need facing
  }

  private needsChamfering(geometry: any): boolean {
    return true; // Most parts benefit from edge chamfering
  }

  private calculateSetupCount(operations: ToolpathOperation[], machineType: MachineType): number {
    // Simplified: assume single setup for 3-axis, potentially multiple for complex parts
    if (machineType === MachineType.CNC_MILL_5AXIS) return 1;
    if (machineType === MachineType.CNC_LATHE) return 1;
    return 1; // Could be 2 if part needs flipping
  }

  private recommendWorkholding(geometry: any, machineType: MachineType): string {
    const bb = geometry.boundingBox;
    
    switch (machineType) {
      case MachineType.CNC_MILL_3AXIS:
      case MachineType.CNC_MILL_5AXIS:
        if (bb && bb.width > 100) return 'FIXTURE_PLATE';
        return 'VISE';
      case MachineType.CNC_LATHE:
        return 'THREE_JAW_CHUCK';
      case MachineType.LASER_CUTTER:
        return 'SLAT_BED';
      case MachineType.PRESS_BRAKE:
        return 'BACKGAUGE';
      default:
        return 'CUSTOM_FIXTURE';
    }
  }

  // ============================================================
  // G-CODE GENERATION
  // ============================================================

  private generateGCode(operations: ToolpathOperation[], machineType: MachineType): string {
    const lines: string[] = [];

    // Header
    lines.push('%');
    lines.push('O0001 (GENERATED PROGRAM)');
    lines.push('G90 G80 G40 (ABSOLUTE, CANCEL CANNED CYCLES, CANCEL CUTTER COMP)');
    lines.push('G17 (XY PLANE)');
    lines.push('G21 (METRIC)');
    lines.push('');

    // Operations
    for (const op of operations) {
      lines.push(`(${op.type} - ${op.toolName})`);
      lines.push(`T${op.sequence} M6 (TOOL CHANGE)`);
      lines.push(`S${op.spindleSpeed} M3 (SPINDLE ON CW)`);
      lines.push(`G43 H${op.sequence} (TOOL LENGTH COMP)`);
      
      if (op.coolant === 'FLOOD') {
        lines.push('M8 (COOLANT ON)');
      } else if (op.coolant === 'MIST') {
        lines.push('M7 (MIST ON)');
      }

      lines.push(`F${op.feedRate}`);
      lines.push('(TOOLPATH WOULD GO HERE)');
      lines.push('G0 Z50 (RETRACT)');
      lines.push('M9 (COOLANT OFF)');
      lines.push('');
    }

    // Footer
    lines.push('M5 (SPINDLE OFF)');
    lines.push('G28 G91 Z0 (RETURN TO HOME)');
    lines.push('G28 X0 Y0');
    lines.push('M30 (PROGRAM END)');
    lines.push('%');

    return lines.join('\n');
  }

  private formatNCProgram(
    gcode: string,
    info: { programNumber: number; partName: string; material: string; machineType: string },
  ): string {
    const header = [
      `(PROGRAM: O${info.programNumber})`,
      `(PART: ${info.partName})`,
      `(MATERIAL: ${info.material})`,
      `(MACHINE: ${info.machineType})`,
      `(DATE: ${new Date().toISOString().split('T')[0]})`,
      '(GENERATED BY FERALIS QUOTE ANALYSIS)',
      '',
    ].join('\n');

    return header + gcode;
  }
}
