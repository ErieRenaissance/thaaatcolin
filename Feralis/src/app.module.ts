// =============================================================================
// FERALIS PLATFORM - APP MODULE
// =============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
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

// Modules
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
import { CustomersModule } from './modules/customers/customers.module';
import { PartsModule } from './modules/parts/parts.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ProductionModule } from './modules/production/production.module';
// Phase 5 Modules
import { QualityModule } from './modules/quality/quality.module';
import { FinishingModule } from './modules/finishing/finishing.module';
import { PackagingModule } from './modules/packaging/packaging.module';
import { ShippingModule } from './modules/shipping/shipping.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
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

    // Infrastructure
    PrismaModule,
    RedisModule,

    // Feature Modules
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
    CustomersModule,
    PartsModule,
    QuotesModule,
    OrdersModule,
    InventoryModule,
    ProductionModule,
    // Phase 5
    QualityModule,
    FinishingModule,
    PackagingModule,
    ShippingModule,
  ],
  providers: [
    // Global exception filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global response transformer
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    // Global logging
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}
