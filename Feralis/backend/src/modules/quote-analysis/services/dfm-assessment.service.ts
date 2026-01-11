/**
 * DFM Assessment Service
 * 
 * Analyzes part geometry for Design for Manufacturability (DFM) issues
 * and provides recommendations for improving manufacturability.
 * 
 * @module DfmAssessmentService
 */

import { Injectable, Logger } from '@nestjs/common';

export enum DfmIssueSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

export enum DfmIssueCategory {
  GEOMETRY = 'GEOMETRY',
  TOLERANCES = 'TOLERANCES',
  SURFACE_FINISH = 'SURFACE_FINISH',
  MATERIAL = 'MATERIAL',
  TOOLING = 'TOOLING',
  COST = 'COST',
  LEAD_TIME = 'LEAD_TIME',
}

export interface DfmIssue {
  id: string;
  category: DfmIssueCategory;
  severity: DfmIssueSeverity;
  featureId?: string;
  title: string;
  description: string;
  location?: { x: number; y: number; z: number };
  currentValue?: string | number;
  recommendedValue?: string | number;
  estimatedCostImpact?: number; // Percentage
  estimatedTimeImpact?: number; // Percentage
}

export interface DfmRecommendation {
  id: string;
  priority: number; // 1 = highest
  title: string;
  description: string;
  relatedIssues: string[];
  estimatedSavings?: number; // Percentage
  implementationEffort: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DfmAssessmentResult {
  overallScore: number; // 0-100
  issues: DfmIssue[];
  recommendations: DfmRecommendation[];
  summary: {
    totalIssues: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    estimatedCostIncrease: number;
    estimatedLeadTimeIncrease: number;
  };
  processability: {
    canMachine3Axis: boolean;
    canMachine5Axis: boolean;
    canTurn: boolean;
    canLaserCut: boolean;
    canBend: boolean;
    recommendedProcess: string;
  };
}

@Injectable()
export class DfmAssessmentService {
  private readonly logger = new Logger(DfmAssessmentService.name);

  // DFM rule thresholds
  private readonly rules = {
    minWallThickness: 1.0, // mm
    minHoleDiameter: 1.0, // mm
    maxAspectRatioHole: 10, // depth/diameter
    minCornerRadius: 0.5, // mm for internal corners
    minPocketRadius: 2.0, // mm for pocket corners
    maxUndercut: false, // No undercuts for 3-axis
    minThreadPitch: 0.5, // mm
    maxThreadDepth: 2.5, // x diameter
    minBendRadius: 1.0, // x material thickness
    minFlangeHeight: 4.0, // x material thickness
  };

  /**
   * Perform DFM assessment on geometry analysis results
   */
  async assessManufacturability(
    geometryResult: any,
  ): Promise<DfmAssessmentResult> {
    this.logger.log('Performing DFM assessment...');

    const issues: DfmIssue[] = [];
    const recommendations: DfmRecommendation[] = [];

    // Run all DFM checks
    issues.push(...this.checkWallThickness(geometryResult));
    issues.push(...this.checkHoleFeatures(geometryResult));
    issues.push(...this.checkInternalCorners(geometryResult));
    issues.push(...this.checkPockets(geometryResult));
    issues.push(...this.checkUndercuts(geometryResult));
    issues.push(...this.checkThreads(geometryResult));
    issues.push(...this.checkSheetMetalFeatures(geometryResult));
    issues.push(...this.checkTolerances(geometryResult));
    issues.push(...this.checkSurfaceFinish(geometryResult));

    // Generate recommendations based on issues
    recommendations.push(...this.generateRecommendations(issues, geometryResult));

    // Calculate overall score
    const overallScore = this.calculateOverallScore(issues);

    // Determine processability
    const processability = this.assessProcessability(geometryResult, issues);

    // Build summary
    const criticalCount = issues.filter(i => i.severity === DfmIssueSeverity.CRITICAL).length;
    const warningCount = issues.filter(i => i.severity === DfmIssueSeverity.WARNING).length;
    const infoCount = issues.filter(i => i.severity === DfmIssueSeverity.INFO).length;

    const estimatedCostIncrease = issues.reduce(
      (sum, i) => sum + (i.estimatedCostImpact || 0),
      0,
    );
    const estimatedLeadTimeIncrease = issues.reduce(
      (sum, i) => sum + (i.estimatedTimeImpact || 0),
      0,
    );

    return {
      overallScore,
      issues,
      recommendations,
      summary: {
        totalIssues: issues.length,
        criticalCount,
        warningCount,
        infoCount,
        estimatedCostIncrease,
        estimatedLeadTimeIncrease,
      },
      processability,
    };
  }

