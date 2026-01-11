/**
 * Feralis Manufacturing Platform
 * Dashboard Enhancements Module
 * 
 * Advanced dashboard features for real-time manufacturing visibility:
 * - Production Heartbeat Monitor (shop floor visualization)
 * - OEE Dashboard (Overall Equipment Effectiveness)
 * - Dynamic Bottleneck Identifier
 * - Financial Performance Ticker
 * - Capacity Planning Forecast
 * - Alert Management Center
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

// Services
import { ProductionHeartbeatService } from './services/production-heartbeat.service';
import { OeeCalculationService } from './services/oee-calculation.service';
import { BottleneckDetectionService } from './services/bottleneck-detection.service';
import { FinancialPerformanceService } from './services/financial-performance.service';
import { CapacityPlanningService } from './services/capacity-planning.service';
import { AlertManagementService } from './services/alert-management.service';
import { DashboardAggregatorService } from './services/dashboard-aggregator.service';

// Controllers
import { DashboardEnhancementsController } from './controllers/dashboard-enhancements.controller';

// Dependencies
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [DashboardEnhancementsController],
  providers: [
    ProductionHeartbeatService,
    OeeCalculationService,
    BottleneckDetectionService,
    FinancialPerformanceService,
    CapacityPlanningService,
    AlertManagementService,
    DashboardAggregatorService,
  ],
  exports: [
    ProductionHeartbeatService,
    OeeCalculationService,
    BottleneckDetectionService,
    FinancialPerformanceService,
    CapacityPlanningService,
    AlertManagementService,
    DashboardAggregatorService,
  ],
})
export class DashboardEnhancementsModule {}

/**
 * Module Features:
 * 
 * 1. Production Heartbeat Monitor (DASH-HB-*)
 *    - Interactive shop floor map with real-time machine status
 *    - Color-coded machine states (running, idle, setup, maintenance, alarm)
 *    - Machine node detail panels with live telemetry
 *    - Historical overlay comparison
 * 
 * 2. OEE Dashboard (DASH-OEE-*)
 *    - Real-time OEE calculation per machine
 *    - Availability, Performance, Quality breakdown
 *    - Loss categorization and pareto analysis
 *    - Shift/day/week comparisons
 * 
 * 3. Dynamic Bottleneck Identifier (DASH-BN-*)
 *    - Real-time queue depth analysis
 *    - Bottleneck scoring algorithm
 *    - Mitigation recommendations
 *    - Impact simulation
 * 
 * 4. Financial Performance Ticker (DASH-FN-*)
 *    - Real-time revenue recognition
 *    - Margin tracking per job
 *    - Cash flow timeline
 *    - Daily/weekly/monthly targets
 * 
 * 5. Capacity Planning Forecast (DASH-CP-*)
 *    - 30/60/90 day capacity views
 *    - Confirmed vs. pipeline load
 *    - Overload prediction
 *    - What-if scenarios
 * 
 * 6. Alert Management Center (DASH-AM-*)
 *    - Unified alert dashboard
 *    - Priority-based routing
 *    - Acknowledgment workflows
 *    - Escalation management
 */
