/**
 * Nesting Optimization Service
 * 
 * Optimizes part placement on sheet metal for maximum material utilization.
 * Supports rectangular and irregular part nesting with various algorithms.
 * 
 * @module NestingService
 */

import { Injectable, Logger } from '@nestjs/common';

export interface NestingPart {
  id: string;
  width: number;
  height: number;
  quantity: number;
  rotation: boolean; // Can part be rotated 90°?
  outline?: { x: number; y: number }[]; // For irregular shapes
}

export interface NestingResult {
  materialId?: string;
  sheetWidth: number;
  sheetLength: number;
  partsPerSheet: number;
  sheetsRequired: number;
  utilization: number; // Percentage
  wasteArea: number;
  layout: NestingLayout[];
  layoutSvg: string;
  layoutJson: any;
}

export interface NestingLayout {
  partId: string;
  sheetIndex: number;
  x: number;
  y: number;
  rotation: number; // 0 or 90 degrees
  width: number;
  height: number;
}

export interface SheetSize {
  width: number;
  length: number;
  thickness?: number;
}

@Injectable()
export class NestingService {
  private readonly logger = new Logger(NestingService.name);

  // Common sheet sizes (mm)
  private readonly standardSheets: SheetSize[] = [
    { width: 1000, length: 2000 },   // 1m x 2m
    { width: 1219, length: 2438 },   // 4' x 8'
    { width: 1500, length: 3000 },   // 1.5m x 3m
    { width: 1524, length: 3048 },   // 5' x 10'
    { width: 2000, length: 4000 },   // 2m x 4m
  ];

  // Kerf width for laser cutting (material removed by cut)
  private readonly kerfWidth = 0.3; // mm

  // Part spacing (gap between nested parts)
  private readonly partSpacing = 3; // mm

  /**
   * Optimize nesting for parts on sheet material
   */
  async optimizeNesting(
    geometry: any,
    options: {
      sheetSize?: SheetSize;
      quantity?: number;
      allowRotation?: boolean;
      algorithm?: 'GUILLOTINE' | 'MAXRECT' | 'GENETIC';
    },
  ): Promise<NestingResult> {
    this.logger.log('Optimizing nesting layout...');

    const quantity = options.quantity || 1;
    const allowRotation = options.allowRotation ?? true;
    const algorithm = options.algorithm || 'MAXRECT';

    // Get part dimensions from geometry
    const partWidth = geometry.boundingBox?.width || 100;
    const partHeight = geometry.boundingBox?.height || 50;

    // Add kerf and spacing
    const effectiveWidth = partWidth + this.kerfWidth + this.partSpacing;
    const effectiveHeight = partHeight + this.kerfWidth + this.partSpacing;

    // Select best sheet size if not specified
    const sheetSize = options.sheetSize || this.selectOptimalSheet(
      effectiveWidth,
      effectiveHeight,
      quantity,
    );

    // Create parts array
    const parts: NestingPart[] = [{
      id: 'part_1',
      width: effectiveWidth,
      height: effectiveHeight,
      quantity,
      rotation: allowRotation,
    }];

    // Run nesting algorithm
    let result: NestingResult;
    switch (algorithm) {
      case 'GUILLOTINE':
        result = this.guillotineNesting(parts, sheetSize);
        break;
      case 'GENETIC':
        result = await this.geneticNesting(parts, sheetSize);
        break;
      case 'MAXRECT':
      default:
        result = this.maxRectNesting(parts, sheetSize);
    }

    // Generate SVG visualization
    result.layoutSvg = this.generateLayoutSvg(result.layout, sheetSize);
    result.layoutJson = this.generateLayoutJson(result.layout, sheetSize);

    return result;
  }