  // ============================================================
  // DFM CHECKS
  // ============================================================

  private checkWallThickness(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const wallThickness = geometry.wallThickness;

    if (wallThickness && wallThickness < this.rules.minWallThickness) {
      issues.push({
        id: 'DFM_WALL_001',
        category: DfmIssueCategory.GEOMETRY,
        severity: DfmIssueSeverity.CRITICAL,
        title: 'Wall thickness too thin',
        description: `Minimum wall thickness of ${wallThickness}mm is below the recommended ${this.rules.minWallThickness}mm. This may cause deflection during machining or part failure.`,
        currentValue: wallThickness,
        recommendedValue: this.rules.minWallThickness,
        estimatedCostImpact: 30,
        estimatedTimeImpact: 20,
      });
    }

    return issues;
  }

  private checkHoleFeatures(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const holes = geometry.features?.filter((f: any) => f.type === 'HOLE') || [];

    for (const hole of holes) {
      const diameter = hole.dimensions?.diameter || 0;
      const depth = hole.dimensions?.depth || 0;
      const aspectRatio = depth / diameter;

      // Check minimum diameter
      if (diameter < this.rules.minHoleDiameter) {
        issues.push({
          id: `DFM_HOLE_${hole.id}_001`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.WARNING,
          featureId: hole.id,
          title: 'Hole diameter too small',
          description: `Hole diameter of ${diameter}mm is below the minimum ${this.rules.minHoleDiameter}mm. Small holes require specialized tooling.`,
          location: hole.position,
          currentValue: diameter,
          recommendedValue: this.rules.minHoleDiameter,
          estimatedCostImpact: 15,
        });
      }

      // Check aspect ratio (depth to diameter)
      if (aspectRatio > this.rules.maxAspectRatioHole) {
        issues.push({
          id: `DFM_HOLE_${hole.id}_002`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.WARNING,
          featureId: hole.id,
          title: 'Deep hole - high aspect ratio',
          description: `Hole aspect ratio of ${aspectRatio.toFixed(1)}:1 exceeds recommended ${this.rules.maxAspectRatioHole}:1. Deep holes require peck drilling and may have straightness issues.`,
          location: hole.position,
          currentValue: aspectRatio,
          recommendedValue: this.rules.maxAspectRatioHole,
          estimatedCostImpact: 20,
          estimatedTimeImpact: 25,
        });
      }

      // Check for blind holes without flat bottom
      if (hole.dimensions?.bottomType === 'POINTED') {
        issues.push({
          id: `DFM_HOLE_${hole.id}_003`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.INFO,
          featureId: hole.id,
          title: 'Blind hole with drill point',
          description: 'Blind hole will have drill point at bottom. If flat bottom is required, specify end mill or add reaming operation.',
          location: hole.position,
        });
      }
    }

    return issues;
  }

  private checkInternalCorners(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const pockets = geometry.features?.filter((f: any) => 
      f.type === 'POCKET' || f.type === 'SLOT'
    ) || [];

    for (const pocket of pockets) {
      const cornerRadius = pocket.dimensions?.cornerRadius || 0;

      if (cornerRadius < this.rules.minPocketRadius) {
        issues.push({
          id: `DFM_CORNER_${pocket.id}_001`,
          category: DfmIssueCategory.GEOMETRY,
          severity: cornerRadius < this.rules.minCornerRadius 
            ? DfmIssueSeverity.CRITICAL 
            : DfmIssueSeverity.WARNING,
          featureId: pocket.id,
          title: 'Internal corner radius too small',
          description: `Internal corner radius of ${cornerRadius}mm requires a ${cornerRadius * 2}mm or smaller end mill. Recommended minimum is ${this.rules.minPocketRadius}mm for standard tooling.`,
          location: pocket.position,
          currentValue: cornerRadius,
          recommendedValue: this.rules.minPocketRadius,
          estimatedCostImpact: 10,
          estimatedTimeImpact: 15,
        });
      }

      // Check for sharp internal corners (radius = 0)
      if (cornerRadius === 0) {
        issues.push({
          id: `DFM_CORNER_${pocket.id}_002`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.CRITICAL,
          featureId: pocket.id,
          title: 'Sharp internal corner not achievable',
          description: 'Sharp 90° internal corners cannot be machined with rotary tools. Add fillet radius or use EDM (significantly higher cost).',
          location: pocket.position,
          currentValue: 0,
          recommendedValue: this.rules.minPocketRadius,
          estimatedCostImpact: 50,
          estimatedTimeImpact: 100,
        });
      }
    }

    return issues;
  }

