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
import { WorkOrdersService } from './work-orders.service';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  WorkOrderQueryDto,
  ReleaseWorkOrderDto,
  HoldWorkOrderDto,
  CloseWorkOrderDto,
  CreateWorkOrderOperationDto,
  UpdateWorkOrderOperationDto,
  StartOperationDto,
  RecordProductionDto,
  CompleteOperationDto,
  FirstPieceApprovalDto,
  OperatorDispatchListQueryDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Work Orders')
@ApiBearerAuth()
@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  // ==========================================================================
  // WORK ORDER CRUD
  // ==========================================================================

  @Post()
  @RequirePermissions('production:work-orders:create')
  @ApiOperation({ summary: 'Create a new work order' })
  @ApiResponse({ status: 201, description: 'Work order created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.workOrdersService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('production:work-orders:read')
  @ApiOperation({ summary: 'List all work orders' })
  @ApiResponse({ status: 200, description: 'Work orders list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkOrderQueryDto,
  ) {
    return this.workOrdersService.findAll(user.organizationId, query);
  }

  @Get('dispatch-list')
  @RequirePermissions('production:shop-floor:read')
  @ApiOperation({ summary: 'Get operator dispatch list' })
  @ApiResponse({ status: 200, description: 'Dispatch list' })
  async getDispatchList(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: OperatorDispatchListQueryDto,
  ) {
    return this.workOrdersService.getDispatchList(user.organizationId, query);
  }

  @Get('by-number/:workOrderNumber')
  @RequirePermissions('production:work-orders:read')
  @ApiOperation({ summary: 'Get work order by number' })
  @ApiParam({ name: 'workOrderNumber', description: 'Work order number' })
  @ApiResponse({ status: 200, description: 'Work order details' })
  async findByNumber(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workOrderNumber') workOrderNumber: string,
  ) {
    return this.workOrdersService.findByNumber(user.organizationId, workOrderNumber);
  }

  @Get(':id')
  @RequirePermissions('production:work-orders:read')
  @ApiOperation({ summary: 'Get a work order by ID' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order details' })
  @ApiResponse({ status: 404, description: 'Work order not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workOrdersService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('production:work-orders:update')
  @ApiOperation({ summary: 'Update a work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order updated' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(user.organizationId, id, dto, user.id);
  }

  // ==========================================================================
  // WORK ORDER LIFECYCLE
  // ==========================================================================

  @Post(':id/release')
  @RequirePermissions('production:work-orders:release')
  @ApiOperation({ summary: 'Release work order to production' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order released' })
  async release(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReleaseWorkOrderDto,
  ) {
    return this.workOrdersService.release(user.organizationId, id, dto, user.id);
  }

  @Post(':id/hold')
  @RequirePermissions('production:work-orders:update')
  @ApiOperation({ summary: 'Put work order on hold' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order on hold' })
  async hold(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: HoldWorkOrderDto,
  ) {
    return this.workOrdersService.hold(user.organizationId, id, dto, user.id);
  }

  @Post(':id/resume')
  @RequirePermissions('production:work-orders:update')
  @ApiOperation({ summary: 'Resume work order from hold' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order resumed' })
  async resume(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workOrdersService.resume(user.organizationId, id, user.id);
  }

  @Post(':id/complete')
  @RequirePermissions('production:work-orders:complete')
  @ApiOperation({ summary: 'Complete work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order completed' })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workOrdersService.complete(user.organizationId, id, user.id);
  }

  @Post(':id/close')
  @RequirePermissions('production:work-orders:close')
  @ApiOperation({ summary: 'Close work order (finalize)' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order closed' })
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseWorkOrderDto,
  ) {
    return this.workOrdersService.close(user.organizationId, id, dto, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('production:work-orders:cancel')
  @ApiOperation({ summary: 'Cancel work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Work order cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.workOrdersService.cancel(user.organizationId, id, reason, user.id);
  }

  // ==========================================================================
  // OPERATION MANAGEMENT
  // ==========================================================================

  @Post(':id/operations')
  @RequirePermissions('production:work-orders:update')
  @ApiOperation({ summary: 'Add operation to work order' })
  @ApiParam({ name: 'id', description: 'Work order ID' })
  @ApiResponse({ status: 201, description: 'Operation added' })
  async addOperation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateWorkOrderOperationDto,
  ) {
    return this.workOrdersService.addOperation(user.organizationId, id, dto, user.id);
  }

  @Patch('operations/:operationId')
  @RequirePermissions('production:work-orders:update')
  @ApiOperation({ summary: 'Update operation' })
  @ApiParam({ name: 'operationId', description: 'Operation ID' })
  @ApiResponse({ status: 200, description: 'Operation updated' })
  async updateOperation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('operationId', ParseUUIDPipe) operationId: string,
    @Body() dto: UpdateWorkOrderOperationDto,
  ) {
    return this.workOrdersService.updateOperation(
      user.organizationId,
      operationId,
      dto,
      user.id,
    );
  }

  // ==========================================================================
  // SHOP FLOOR OPERATIONS
  // ==========================================================================

  @Post('shop-floor/start')
  @RequirePermissions('production:shop-floor:execute')
  @ApiOperation({ summary: 'Start operation (shop floor)' })
  @ApiResponse({ status: 200, description: 'Operation started' })
  async startOperation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartOperationDto,
  ) {
    return this.workOrdersService.startOperation(user.organizationId, dto, user.id);
  }

  @Post('shop-floor/record-production')
  @RequirePermissions('production:shop-floor:execute')
  @ApiOperation({ summary: 'Record production (shop floor)' })
  @ApiResponse({ status: 200, description: 'Production recorded' })
  async recordProduction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordProductionDto,
  ) {
    return this.workOrdersService.recordProduction(user.organizationId, dto, user.id);
  }

  @Post('shop-floor/complete')
  @RequirePermissions('production:shop-floor:execute')
  @ApiOperation({ summary: 'Complete operation (shop floor)' })
  @ApiResponse({ status: 200, description: 'Operation completed' })
  async completeOperation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CompleteOperationDto,
  ) {
    return this.workOrdersService.completeOperation(user.organizationId, dto, user.id);
  }

  @Post('shop-floor/first-piece-approval')
  @RequirePermissions('production:quality:approve')
  @ApiOperation({ summary: 'First piece approval' })
  @ApiResponse({ status: 200, description: 'First piece approved/rejected' })
  async firstPieceApproval(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: FirstPieceApprovalDto,
  ) {
    return this.workOrdersService.firstPieceApproval(user.organizationId, dto, user.id);
  }
}
