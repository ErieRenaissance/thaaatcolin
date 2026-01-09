// =============================================================================
// FERALIS PLATFORM - ORDERS CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
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

import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { CreateOrderLineDto } from './dto/create-order-line.dto';
import { UpdateOrderLineDto } from './dto/update-order-line.dto';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ===========================================================================
  // ORD-001: Create Order
  // ===========================================================================

  @Post()
  @Permissions('orders.create')
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.create(
      createOrderDto,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-002: Query Orders
  // ===========================================================================

  @Get()
  @Permissions('orders.read')
  @ApiOperation({ summary: 'Get all orders with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async findAll(
    @Query() query: QueryOrdersDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.findAll(currentUser.organizationId, query);
  }

  // ===========================================================================
  // ORD-013: Get Order Statistics
  // ===========================================================================

  @Get('statistics')
  @Permissions('orders.read')
  @ApiOperation({ summary: 'Get order statistics' })
  async getStatistics(
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.getStatistics(
      currentUser.organizationId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  // ===========================================================================
  // ORD-003: Get Order by ID
  // ===========================================================================

  @Get(':id')
  @Permissions('orders.read')
  @ApiOperation({ summary: 'Get an order by ID with all relations' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.findOne(id, currentUser.organizationId);
  }

  // ===========================================================================
  // ORD-004: Update Order
  // ===========================================================================

  @Put(':id')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Update an order' })
  @ApiResponse({ status: 200, description: 'Order updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.update(
      id,
      currentUser.organizationId,
      updateOrderDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-005: Cancel Order
  // ===========================================================================

  @Post(':id/cancel')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Cancel an order' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.cancel(
      id,
      currentUser.organizationId,
      reason,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-006: Approve Order
  // ===========================================================================

  @Post(':id/approve')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Approve an order' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.approve(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-007: Put Order On Hold
  // ===========================================================================

  @Post(':id/hold')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Put order on hold' })
  async putOnHold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.putOnHold(
      id,
      currentUser.organizationId,
      reason,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-008: Release Order Hold
  // ===========================================================================

  @Post(':id/release-hold')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Release order from hold' })
  async releaseHold(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.releaseHold(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-009: Release to Production
  // ===========================================================================

  @Post(':id/release-to-production')
  @Permissions('production.manage')
  @ApiOperation({ summary: 'Release order to production' })
  async releaseToProduction(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.releaseToProduction(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-010: Add Order Line
  // ===========================================================================

  @Post(':id/lines')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Add a line to order' })
  @ApiResponse({ status: 201, description: 'Line added successfully' })
  async addLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createLineDto: CreateOrderLineDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.addLine(
      id,
      currentUser.organizationId,
      createLineDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-011: Update Order Line
  // ===========================================================================

  @Put(':id/lines/:lineId')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Update an order line' })
  async updateLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() updateLineDto: UpdateOrderLineDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.ordersService.updateLine(
      id,
      lineId,
      currentUser.organizationId,
      updateLineDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // ORD-012: Remove Order Line
  // ===========================================================================

  @Delete(':id/lines/:lineId')
  @Permissions('orders.update')
  @ApiOperation({ summary: 'Remove an order line' })
  async removeLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.ordersService.removeLine(
      id,
      lineId,
      currentUser.organizationId,
    );
    return { message: 'Line removed successfully' };
  }
}