  /**
   * MaxRect bin packing algorithm
   * Good balance of speed and efficiency
   */
  private maxRectNesting(parts: NestingPart[], sheetSize: SheetSize): NestingResult {
    const layouts: NestingLayout[] = [];
    let sheetIndex = 0;
    let totalParts = 0;

    // Initialize free rectangles for first sheet
    let freeRects: { x: number; y: number; width: number; height: number }[] = [
      { x: 0, y: 0, width: sheetSize.width, height: sheetSize.length },
    ];

    for (const part of parts) {
      for (let i = 0; i < part.quantity; i++) {
        // Find best position using Best Short Side Fit
        const placement = this.findBestPosition(
          freeRects,
          part.width,
          part.height,
          part.rotation,
        );

        if (placement) {
          layouts.push({
            partId: `${part.id}_${i}`,
            sheetIndex,
            x: placement.x,
            y: placement.y,
            rotation: placement.rotated ? 90 : 0,
            width: placement.rotated ? part.height : part.width,
            height: placement.rotated ? part.width : part.height,
          });

          // Split free rectangles
          freeRects = this.splitFreeRects(freeRects, placement);
          totalParts++;
        } else {
          // Start new sheet
          sheetIndex++;
          freeRects = [
            { x: 0, y: 0, width: sheetSize.width, height: sheetSize.length },
          ];

          // Try placement on new sheet
          const newPlacement = this.findBestPosition(
            freeRects,
            part.width,
            part.height,
            part.rotation,
          );

          if (newPlacement) {
            layouts.push({
              partId: `${part.id}_${i}`,
              sheetIndex,
              x: newPlacement.x,
              y: newPlacement.y,
              rotation: newPlacement.rotated ? 90 : 0,
              width: newPlacement.rotated ? part.height : part.width,
              height: newPlacement.rotated ? part.width : part.height,
            });

            freeRects = this.splitFreeRects(freeRects, newPlacement);
            totalParts++;
          }
        }
      }
    }

    const sheetsRequired = sheetIndex + 1;
    const partsPerSheet = Math.ceil(totalParts / sheetsRequired);
    const totalSheetArea = sheetsRequired * sheetSize.width * sheetSize.length;
    const totalPartArea = layouts.reduce((sum, l) => sum + l.width * l.height, 0);
    const utilization = (totalPartArea / totalSheetArea) * 100;

    return {
      sheetWidth: sheetSize.width,
      sheetLength: sheetSize.length,
      partsPerSheet,
      sheetsRequired,
      utilization,
      wasteArea: totalSheetArea - totalPartArea,
      layout: layouts,
      layoutSvg: '',
      layoutJson: null,
    };
  }

  /**
   * Guillotine cutting algorithm
   * Produces cuts that can be made with straight guillotine-style cuts
   */
  private guillotineNesting(parts: NestingPart[], sheetSize: SheetSize): NestingResult {
    const layouts: NestingLayout[] = [];
    let sheetIndex = 0;

    // Sort parts by height (largest first)
    const sortedParts: { part: NestingPart; index: number }[] = [];
    for (const part of parts) {
      for (let i = 0; i < part.quantity; i++) {
        sortedParts.push({ part, index: i });
      }
    }
    sortedParts.sort((a, b) => 
      Math.max(b.part.width, b.part.height) - Math.max(a.part.width, a.part.height)
    );

    // Use shelf-based approach
    let currentX = 0;
    let currentY = 0;
    let shelfHeight = 0;

    for (const { part, index } of sortedParts) {
      let width = part.width;
      let height = part.height;
      let rotated = false;

      // Try rotation if it fits better
      if (part.rotation && height > width) {
        [width, height] = [height, width];
        rotated = true;
      }

      // Check if part fits in current row
      if (currentX + width > sheetSize.width) {
        // Move to next row
        currentX = 0;
        currentY += shelfHeight;
        shelfHeight = 0;
      }

      // Check if part fits on current sheet
      if (currentY + height > sheetSize.length) {
        // Start new sheet
        sheetIndex++;
        currentX = 0;
        currentY = 0;
        shelfHeight = 0;
      }

      layouts.push({
        partId: `${part.id}_${index}`,
        sheetIndex,
        x: currentX,
        y: currentY,
        rotation: rotated ? 90 : 0,
        width,
        height,
      });

      currentX += width;
      shelfHeight = Math.max(shelfHeight, height);
    }

    const sheetsRequired = sheetIndex + 1;
    const partsPerSheet = Math.ceil(layouts.length / sheetsRequired);
    const totalSheetArea = sheetsRequired * sheetSize.width * sheetSize.length;
    const totalPartArea = layouts.reduce((sum, l) => sum + l.width * l.height, 0);
    const utilization = (totalPartArea / totalSheetArea) * 100;

    return {
      sheetWidth: sheetSize.width,
      sheetLength: sheetSize.length,
      partsPerSheet,
      sheetsRequired,
      utilization,
      wasteArea: totalSheetArea - totalPartArea,
      layout: layouts,
      layoutSvg: '',
      layoutJson: null,
    };
  }

