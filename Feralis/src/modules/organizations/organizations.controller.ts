// =============================================================================
// FERALIS PLATFORM - ORGANIZATIONS CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Put,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@Controller('organization')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  // ===========================================================================
  // Get Current Organization
  // ===========================================================================

  @Get()
  @ApiOperation({ summary: 'Get current organization' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  async findOne(@CurrentUser() currentUser: any) {
    return this.organizationsService.findOne(currentUser.organizationId);
  }

  // ===========================================================================
  // Update Organization
  // ===========================================================================

  @Put()
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Update organization' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  async update(
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.organizationsService.update(
      currentUser.organizationId,
      updateOrganizationDto,
    );
  }

  // ===========================================================================
  // Update Settings
  // ===========================================================================

  @Patch('settings')
  @Permissions('organization.update')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSettings(
    @Body() settings: Record<string, any>,
    @CurrentUser() currentUser: any,
  ) {
    return this.organizationsService.updateSettings(
      currentUser.organizationId,
      settings,
    );
  }

  // ===========================================================================
  // Get Statistics
  // ===========================================================================

  @Get('statistics')
  @Permissions('organization.read')
  @ApiOperation({ summary: 'Get organization statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(@CurrentUser() currentUser: any) {
    return this.organizationsService.getStatistics(currentUser.organizationId);
  }
}
