// =============================================================================
// FERALIS PLATFORM - PART REVISIONS CONTROLLER
// =============================================================================
// Standalone controller for revision-related operations

import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@ApiTags('Part Revisions')
@Controller('part-revisions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PartRevisionsController {
  // Revision operations are primarily handled through PartsController
  // This controller can be extended for:
  // - Bulk revision operations
  // - Revision comparison
  // - Revision history reports
}