  /**
   * Genetic algorithm for nesting optimization
   * Best results but slower
   */
  private async geneticNesting(
    parts: NestingPart[],
    sheetSize: SheetSize,
  ): Promise<NestingResult> {
    // Simplified GA implementation
    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;

    // Initialize population with random permutations
    let population = this.initializePopulation(parts, populationSize);

    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness (material utilization)
      const fitness = population.map(individual => 
        this.evaluateFitness(individual, sheetSize)
      );

      // Selection (tournament)
      const selected = this.tournamentSelection(population, fitness);

      // Crossover
      const offspring = this.crossover(selected);

      // Mutation
      population = offspring.map(ind => 
        Math.random() < mutationRate ? this.mutate(ind) : ind
      );
    }

    // Get best solution
    const finalFitness = population.map(ind => this.evaluateFitness(ind, sheetSize));
    const bestIndex = finalFitness.indexOf(Math.max(...finalFitness));
    const bestSolution = population[bestIndex];

    // Convert to layout
    return this.solutionToLayout(bestSolution, sheetSize);
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  private selectOptimalSheet(
    partWidth: number,
    partHeight: number,
    quantity: number,
  ): SheetSize {
    // Find smallest sheet that can fit at least one part
    const validSheets = this.standardSheets.filter(sheet =>
      (sheet.width >= partWidth && sheet.length >= partHeight) ||
      (sheet.width >= partHeight && sheet.length >= partWidth)
    );

    if (validSheets.length === 0) {
      // Return custom sheet size
      return {
        width: Math.max(partWidth, partHeight) * 2,
        length: Math.max(partWidth, partHeight) * Math.ceil(quantity / 2),
      };
    }

    // For large quantities, prefer larger sheets for efficiency
    if (quantity > 50) {
      return validSheets[validSheets.length - 1];
    }

    // Calculate efficiency for each sheet size
    let bestSheet = validSheets[0];
    let bestEfficiency = 0;

    for (const sheet of validSheets) {
      const partsX = Math.floor(sheet.width / partWidth);
      const partsY = Math.floor(sheet.length / partHeight);
      const partsPerSheet = partsX * partsY;
      const sheetsNeeded = Math.ceil(quantity / partsPerSheet);
      const totalArea = sheetsNeeded * sheet.width * sheet.length;
      const partArea = quantity * partWidth * partHeight;
      const efficiency = partArea / totalArea;

      if (efficiency > bestEfficiency) {
        bestEfficiency = efficiency;
        bestSheet = sheet;
      }
    }

    return bestSheet;
  }

  private findBestPosition(
    freeRects: { x: number; y: number; width: number; height: number }[],
    width: number,
    height: number,
    allowRotation: boolean,
  ): { x: number; y: number; rotated: boolean } | null {
    let bestScore = Infinity;
    let bestRect: { x: number; y: number; rotated: boolean } | null = null;

    for (const rect of freeRects) {
      // Try normal orientation
      if (width <= rect.width && height <= rect.height) {
        const score = Math.min(rect.width - width, rect.height - height);
        if (score < bestScore) {
          bestScore = score;
          bestRect = { x: rect.x, y: rect.y, rotated: false };
        }
      }

      // Try rotated orientation
      if (allowRotation && height <= rect.width && width <= rect.height) {
        const score = Math.min(rect.width - height, rect.height - width);
        if (score < bestScore) {
          bestScore = score;
          bestRect = { x: rect.x, y: rect.y, rotated: true };
        }
      }
    }

    return bestRect;
  }

