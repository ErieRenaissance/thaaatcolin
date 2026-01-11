// =============================================================================
// FERALIS PLATFORM - CUSTOMER CONTACTS CONTROLLER
// =============================================================================
// Standalone controller for direct contact operations (not nested under customer)

import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Customer Contacts')
@Controller('customer-contacts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class CustomerContactsController {
  // Contact operations are primarily handled through CustomersController
  // This controller can be extended for batch operations on contacts
}
