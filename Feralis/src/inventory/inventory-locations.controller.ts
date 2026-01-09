// =============================================================================
// FERALIS PLATFORM - INVENTORY LOCATIONS CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

@ApiTags('Inventory Locations')
@Controller('inventory-locations')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryLocationsController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ===========================================================================
  // INV-001: Create Location
  // ===========================================================================

  @Post()
  @Permissions('inventory.manage')
  @ApiOperation({ summary: 'Create a new inventory location' })
  @ApiResponse({ status: 201, description: 'Location created successfully' })
  async create(
    @Body() createLocationDto: CreateLocationDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.createLocation(
      createLocationDto,
      currentUser.organizationId,
      createLocationDto.facilityId || currentUser.defaultFacilityId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // INV-002: Get Locations
  // ===========================================================================

  @Get()
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Get all inventory locations' })
  @ApiResponse({ status: 200, description: 'Locations retrieved successfully' })
  async findAll(
    @Query('facilityId') facilityId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.findAllLocations(
      currentUser.organizationId,
      facilityId,
    );
  }

  // ===========================================================================
  // INV-003: Update Location
  // ===========================================================================

  @Put(':id')
  @Permissions('inventory.manage')
  @ApiOperation({ summary: 'Update an inventory location' })
  @ApiResponse({ status: 200, description: 'Location updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.updateLocation(
      id,
      currentUser.organizationId,
      updateLocationDto,
      currentUser.id,
    );
  }
}