  private splitFreeRects(
    freeRects: { x: number; y: number; width: number; height: number }[],
    placement: { x: number; y: number; rotated: boolean; width?: number; height?: number },
  ): { x: number; y: number; width: number; height: number }[] {
    // Simplified split - in production would use MaxRects split rules
    return freeRects.filter(rect => {
      // Remove rectangles that overlap with placement
      const overlaps = !(
        rect.x + rect.width <= placement.x ||
        rect.x >= placement.x + (placement.width || 0) ||
        rect.y + rect.height <= placement.y ||
        rect.y >= placement.y + (placement.height || 0)
      );
      return !overlaps;
    });
  }

  // Genetic algorithm helpers
  private initializePopulation(parts: NestingPart[], size: number): any[] {
    const population: any[] = [];
    const flatParts: { part: NestingPart; index: number }[] = [];
    
    for (const part of parts) {
      for (let i = 0; i < part.quantity; i++) {
        flatParts.push({ part, index: i });
      }
    }

    for (let i = 0; i < size; i++) {
      // Random permutation
      const shuffled = [...flatParts].sort(() => Math.random() - 0.5);
      population.push(shuffled);
    }

    return population;
  }

  private evaluateFitness(individual: any[], sheetSize: SheetSize): number {
    // Simplified fitness: count how many parts fit
    const result = this.guillotineNesting(
      individual.map(i => ({ ...i.part, quantity: 1 })),
      sheetSize,
    );
    return result.utilization;
  }

  private tournamentSelection(population: any[], fitness: number[]): any[] {
    const selected: any[] = [];
    for (let i = 0; i < population.length; i++) {
      const a = Math.floor(Math.random() * population.length);
      const b = Math.floor(Math.random() * population.length);
      selected.push(fitness[a] > fitness[b] ? population[a] : population[b]);
    }
    return selected;
  }

  private crossover(selected: any[]): any[] {
    const offspring: any[] = [];
    for (let i = 0; i < selected.length; i += 2) {
      if (i + 1 < selected.length) {
        // Order crossover
        const point = Math.floor(Math.random() * selected[i].length);
        const child = [
          ...selected[i].slice(0, point),
          ...selected[i + 1].filter((x: any) => 
            !selected[i].slice(0, point).includes(x)
          ),
        ];
        offspring.push(child);
        offspring.push(selected[i + 1]); // Keep other parent
      } else {
        offspring.push(selected[i]);
      }
    }
    return offspring;
  }

  private mutate(individual: any[]): any[] {
    // Swap two random positions
    const a = Math.floor(Math.random() * individual.length);
    const b = Math.floor(Math.random() * individual.length);
    const mutated = [...individual];
    [mutated[a], mutated[b]] = [mutated[b], mutated[a]];
    return mutated;
  }

  private solutionToLayout(solution: any[], sheetSize: SheetSize): NestingResult {
    // Convert GA solution to layout using guillotine
    const parts = solution.map(s => ({ ...s.part, quantity: 1 }));
    return this.guillotineNesting(parts, sheetSize);
  }

  // ============================================================
  // VISUALIZATION
  // ============================================================

