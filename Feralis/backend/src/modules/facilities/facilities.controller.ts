// =============================================================================
// FERALIS PLATFORM - FACILITIES CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { FacilitiesService } from './facilities.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilitiesDto } from './dto/query-facilities.dto';

@ApiTags('Facilities')
@Controller('facilities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  @Permissions('facilities.create')
  @ApiOperation({ summary: 'Create a new facility' })
  @ApiResponse({ status: 201, description: 'Facility created successfully' })
  async create(
    @Body() createFacilityDto: CreateFacilityDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.facilitiesService.create(
      createFacilityDto,
      currentUser.organizationId,
    );
  }

  @Get()
  @Permissions('facilities.read')
  @ApiOperation({ summary: 'Get all facilities' })
  @ApiResponse({ status: 200, description: 'Facilities retrieved successfully' })
  async findAll(
    @Query() query: QueryFacilitiesDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.facilitiesService.findAll(currentUser.organizationId, query);
  }

  @Get(':id')
  @Permissions('facilities.read')
  @ApiOperation({ summary: 'Get a facility by ID' })
  @ApiResponse({ status: 200, description: 'Facility retrieved successfully' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.facilitiesService.findOne(id, currentUser.organizationId);
  }

  @Put(':id')
  @Permissions('facilities.update')
  @ApiOperation({ summary: 'Update a facility' })
  @ApiResponse({ status: 200, description: 'Facility updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFacilityDto: UpdateFacilityDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.facilitiesService.update(
      id,
      currentUser.organizationId,
      updateFacilityDto,
    );
  }

  @Delete(':id')
  @Permissions('facilities.delete')
  @ApiOperation({ summary: 'Delete a facility' })
  @ApiResponse({ status: 200, description: 'Facility deleted successfully' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.facilitiesService.remove(id, currentUser.organizationId);
    return { message: 'Facility deleted successfully' };
  }

  @Patch(':id/activate')
  @Permissions('facilities.update')
  @ApiOperation({ summary: 'Activate a facility' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.facilitiesService.setActive(id, currentUser.organizationId, true);
  }

  @Patch(':id/deactivate')
  @Permissions('facilities.update')
  @ApiOperation({ summary: 'Deactivate a facility' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.facilitiesService.setActive(id, currentUser.organizationId, false);
  }
}