  private checkPockets(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const pockets = geometry.features?.filter((f: any) => f.type === 'POCKET') || [];

    for (const pocket of pockets) {
      const depth = pocket.dimensions?.depth || 0;
      const width = pocket.dimensions?.width || 0;
      const length = pocket.dimensions?.length || 0;
      const minDimension = Math.min(width, length);

      // Check depth to width ratio
      if (depth > 0 && minDimension > 0) {
        const depthRatio = depth / minDimension;
        if (depthRatio > 4) {
          issues.push({
            id: `DFM_POCKET_${pocket.id}_001`,
            category: DfmIssueCategory.GEOMETRY,
            severity: DfmIssueSeverity.WARNING,
            featureId: pocket.id,
            title: 'Deep pocket - may require long tools',
            description: `Pocket depth-to-width ratio of ${depthRatio.toFixed(1)}:1 may require extended length tools and slower feeds.`,
            location: pocket.position,
            currentValue: depthRatio,
            recommendedValue: 4,
            estimatedCostImpact: 15,
            estimatedTimeImpact: 20,
          });
        }
      }
    }

    return issues;
  }

  private checkUndercuts(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const features = geometry.features || [];

    const undercuts = features.filter((f: any) => 
      f.dimensions?.undercut || f.type === 'UNDERCUT'
    );

    for (const undercut of undercuts) {
      issues.push({
        id: `DFM_UNDERCUT_${undercut.id}_001`,
        category: DfmIssueCategory.GEOMETRY,
        severity: DfmIssueSeverity.CRITICAL,
        featureId: undercut.id,
        title: 'Undercut feature detected',
        description: 'Undercut features cannot be machined with 3-axis milling. Requires 5-axis machining, EDM, or design modification.',
        location: undercut.position,
        estimatedCostImpact: 100,
        estimatedTimeImpact: 50,
      });
    }

    return issues;
  }

  private checkThreads(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const threads = geometry.features?.filter((f: any) => f.type === 'THREAD') || [];

    for (const thread of threads) {
      const diameter = thread.dimensions?.diameter || 10;
      const pitch = thread.dimensions?.pitch || 1.5;
      const depth = thread.dimensions?.depth || 10;

      // Check thread depth
      const depthRatio = depth / diameter;
      if (depthRatio > this.rules.maxThreadDepth) {
        issues.push({
          id: `DFM_THREAD_${thread.id}_001`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.WARNING,
          featureId: thread.id,
          title: 'Thread engagement too deep',
          description: `Thread depth of ${depthRatio.toFixed(1)}x diameter exceeds recommended ${this.rules.maxThreadDepth}x. May cause tap breakage or chip evacuation issues.`,
          location: thread.position,
          currentValue: depthRatio,
          recommendedValue: this.rules.maxThreadDepth,
          estimatedCostImpact: 10,
          estimatedTimeImpact: 15,
        });
      }

      // Check fine pitch
      if (pitch < this.rules.minThreadPitch) {
        issues.push({
          id: `DFM_THREAD_${thread.id}_002`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.WARNING,
          featureId: thread.id,
          title: 'Fine thread pitch',
          description: `Thread pitch of ${pitch}mm requires careful tapping. Consider coarser pitch if strength requirements allow.`,
          location: thread.position,
          currentValue: pitch,
          recommendedValue: this.rules.minThreadPitch,
        });
      }
    }

    return issues;
  }

  private checkSheetMetalFeatures(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];

    if (!geometry.isSheetMetal) return issues;

    const thickness = geometry.wallThickness || 2;
    const bends = geometry.features?.filter((f: any) => f.type === 'BEND') || [];

    for (const bend of bends) {
      const radius = bend.dimensions?.radius || 0;
      const angle = bend.dimensions?.angle || 90;

      // Check bend radius
      if (radius < thickness * this.rules.minBendRadius) {
        issues.push({
          id: `DFM_BEND_${bend.id}_001`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.WARNING,
          featureId: bend.id,
          title: 'Bend radius too small',
          description: `Bend radius of ${radius}mm is less than ${this.rules.minBendRadius}x material thickness. May cause cracking.`,
          location: bend.position,
          currentValue: radius,
          recommendedValue: thickness * this.rules.minBendRadius,
          estimatedCostImpact: 5,
        });
      }

      // Check for acute bends
      if (angle < 30) {
        issues.push({
          id: `DFM_BEND_${bend.id}_002`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.CRITICAL,
          featureId: bend.id,
          title: 'Acute bend angle',
          description: `Bend angle of ${angle}° is very acute. May require special tooling or multiple forming operations.`,
          location: bend.position,
          currentValue: angle,
          recommendedValue: 30,
          estimatedCostImpact: 25,
          estimatedTimeImpact: 30,
        });
      }
    }

