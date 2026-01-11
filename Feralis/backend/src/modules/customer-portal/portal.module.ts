/**
 * Feralis Manufacturing Platform
 * Customer Portal Module
 * Phase 7: Analytics & Customer Portal Implementation
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';

import { PortalController, PortalAuthController } from './controllers/portal.controller';
import { PortalService } from './services/portal.service';

// Entity imports would go here when entities are created
// import { CustomerPortalConfig } from './entities/customer-portal-config.entity';
// import { PortalUser } from './entities/portal-user.entity';

@Module({
  imports: [
    // TypeOrmModule.forFeature([
    //   CustomerPortalConfig,
    //   PortalUser,
    //   PortalSession,
    //   RFQ,
    //   RFQLine,
    //   ApprovalRequest,
    //   ApprovalHistory,
    //   MessageThread,
    //   Message,
    //   PortalNotification,
    //   PortalActivityLog,
    //   DocumentAccessLog,
    //   SavedSearch,
    //   Favorite,
    // ]),
    JwtModule.register({
      secret: process.env.PORTAL_JWT_SECRET || 'feralis-portal-secret',
      signOptions: { expiresIn: '24h' },
    }),
    MulterModule.register({
      dest: './uploads',
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
        files: 10, // Max 10 files per upload
      },
    }),
  ],
  controllers: [PortalController, PortalAuthController],
  providers: [PortalService],
  exports: [PortalService],
})
export class CustomerPortalModule {}

/**
 * Module Configuration Notes:
 * 
 * 1. Authentication:
 *    - Separate JWT secret from internal users
 *    - Session tracking with device info
 *    - Refresh token support with 7-day expiry
 *    - Rate limiting on login attempts
 * 
 * 2. File Upload:
 *    - Uses MinIO (S3-compatible) for file storage
 *    - Virus scanning integration recommended
 *    - File type validation (CAD files, PDFs, images)
 *    - Maximum file size: 100MB
 * 
 * 3. Required Environment Variables:
 *    - DATABASE_URL: PostgreSQL connection string
 *    - PORTAL_JWT_SECRET: Secret for portal JWT tokens
 *    - MINIO_ENDPOINT: MinIO server URL
 *    - MINIO_ACCESS_KEY: MinIO access key
 *    - MINIO_SECRET_KEY: MinIO secret key
 *    - SMTP_HOST: Email server for notifications
 *    - TWILIO_SID: For SMS notifications (optional)
 * 
 * 4. Customer Portal Features:
 *    - Self-service order tracking
 *    - Quote viewing and conversion to orders
 *    - RFQ submission with file uploads
 *    - Approval workflow (FAI, deviations, change orders)
 *    - Document library access
 *    - Messaging system
 *    - Notification preferences
 * 
 * 5. Security:
 *    - Customer-scoped data access
 *    - Portal role-based permissions (ADMIN, BUYER, ENGINEER, VIEWER)
 *    - Document access logging
 *    - Activity audit trail
 *    - Digital signature capture for approvals
 * 
 * 6. Integration Points:
 *    - Order service for order data
 *    - Quote service for quote data
 *    - Shipping service for shipment tracking
 *    - Document service for file management
 *    - Notification service for multi-channel notifications
 *    - CAD analysis service for instant quotes
 * 
 * 7. Performance:
 *    - Dashboard data caching (2 minute TTL)
 *    - Pagination on all list endpoints
 *    - Lazy loading for documents
 *    - Optimistic UI updates for notifications
 */
