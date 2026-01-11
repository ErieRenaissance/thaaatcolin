// =============================================================================
// FERALIS PLATFORM - PART OPERATIONS CONTROLLER
// =============================================================================
// Standalone controller for operation-related operations

import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Part Operations')
@Controller('part-operations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PartOperationsController {
  // Operation management is primarily handled through PartsController
  // This controller can be extended for:
  // - Bulk operation updates
  // - Operation templates
  // - Standard operation library
}