  private generateLayoutSvg(layouts: NestingLayout[], sheetSize: SheetSize): string {
    const scale = 0.5; // Scale for display
    const svgWidth = sheetSize.width * scale;
    const svgHeight = sheetSize.length * scale;

    // Group layouts by sheet
    const sheets = new Map<number, NestingLayout[]>();
    for (const layout of layouts) {
      if (!sheets.has(layout.sheetIndex)) {
        sheets.set(layout.sheetIndex, []);
      }
      sheets.get(layout.sheetIndex)!.push(layout);
    }

    let svg = '';
    let yOffset = 0;

    for (const [sheetIndex, sheetLayouts] of sheets) {
      svg += `
        <!-- Sheet ${sheetIndex + 1} -->
        <g transform="translate(10, ${yOffset + 10})">
          <!-- Sheet outline -->
          <rect x="0" y="0" width="${svgWidth}" height="${svgHeight}" 
                fill="#f5f5f5" stroke="#333" stroke-width="2"/>
          <text x="5" y="15" font-size="12" fill="#666">Sheet ${sheetIndex + 1}</text>
      `;

      // Add parts
      for (const layout of sheetLayouts) {
        const x = layout.x * scale;
        const y = layout.y * scale;
        const width = layout.width * scale;
        const height = layout.height * scale;
        
        svg += `
          <rect x="${x}" y="${y}" width="${width}" height="${height}"
                fill="#4CAF50" stroke="#2E7D32" stroke-width="1" opacity="0.8"/>
          <text x="${x + width/2}" y="${y + height/2}" 
                text-anchor="middle" dominant-baseline="middle"
                font-size="10" fill="white">${layout.partId}</text>
        `;
      }

      svg += '</g>';
      yOffset += svgHeight + 30;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" 
           width="${svgWidth + 20}" 
           height="${yOffset}"
           viewBox="0 0 ${svgWidth + 20} ${yOffset}">
        ${svg}
      </svg>
    `;
  }

  private generateLayoutJson(layouts: NestingLayout[], sheetSize: SheetSize): any {
    // Group layouts by sheet
    const sheets: any[] = [];
    const sheetMap = new Map<number, NestingLayout[]>();

    for (const layout of layouts) {
      if (!sheetMap.has(layout.sheetIndex)) {
        sheetMap.set(layout.sheetIndex, []);
      }
      sheetMap.get(layout.sheetIndex)!.push(layout);
    }

    for (const [sheetIndex, sheetLayouts] of sheetMap) {
      const usedArea = sheetLayouts.reduce((sum, l) => sum + l.width * l.height, 0);
      const sheetArea = sheetSize.width * sheetSize.length;

      sheets.push({
        sheetIndex,
        sheetSize: {
          width: sheetSize.width,
          length: sheetSize.length,
        },
        partCount: sheetLayouts.length,
        utilization: (usedArea / sheetArea) * 100,
        parts: sheetLayouts.map(l => ({
          partId: l.partId,
          position: { x: l.x, y: l.y },
          size: { width: l.width, height: l.height },
          rotation: l.rotation,
        })),
      });
    }

    return {
      totalSheets: sheets.length,
      sheets,
    };
  }

  // ============================================================
  // LASER CUT PATH OPTIMIZATION
  // ============================================================

  /**
   * Optimize laser cutting path to minimize travel time
   */
  async optimizeCutPath(
    layout: NestingLayout[],
    sheetSize: SheetSize,
  ): Promise<{
    optimizedPath: { x: number; y: number; type: 'MOVE' | 'CUT' }[];
    totalCutLength: number;
    totalMoveLength: number;
    estimatedTime: number;
  }> {
    const path: { x: number; y: number; type: 'MOVE' | 'CUT' }[] = [];
    let totalCutLength = 0;
    let totalMoveLength = 0;

    // Start at origin
    let currentX = 0;
    let currentY = 0;

    // Sort parts by proximity (nearest neighbor)
    const unvisited = [...layout];
    
    while (unvisited.length > 0) {
      // Find nearest part
      let nearest = 0;
      let minDist = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const dist = Math.hypot(
          unvisited[i].x - currentX,
          unvisited[i].y - currentY,
        );
        if (dist < minDist) {
          minDist = dist;
          nearest = i;
        }
      }

      const part = unvisited.splice(nearest, 1)[0];

      // Move to part
      path.push({ x: part.x, y: part.y, type: 'MOVE' });
      totalMoveLength += minDist;

      // Cut perimeter (simplified as rectangle)
      const cutLength = 2 * (part.width + part.height);
      path.push({ x: part.x + part.width, y: part.y, type: 'CUT' });
      path.push({ x: part.x + part.width, y: part.y + part.height, type: 'CUT' });
      path.push({ x: part.x, y: part.y + part.height, type: 'CUT' });
      path.push({ x: part.x, y: part.y, type: 'CUT' });
      totalCutLength += cutLength;

      currentX = part.x;
      currentY = part.y;
    }

    // Estimate time (mm/min rates)
    const cutRate = 3000; // mm/min for cutting
    const moveRate = 30000; // mm/min for rapid moves
    const estimatedTime = (totalCutLength / cutRate + totalMoveLength / moveRate) * 60;

    return {
      optimizedPath: path,
      totalCutLength,
      totalMoveLength,
      estimatedTime,
    };
  }
}
