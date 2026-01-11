/**
 * Analytics Module
 * Phase 7: Analytics & Customer Portal
 *
 * This module provides analytics and reporting capabilities for the Feralis
 * manufacturing ERP platform. It handles KPI tracking, dashboard metrics,
 * production analytics, and performance reporting.
 *
 * Dependencies:
 * - PrismaModule: Database access via Prisma ORM
 * - AuditModule: Audit logging for analytics operations
 * - JwtModule: JWT authentication for secure API access
 * - ConfigModule: Environment configuration management
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

import { AnalyticsController } from './controllers/analytics.controller';
import { AnalyticsService } from './services/analytics.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret') || process.env.JWT_SECRET,
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn', '15m'),
        },
      }),
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
