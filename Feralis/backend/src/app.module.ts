// =============================================================================
// FERALIS PLATFORM - APP MODULE
// =============================================================================
// Main application module integrating all platform features:
// - Phase 1: Foundation & Authentication
// - Phase 2: Customer & Order Management
// - Phase 3: Production & Inventory
// - Phase 4: Advanced Production
// - Phase 5: Quality Control & Fulfillment
// - Phase 6: Advanced Quoting System
// - Phase 7: Analytics & Customer Portal
// =============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

// Configuration
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';

// Common
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

// =============================================================================
// PHASE 1: Foundation & Authentication Modules
// =============================================================================
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { FacilitiesModule } from './modules/facilities/facilities.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';

// =============================================================================
// PHASE 2: Customer & Order Management Modules
// =============================================================================
import { CustomersModule } from './modules/customers/customers.module';
import { PartsModule } from './modules/parts/parts.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { OrdersModule } from './modules/orders/orders.module';

// =============================================================================
// PHASE 3-4: Production & Inventory Modules
// =============================================================================
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductionModule } from './modules/production/production.module';

// =============================================================================
// PHASE 5: Quality Control & Fulfillment Modules
// =============================================================================
import { QualityModule } from './modules/quality/quality.module';
import { FinishingModule } from './modules/finishing/finishing.module';
import { PackagingModule } from './modules/packaging/packaging.module';
import { ShippingModule } from './modules/shipping/shipping.module';

// =============================================================================
// PHASE 6: Advanced Quoting System Modules
// =============================================================================
import { QuoteAnalysisModule } from './modules/quote-analysis/quote-analysis.module';

// =============================================================================
// PHASE 7: Analytics & Customer Portal Modules
// =============================================================================
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CustomerPortalModule } from './modules/customer-portal/portal.module';
import { DashboardEnhancementsModule } from './modules/dashboard/dashboard-enhancements.module';

@Module({
  imports: [
    // =========================================================================
    // CONFIGURATION
    // =========================================================================
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),

    // =========================================================================
    // RATE LIMITING
    // =========================================================================
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // =========================================================================
    // REDIS QUEUE PROCESSING (Bull)
    // =========================================================================
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', undefined),
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
      inject: [ConfigService],
    }),

    // =========================================================================
    // COMMON INFRASTRUCTURE
    // =========================================================================
    PrismaModule,
    RedisModule,

    // =========================================================================
    // PHASE 1: Foundation & Authentication
    // =========================================================================
    AuthModule,
    UsersModule,
    OrganizationsModule,
    FacilitiesModule,
    RolesModule,
    PermissionsModule,
    AuditModule,
    NotificationsModule,
    FilesModule,
    HealthModule,

    // =========================================================================
    // PHASE 2: Customer & Order Management
    // =========================================================================
    CustomersModule,
    PartsModule,
    QuotesModule,
    OrdersModule,

    // =========================================================================
    // PHASE 3-4: Production & Inventory
    // =========================================================================
    InventoryModule,
    ProductionModule,

    // =========================================================================
    // PHASE 5: Quality Control & Fulfillment
    // =========================================================================
    QualityModule,
    FinishingModule,
    PackagingModule,
    ShippingModule,

    // =========================================================================
    // PHASE 6: Advanced Quoting System
    // =========================================================================
    QuoteAnalysisModule,

    // =========================================================================
    // PHASE 7: Analytics & Customer Portal
    // =========================================================================
    AnalyticsModule,
    CustomerPortalModule,
    DashboardEnhancementsModule,
  ],
  providers: [
    // =========================================================================
    // GLOBAL EXCEPTION FILTER
    // =========================================================================
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // =========================================================================
    // GLOBAL INTERCEPTORS
    // =========================================================================
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // =========================================================================
    // GLOBAL GUARDS
    // =========================================================================
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
