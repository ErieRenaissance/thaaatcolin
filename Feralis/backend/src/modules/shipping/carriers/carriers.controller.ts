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
} from '@nestjs/swagger';
import { CarriersService } from './carriers.service';
import {
  CreateCarrierDto,
  UpdateCarrierDto,
  CarrierQueryDto,
  CreateCarrierServiceDto,
  UpdateCarrierServiceDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Shipping - Carriers')
@ApiBearerAuth()
@Controller('carriers')
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  // ==========================================================================
  // CARRIER CRUD
  // ==========================================================================

  @Post()
  @RequirePermissions('shipping:carriers:create')
  @ApiOperation({ summary: 'Create a carrier' })
  @ApiResponse({ status: 201, description: 'Carrier created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCarrierDto,
  ) {
    return this.carriersService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('shipping:carriers:read')
  @ApiOperation({ summary: 'List carriers' })
  @ApiResponse({ status: 200, description: 'Carriers list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CarrierQueryDto,
  ) {
    return this.carriersService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('shipping:carriers:read')
  @ApiOperation({ summary: 'Get carrier details' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 200, description: 'Carrier details' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carriersService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('shipping:carriers:update')
  @ApiOperation({ summary: 'Update carrier' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 200, description: 'Carrier updated' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarrierDto,
  ) {
    return this.carriersService.update(user.organizationId, id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('shipping:carriers:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete carrier' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 204, description: 'Carrier deleted' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carriersService.delete(user.organizationId, id, user.id);
  }

  // ==========================================================================
  // CARRIER SERVICES
  // ==========================================================================

  @Get(':id/services')
  @RequirePermissions('shipping:carriers:read')
  @ApiOperation({ summary: 'Get carrier services' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 200, description: 'Carrier services' })
  async getServices(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.carriersService.getServices(user.organizationId, id);
  }

  @Post(':id/services')
  @RequirePermissions('shipping:carriers:update')
  @ApiOperation({ summary: 'Add service to carrier' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiResponse({ status: 201, description: 'Service added' })
  async addService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCarrierServiceDto,
  ) {
    return this.carriersService.addService(user.organizationId, id, dto, user.id);
  }

  @Patch(':id/services/:serviceId')
  @RequirePermissions('shipping:carriers:update')
  @ApiOperation({ summary: 'Update carrier service' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiResponse({ status: 200, description: 'Service updated' })
  async updateService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() dto: UpdateCarrierServiceDto,
  ) {
    return this.carriersService.updateService(
      user.organizationId,
      id,
      serviceId,
      dto,
      user.id,
    );
  }

  @Delete(':id/services/:serviceId')
  @RequirePermissions('shipping:carriers:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete carrier service' })
  @ApiParam({ name: 'id', description: 'Carrier ID' })
  @ApiParam({ name: 'serviceId', description: 'Service ID' })
  @ApiResponse({ status: 204, description: 'Service deleted' })
  async deleteService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ) {
    return this.carriersService.deleteService(
      user.organizationId,
      id,
      serviceId,
      user.id,
    );
  }
}
