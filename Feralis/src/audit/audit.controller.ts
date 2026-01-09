// =============================================================================
// FERALIS PLATFORM - AUDIT CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async query(
    @Query() query: QueryAuditLogsDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.auditService.query({
      ...query,
      organizationId: currentUser.organizationId,
    });
  }

  @Get('entity/:entityType/:entityId')
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Get audit history for an entity' })
  @ApiResponse({ status: 200, description: 'Entity history retrieved successfully' })
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId);
  }
}
