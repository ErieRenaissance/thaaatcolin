/**
 * Feralis Manufacturing Platform
 * Customer Portal Module (Fixed - Prisma Version)
 * Phase 7: Analytics & Customer Portal Implementation
 * 
 * CHANGES FROM ORIGINAL:
 * - Removed TypeORM imports and references
 * - Now uses PrismaService for database operations
 * - All repositories replaced with Prisma client methods
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';

import { PortalAuthController, PortalController } from './controllers/portal.controller';
import { PortalService } from './services/portal.service';
import { PortalAuthService } from './services/portal-auth.service';
import { PortalUserService } from './services/portal-user.service';
import { RfqService } from './services/rfq.service';
import { ApprovalService } from './services/approval.service';
import { MessagingService } from './services/messaging.service';
import { PortalJwtStrategy } from './strategies/portal-jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'portal-jwt' }),
    JwtModule.register({
      secret: process.env.PORTAL_JWT_SECRET || 'feralis-portal-secret-key',
      signOptions: { expiresIn: '4h' },
    }),
    ThrottlerModule.forRoot([{
      name: 'portal',
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
  ],
  controllers: [PortalAuthController, PortalController],
  providers: [
    PortalService,
    PortalAuthService,
    PortalUserService,
    RfqService,
    ApprovalService,
    MessagingService,
    PortalJwtStrategy,
  ],
  exports: [
    PortalService,
    PortalAuthService,
    PortalUserService,
    RfqService,
    ApprovalService,
    MessagingService,
  ],
})
export class PortalModule {}

/**
 * Module Configuration Notes:
 * 
 * 1. Database Connection:
 *    - Uses Prisma ORM with PostgreSQL
 *    - PrismaService is injected via PrismaModule
 * 
 * 2. Authentication:
 *    - Separate JWT secret for portal users (PORTAL_JWT_SECRET)
 *    - Shorter token lifetime (4h) compared to internal users (8h)
 *    - Uses passport-jwt strategy for authentication
 * 
 * 3. Rate Limiting:
 *    - 100 requests per minute per IP
 *    - Configurable via ThrottlerModule
 * 
 * 4. Required Environment Variables:
 *    - DATABASE_URL: PostgreSQL connection string
 *    - PORTAL_JWT_SECRET: Secret for portal JWT token signing
 *    - PORTAL_JWT_EXPIRATION: Token expiration (default: 4h)
 * 
 * 5. Security Features:
 *    - Separate authentication from internal users
 *    - Customer-scoped data access
 *    - Session management with IP tracking
 *    - Activity logging for all actions
 *    - Document access logging
 * 
 * 6. Available Services:
 *    - PortalAuthService: Login, logout, password reset
 *    - PortalUserService: User management within customer
 *    - RfqService: Request for quote submission and tracking
 *    - ApprovalService: Order/quote approval workflows
 *    - MessagingService: Customer-supplier messaging
 */
