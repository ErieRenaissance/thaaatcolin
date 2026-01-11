// =============================================================================
// FERALIS PLATFORM - PERMISSIONS CONTROLLER
// =============================================================================

import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('permissions.read')
  @ApiOperation({ summary: 'Get all permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async findAll() {
    return this.permissionsService.findAll();
  }

  @Get('modules')
  @Permissions('permissions.read')
  @ApiOperation({ summary: 'Get all permission modules' })
  @ApiResponse({ status: 200, description: 'Modules retrieved successfully' })
  async getModules() {
    return this.permissionsService.getModules();
  }

  @Get('grouped')
  @Permissions('permissions.read')
  @ApiOperation({ summary: 'Get permissions grouped by module' })
  @ApiResponse({ status: 200, description: 'Grouped permissions retrieved' })
  async getGrouped() {
    return this.permissionsService.groupByModule();
  }

  @Get('module/:module')
  @Permissions('permissions.read')
  @ApiOperation({ summary: 'Get permissions by module' })
  @ApiResponse({ status: 200, description: 'Module permissions retrieved' })
  async findByModule(@Param('module') module: string) {
    return this.permissionsService.findByModule(module);
  }
}
