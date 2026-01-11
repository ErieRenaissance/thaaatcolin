/**
 * Feralis Manufacturing Platform
 * Analytics Module
 * Phase 7: Analytics & Customer Portal Implementation
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';

// Entity imports would go here when entities are created
// import { ReportDefinition } from './entities/report-definition.entity';
// import { KPIDefinition } from './entities/kpi-definition.entity';
// import { Dashboard } from './entities/dashboard.entity';

@Module({
  imports: [
    // TypeOrmModule.forFeature([
    //   ReportDefinition,
    //   ReportExecution,
    //   KPIDefinition,
    //   KPIValue,
    //   Dashboard,
    //   DashboardWidget,
    //   AnalyticsAlert,
    //   AlertInstance,
    //   DailyProductionSummary,
    //   CustomerPerformanceSummary,
    // ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'feralis-secret-key',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

/**
 * Module Configuration Notes:
 * 
 * 1. Database Connection:
 *    - Uses PostgreSQL with TimescaleDB extension for time-series KPI data
 *    - KPI values table should be a TimescaleDB hypertable for efficient time-series queries
 * 
 * 2. Required Environment Variables:
 *    - DATABASE_URL: PostgreSQL connection string
 *    - JWT_SECRET: Secret for JWT token signing
 *    - REDIS_URL: Redis connection for caching (optional)
 * 
 * 3. Dependencies:
 *    - @nestjs/typeorm: Database ORM
 *    - @nestjs/jwt: JWT authentication
 *    - @nestjs/schedule: For scheduled KPI calculations
 * 
 * 4. Scheduled Jobs:
 *    - KPI calculations should run on configurable intervals
 *    - Daily production summary should run at end of each day
 *    - Customer performance summary should run monthly
 * 
 * 5. Caching Strategy:
 *    - Dashboard data: 5 minute TTL
 *    - KPI snapshots: 1 minute TTL
 *    - Report results: 15 minute TTL (for same parameters)
 * 
 * 6. Security:
 *    - All endpoints require JWT authentication
 *    - Role-based access control on all endpoints
 *    - Organization-scoped data access
 *    - Audit logging for sensitive operations
 */
