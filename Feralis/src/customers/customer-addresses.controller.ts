// =============================================================================
// FERALIS PLATFORM - CUSTOMER ADDRESSES CONTROLLER
// =============================================================================
// Standalone controller for direct address operations

import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Customer Addresses')
@Controller('customer-addresses')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class CustomerAddressesController {
  // Address operations are primarily handled through CustomersController
  // This controller can be extended for batch operations on addresses
}