    // Check flange height
    const flanges = geometry.features?.filter((f: any) => f.type === 'FLANGE') || [];
    for (const flange of flanges) {
      const height = flange.dimensions?.height || 0;
      if (height < thickness * this.rules.minFlangeHeight) {
        issues.push({
          id: `DFM_FLANGE_${flange.id}_001`,
          category: DfmIssueCategory.GEOMETRY,
          severity: DfmIssueSeverity.WARNING,
          featureId: flange.id,
          title: 'Flange height too short',
          description: `Flange height of ${height}mm is less than ${this.rules.minFlangeHeight}x material thickness. May not form properly.`,
          location: flange.position,
          currentValue: height,
          recommendedValue: thickness * this.rules.minFlangeHeight,
        });
      }
    }

    return issues;
  }

  private checkTolerances(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const features = geometry.features || [];

    for (const feature of features) {
      const tolerance = feature.tolerance;
      if (!tolerance) continue;

      // Parse tolerance (e.g., "±0.01" or "0.05")
      const tolValue = parseFloat(tolerance.replace(/[±]/g, ''));

      if (tolValue < 0.01) {
        issues.push({
          id: `DFM_TOL_${feature.id}_001`,
          category: DfmIssueCategory.TOLERANCES,
          severity: DfmIssueSeverity.WARNING,
          featureId: feature.id,
          title: 'Very tight tolerance',
          description: `Tolerance of ${tolerance} requires grinding or precision machining. Consider if this tight tolerance is necessary.`,
          location: feature.position,
          currentValue: tolerance,
          recommendedValue: '±0.025',
          estimatedCostImpact: 30,
          estimatedTimeImpact: 25,
        });
      } else if (tolValue < 0.025) {
        issues.push({
          id: `DFM_TOL_${feature.id}_002`,
          category: DfmIssueCategory.TOLERANCES,
          severity: DfmIssueSeverity.INFO,
          featureId: feature.id,
          title: 'Tight tolerance',
          description: `Tolerance of ${tolerance} is achievable but will add machining time.`,
          location: feature.position,
          currentValue: tolerance,
          estimatedCostImpact: 10,
          estimatedTimeImpact: 15,
        });
      }
    }

    return issues;
  }

  private checkSurfaceFinish(geometry: any): DfmIssue[] {
    const issues: DfmIssue[] = [];
    const features = geometry.features || [];

    for (const feature of features) {
      const surfaceFinish = feature.surfaceFinish;
      if (!surfaceFinish) continue;

      // Parse Ra value (e.g., "Ra 0.8" or "32 µin")
      const raMatch = surfaceFinish.match(/(\d+\.?\d*)/);
      if (!raMatch) continue;

      const ra = parseFloat(raMatch[1]);

      // Check if finish is better than standard machined (Ra 3.2 / 125 µin)
      if (ra < 0.8) {
        issues.push({
          id: `DFM_FINISH_${feature.id}_001`,
          category: DfmIssueCategory.SURFACE_FINISH,
          severity: DfmIssueSeverity.WARNING,
          featureId: feature.id,
          title: 'Fine surface finish required',
          description: `Surface finish of Ra ${ra} requires additional finishing operations (grinding, polishing, or very light cuts).`,
          location: feature.position,
          currentValue: `Ra ${ra}`,
          recommendedValue: 'Ra 1.6',
          estimatedCostImpact: 25,
          estimatedTimeImpact: 30,
        });
      }
    }

    return issues;
  }

  // ============================================================
  // RECOMMENDATIONS
  // ============================================================

