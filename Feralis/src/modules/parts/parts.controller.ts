// =============================================================================
// FERALIS PLATFORM - PARTS CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
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
import { PartStatus } from '@prisma/client';

import { PartsService } from './parts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { QueryPartsDto } from './dto/query-parts.dto';
import { CreateRevisionDto } from './dto/create-revision.dto';
import { CreateOperationDto } from './dto/create-operation.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import { CreateMaterialDto } from './dto/create-material.dto';
import { CopyPartDto } from './dto/copy-part.dto';

@ApiTags('Parts')
@Controller('parts')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  // ===========================================================================
  // PART-001: Create Part
  // ===========================================================================

  @Post()
  @Permissions('parts.create')
  @ApiOperation({ summary: 'Create a new part' })
  @ApiResponse({ status: 201, description: 'Part created successfully' })
  @ApiResponse({ status: 409, description: 'Part number already exists' })
  async create(
    @Body() createPartDto: CreatePartDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.create(
      createPartDto,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-002: Query Parts
  // ===========================================================================

  @Get()
  @Permissions('parts.read')
  @ApiOperation({ summary: 'Get all parts with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Parts retrieved successfully' })
  async findAll(
    @Query() query: QueryPartsDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.findAll(currentUser.organizationId, query);
  }

  // ===========================================================================
  // Helper: Get Parts for Dropdown
  // ===========================================================================

  @Get('select')
  @Permissions('parts.read')
  @ApiOperation({ summary: 'Get active parts for dropdown selection' })
  async getActiveForSelect(
    @Query('customerId') customerId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.getActivePartsForSelect(
      currentUser.organizationId,
      customerId,
    );
  }

  // ===========================================================================
  // PART-003: Get Part by ID
  // ===========================================================================

  @Get(':id')
  @Permissions('parts.read')
  @ApiOperation({ summary: 'Get a part by ID with all relations' })
  @ApiResponse({ status: 200, description: 'Part retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Part not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.findOne(id, currentUser.organizationId);
  }

  // ===========================================================================
  // PART-004: Update Part
  // ===========================================================================

  @Put(':id')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Update a part' })
  @ApiResponse({ status: 200, description: 'Part updated successfully' })
  @ApiResponse({ status: 404, description: 'Part not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartDto: UpdatePartDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.update(
      id,
      currentUser.organizationId,
      updatePartDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-005: Delete Part
  // ===========================================================================

  @Delete(':id')
  @Permissions('parts.delete')
  @ApiOperation({ summary: 'Delete a part (soft delete)' })
  @ApiResponse({ status: 200, description: 'Part deleted successfully' })
  @ApiResponse({ status: 404, description: 'Part not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.partsService.remove(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
    return { message: 'Part deleted successfully' };
  }

  // ===========================================================================
  // PART-006: Update Part Status
  // ===========================================================================

  @Patch(':id/status')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Update part status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: PartStatus,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.updateStatus(
      id,
      currentUser.organizationId,
      status,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-015: Copy Part
  // ===========================================================================

  @Post(':id/copy')
  @Permissions('parts.create')
  @ApiOperation({ summary: 'Copy a part' })
  @ApiResponse({ status: 201, description: 'Part copied successfully' })
  async copyPart(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() copyPartDto: CopyPartDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.copyPart(
      id,
      currentUser.organizationId,
      copyPartDto.newPartNumber,
      copyPartDto.newName,
      copyPartDto.includeOperations,
      copyPartDto.includeMaterials,
      currentUser.id,
    );
  }

  // ===========================================================================
  // Calculate Part Cost
  // ===========================================================================

  @Get(':id/cost')
  @Permissions('parts.read')
  @ApiOperation({ summary: 'Calculate part cost' })
  async calculateCost(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('quantity') quantity: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.calculateCost(
      id,
      currentUser.organizationId,
      quantity || 1,
    );
  }

  // ===========================================================================
  // PART-007: Create Revision
  // ===========================================================================

  @Post(':id/revisions')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Create a new part revision' })
  @ApiResponse({ status: 201, description: 'Revision created successfully' })
  async createRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createRevisionDto: CreateRevisionDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.createRevision(
      id,
      currentUser.organizationId,
      createRevisionDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-008: Approve Revision
  // ===========================================================================

  @Post(':id/revisions/:revisionId/approve')
  @Permissions('parts.approve')
  @ApiOperation({ summary: 'Approve a part revision' })
  @ApiResponse({ status: 200, description: 'Revision approved successfully' })
  async approveRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @Body('approvalNotes') approvalNotes: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.approveRevision(
      id,
      revisionId,
      currentUser.organizationId,
      approvalNotes,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-009: Create Operation
  // ===========================================================================

  @Post(':id/operations')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Add an operation to part' })
  @ApiResponse({ status: 201, description: 'Operation created successfully' })
  async createOperation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createOperationDto: CreateOperationDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.createOperation(
      id,
      currentUser.organizationId,
      createOperationDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-010: Update Operation
  // ===========================================================================

  @Put(':id/operations/:operationId')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Update a part operation' })
  async updateOperation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('operationId', ParseUUIDPipe) operationId: string,
    @Body() updateOperationDto: UpdateOperationDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.updateOperation(
      id,
      operationId,
      currentUser.organizationId,
      updateOperationDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-011: Delete Operation
  // ===========================================================================

  @Delete(':id/operations/:operationId')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Delete a part operation' })
  async removeOperation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('operationId', ParseUUIDPipe) operationId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.partsService.removeOperation(
      id,
      operationId,
      currentUser.organizationId,
    );
    return { message: 'Operation deleted successfully' };
  }

  // ===========================================================================
  // PART-012: Create Material
  // ===========================================================================

  @Post(':id/materials')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Add a material to part BOM' })
  @ApiResponse({ status: 201, description: 'Material created successfully' })
  async createMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createMaterialDto: CreateMaterialDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.createMaterial(
      id,
      currentUser.organizationId,
      createMaterialDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-013: Update Material
  // ===========================================================================

  @Put(':id/materials/:materialId')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Update a part material' })
  async updateMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @Body() updateData: Partial<CreateMaterialDto>,
    @CurrentUser() currentUser: any,
  ) {
    return this.partsService.updateMaterial(
      id,
      materialId,
      currentUser.organizationId,
      updateData,
      currentUser.id,
    );
  }

  // ===========================================================================
  // PART-014: Delete Material
  // ===========================================================================

  @Delete(':id/materials/:materialId')
  @Permissions('parts.update')
  @ApiOperation({ summary: 'Delete a part material' })
  async removeMaterial(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('materialId', ParseUUIDPipe) materialId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.partsService.removeMaterial(
      id,
      materialId,
      currentUser.organizationId,
    );
    return { message: 'Material deleted successfully' };
  }
}
