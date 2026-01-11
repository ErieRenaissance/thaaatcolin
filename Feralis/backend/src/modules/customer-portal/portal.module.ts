/**
 * Phase 7: Customer Portal Module
 * 
 * Provides self-service customer portal functionality including:
 * - Customer authentication and session management
 * - Order history and tracking
 * - Quote requests and approvals
 * - Document access and downloads
 * - Account management
 * 
 * @module PortalModule
 * @since Phase 7
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';

import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

import { PortalController, PortalAuthController } from './controllers/portal.controller';
import { PortalService } from './services/portal.service';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.portalSecret') || process.env.PORTAL_JWT_SECRET,
        signOptions: {
          expiresIn: '24h',
        },
      }),
    }),
    MulterModule.register({
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for customer uploads
      },
    }),
  ],
  controllers: [
    PortalController,
    PortalAuthController,
  ],
  providers: [
    PortalService,
  ],
  exports: [
    PortalService,
  ],
})
export class PortalModule {}