  private generateRecommendations(
    issues: DfmIssue[],
    geometry: any,
  ): DfmRecommendation[] {
    const recommendations: DfmRecommendation[] = [];

    // Group issues by category
    const issuesByCategory = issues.reduce((acc, issue) => {
      if (!acc[issue.category]) acc[issue.category] = [];
      acc[issue.category].push(issue);
      return acc;
    }, {} as Record<string, DfmIssue[]>);

    // Generate category-specific recommendations
    if (issuesByCategory[DfmIssueCategory.GEOMETRY]?.length > 0) {
      const geometryIssues = issuesByCategory[DfmIssueCategory.GEOMETRY];
      
      if (geometryIssues.some(i => i.title.includes('corner'))) {
        recommendations.push({
          id: 'REC_CORNER_001',
          priority: 1,
          title: 'Add fillet radii to internal corners',
          description: 'Adding minimum 3mm fillet radii to internal corners allows use of standard end mills and reduces tool wear.',
          relatedIssues: geometryIssues.filter(i => i.title.includes('corner')).map(i => i.id),
          estimatedSavings: 15,
          implementationEffort: 'LOW',
        });
      }

      if (geometryIssues.some(i => i.title.includes('undercut'))) {
        recommendations.push({
          id: 'REC_UNDERCUT_001',
          priority: 1,
          title: 'Redesign to eliminate undercuts',
          description: 'Consider splitting the part, adding access features, or redesigning to avoid undercut geometry.',
          relatedIssues: geometryIssues.filter(i => i.title.includes('undercut')).map(i => i.id),
          estimatedSavings: 50,
          implementationEffort: 'MEDIUM',
        });
      }
    }

    if (issuesByCategory[DfmIssueCategory.TOLERANCES]?.length > 0) {
      recommendations.push({
        id: 'REC_TOL_001',
        priority: 2,
        title: 'Review tolerance requirements',
        description: 'Consider which dimensions truly require tight tolerances. Apply only where functionally necessary.',
        relatedIssues: issuesByCategory[DfmIssueCategory.TOLERANCES].map(i => i.id),
        estimatedSavings: 20,
        implementationEffort: 'LOW',
      });
    }

    if (issuesByCategory[DfmIssueCategory.SURFACE_FINISH]?.length > 0) {
      recommendations.push({
        id: 'REC_FINISH_001',
        priority: 2,
        title: 'Review surface finish callouts',
        description: 'Fine surface finishes significantly increase cost. Specify fine finishes only on functional surfaces.',
        relatedIssues: issuesByCategory[DfmIssueCategory.SURFACE_FINISH].map(i => i.id),
        estimatedSavings: 15,
        implementationEffort: 'LOW',
      });
    }

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    return recommendations;
  }

  // ============================================================
  // SCORING & PROCESSABILITY
  // ============================================================

  private calculateOverallScore(issues: DfmIssue[]): number {
    let score = 100;

    for (const issue of issues) {
      switch (issue.severity) {
        case DfmIssueSeverity.CRITICAL:
          score -= 15;
          break;
        case DfmIssueSeverity.WARNING:
          score -= 5;
          break;
        case DfmIssueSeverity.INFO:
          score -= 1;
          break;
      }
    }

    return Math.max(0, score);
  }

  private assessProcessability(
    geometry: any,
    issues: DfmIssue[],
  ): {
    canMachine3Axis: boolean;
    canMachine5Axis: boolean;
    canTurn: boolean;
    canLaserCut: boolean;
    canBend: boolean;
    recommendedProcess: string;
  } {
    const hasUndercuts = issues.some(i => i.title.includes('undercut'));
    const isSheetMetal = geometry.isSheetMetal;
    const isRotational = this.isRotationalPart(geometry);

    return {
      canMachine3Axis: !hasUndercuts,
      canMachine5Axis: true,
      canTurn: isRotational,
      canLaserCut: isSheetMetal && (geometry.boundingBox?.depth || 0) < 25,
      canBend: isSheetMetal,
      recommendedProcess: this.recommendProcess(geometry, issues),
    };
  }

  private isRotationalPart(geometry: any): boolean {
    const bb = geometry.boundingBox;
    if (!bb) return false;

    const dims = [bb.width, bb.height, bb.depth].sort((a, b) => a - b);
    const similarity = dims[1] / dims[0];
    return similarity < 1.3 && dims[2] / dims[0] > 1.5;
  }

  private recommendProcess(geometry: any, issues: DfmIssue[]): string {
    if (geometry.isSheetMetal) {
      if (geometry.boundingBox?.depth < 6) {
        return 'LASER_CUT_AND_BEND';
      }
      return 'PRESS_BRAKE';
    }

    if (this.isRotationalPart(geometry)) {
      return 'CNC_TURNING';
    }

    const hasUndercuts = issues.some(i => i.title.includes('undercut'));
    if (hasUndercuts) {
      return 'CNC_5AXIS_MILLING';
    }

    return 'CNC_3AXIS_MILLING';
  }
}
