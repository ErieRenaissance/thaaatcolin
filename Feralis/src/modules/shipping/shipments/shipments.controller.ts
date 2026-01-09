import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ShipmentsService } from './shipments.service';
import {
  CreateShipmentDto,
  UpdateShipmentDto,
  ShipShipmentDto,
  AddPackagesToShipmentDto,
  RecordTrackingEventDto,
  ShipmentQueryDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Shipping - Shipments')
@ApiBearerAuth()
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  // ==========================================================================
  // SHIPMENT CRUD
  // ==========================================================================

  @Post()
  @RequirePermissions('shipping:shipments:create')
  @ApiOperation({ summary: 'Create a shipment' })
  @ApiResponse({ status: 201, description: 'Shipment created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShipmentDto,
  ) {
    return this.shipmentsService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('shipping:shipments:read')
  @ApiOperation({ summary: 'List shipments' })
  @ApiResponse({ status: 200, description: 'Shipments list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ShipmentQueryDto,
  ) {
    return this.shipmentsService.findAll(user.organizationId, query);
  }

  @Get('statistics')
  @RequirePermissions('shipping:shipments:read')
  @ApiOperation({ summary: 'Get shipping statistics' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiResponse({ status: 200, description: 'Shipping statistics' })
  async getStatistics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.shipmentsService.getStatistics(
      user.organizationId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get('by-number/:shipmentNumber')
  @RequirePermissions('shipping:shipments:read')
  @ApiOperation({ summary: 'Get shipment by number' })
  @ApiParam({ name: 'shipmentNumber', description: 'Shipment number' })
  @ApiResponse({ status: 200, description: 'Shipment details' })
  async findByNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Param('shipmentNumber') shipmentNumber: string,
  ) {
    return this.shipmentsService.findByNumber(user.organizationId, shipmentNumber);
  }

  @Get(':id')
  @RequirePermissions('shipping:shipments:read')
  @ApiOperation({ summary: 'Get shipment details' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment details' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.shipmentsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('shipping:shipments:update')
  @ApiOperation({ summary: 'Update shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment updated' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.shipmentsService.update(user.organizationId, id, dto, user.id);
  }

  // ==========================================================================
  // PACKAGE MANAGEMENT
  // ==========================================================================

  @Post(':id/packages')
  @RequirePermissions('shipping:shipments:update')
  @ApiOperation({ summary: 'Add packages to shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Packages added' })
  async addPackages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPackagesToShipmentDto,
  ) {
    return this.shipmentsService.addPackages(user.organizationId, id, dto, user.id);
  }

  @Delete(':id/packages/:packageId')
  @RequirePermissions('shipping:shipments:update')
  @ApiOperation({ summary: 'Remove package from shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiParam({ name: 'packageId', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package removed' })
  async removePackage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('packageId', ParseUUIDPipe) packageId: string,
  ) {
    return this.shipmentsService.removePackage(user.organizationId, id, packageId, user.id);
  }

  // ==========================================================================
  // SHIPPING OPERATIONS
  // ==========================================================================

  @Post(':id/ship')
  @RequirePermissions('shipping:shipments:ship')
  @ApiOperation({ summary: 'Ship shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment shipped' })
  async ship(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShipShipmentDto,
  ) {
    return this.shipmentsService.ship(user.organizationId, id, dto, user.id);
  }

  @Post(':id/deliver')
  @RequirePermissions('shipping:shipments:update')
  @ApiOperation({ summary: 'Mark shipment as delivered' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment delivered' })
  async markDelivered(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('signedBy') signedBy: string,
  ) {
    return this.shipmentsService.markDelivered(user.organizationId, id, signedBy, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('shipping:shipments:cancel')
  @ApiOperation({ summary: 'Cancel shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.shipmentsService.cancel(user.organizationId, id, reason, user.id);
  }

  // ==========================================================================
  // TRACKING
  // ==========================================================================

  @Post(':id/tracking')
  @RequirePermissions('shipping:shipments:update')
  @ApiOperation({ summary: 'Record tracking event' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 201, description: 'Tracking event recorded' })
  async recordTrackingEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordTrackingEventDto,
  ) {
    return this.shipmentsService.recordTrackingEvent(user.organizationId, id, dto, user.id);
  }
}
