/**
 * Feralis Manufacturing Platform
 * Analytics Module (Fixed - Prisma Version)
 * Phase 7: Analytics & Customer Portal Implementation
 * 
 * CHANGES FROM ORIGINAL:
 * - Removed TypeORM imports and references
 * - Now uses PrismaService for database operations
 * - All repositories replaced with Prisma client methods
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';

import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { ReportService } from './services/report.service';
import { KpiService } from './services/kpi.service';
import { DashboardService } from './services/dashboard.service';
import { AlertService } from './services/alert.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'feralis-secret-key',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    ReportService,
    KpiService,
    DashboardService,
    AlertService,
  ],
  exports: [
    AnalyticsService,
    ReportService,
    KpiService,
    DashboardService,
    AlertService,
  ],
})
export class AnalyticsModule {}

/**
 * Module Configuration Notes:
 * 
 * 1. Database Connection:
 *    - Uses Prisma ORM with PostgreSQL + TimescaleDB extension
 *    - PrismaService is injected via PrismaModule
 *    - KPI values table should be a TimescaleDB hypertable for efficient time-series queries
 * 
 * 2. Required Environment Variables:
 *    - DATABASE_URL: PostgreSQL connection string
 *    - JWT_SECRET: Secret for JWT token signing
 *    - REDIS_URL: Redis connection for caching (optional)
 * 
 * 3. Dependencies:
 *    - @prisma/client: Database ORM
 *    - @nestjs/jwt: JWT authentication
 *    - @nestjs/schedule: For scheduled KPI calculations
 * 
 * 4. Scheduled Jobs:
 *    - KPI calculations run on configurable intervals (see KpiService)
 *    - Daily production summary runs at end of each day
 *    - Customer performance summary runs monthly
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
