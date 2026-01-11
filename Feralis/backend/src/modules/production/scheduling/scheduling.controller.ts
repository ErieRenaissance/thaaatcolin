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
import { SchedulingService } from './scheduling.service';
import {
  CreateScheduleSlotDto,
  UpdateScheduleSlotDto,
  LockScheduleSlotDto,
  BulkScheduleDto,
  AutoScheduleDto,
  ScheduleQueryDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Production Scheduling')
@ApiBearerAuth()
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ==========================================================================
  // SCHEDULE SLOT CRUD
  // ==========================================================================

  @Post('slots')
  @RequirePermissions('production:scheduling:create')
  @ApiOperation({ summary: 'Create a schedule slot' })
  @ApiResponse({ status: 201, description: 'Slot created' })
  async createSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScheduleSlotDto,
  ) {
    return this.schedulingService.createSlot(user.organizationId, dto, user.id);
  }

  @Get('slots')
  @RequirePermissions('production:scheduling:read')
  @ApiOperation({ summary: 'List schedule slots' })
  @ApiResponse({ status: 200, description: 'Schedule slots list' })
  async findSlots(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ScheduleQueryDto,
  ) {
    return this.schedulingService.findSlots(user.organizationId, query);
  }

  @Patch('slots/:id')
  @RequirePermissions('production:scheduling:update')
  @ApiOperation({ summary: 'Update a schedule slot' })
  @ApiParam({ name: 'id', description: 'Schedule slot ID' })
  @ApiResponse({ status: 200, description: 'Slot updated' })
  async updateSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleSlotDto,
  ) {
    return this.schedulingService.updateSlot(user.organizationId, id, dto, user.id);
  }

  @Delete('slots/:id')
  @RequirePermissions('production:scheduling:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule slot' })
  @ApiParam({ name: 'id', description: 'Schedule slot ID' })
  @ApiResponse({ status: 204, description: 'Slot deleted' })
  async deleteSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulingService.deleteSlot(user.organizationId, id, user.id);
  }

  // ==========================================================================
  // SLOT LOCKING
  // ==========================================================================

  @Post('slots/:id/lock')
  @RequirePermissions('production:scheduling:update')
  @ApiOperation({ summary: 'Lock a schedule slot' })
  @ApiParam({ name: 'id', description: 'Schedule slot ID' })
  @ApiResponse({ status: 200, description: 'Slot locked' })
  async lockSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LockScheduleSlotDto,
  ) {
    return this.schedulingService.lockSlot(user.organizationId, id, dto, user.id);
  }

  @Post('slots/:id/unlock')
  @RequirePermissions('production:scheduling:update')
  @ApiOperation({ summary: 'Unlock a schedule slot' })
  @ApiParam({ name: 'id', description: 'Schedule slot ID' })
  @ApiResponse({ status: 200, description: 'Slot unlocked' })
  async unlockSlot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.schedulingService.unlockSlot(user.organizationId, id, user.id);
  }

  // ==========================================================================
  // BULK & AUTO SCHEDULING
  // ==========================================================================

  @Post('bulk')
  @RequirePermissions('production:scheduling:create')
  @ApiOperation({ summary: 'Schedule multiple operations on a machine' })
  @ApiResponse({ status: 201, description: 'Operations scheduled' })
  async bulkSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkScheduleDto,
  ) {
    return this.schedulingService.bulkSchedule(user.organizationId, dto, user.id);
  }

  @Post('auto')
  @RequirePermissions('production:scheduling:create')
  @ApiOperation({ summary: 'Auto-schedule operations' })
  @ApiResponse({ status: 201, description: 'Auto-scheduling complete' })
  async autoSchedule(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AutoScheduleDto,
  ) {
    return this.schedulingService.autoSchedule(user.organizationId, dto, user.id);
  }

  // ==========================================================================
  // CAPACITY VIEW
  // ==========================================================================

  @Get('capacity/machine/:machineId')
  @RequirePermissions('production:scheduling:read')
  @ApiOperation({ summary: 'Get machine capacity view' })
  @ApiParam({ name: 'machineId', description: 'Machine ID' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiResponse({ status: 200, description: 'Machine capacity data' })
  async getMachineCapacity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('machineId', ParseUUIDPipe) machineId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.schedulingService.getMachineCapacity(
      user.organizationId,
      machineId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get('capacity/summary')
  @RequirePermissions('production:scheduling:read')
  @ApiOperation({ summary: 'Get facility capacity summary' })
  @ApiQuery({ name: 'facilityId', required: true })
  @ApiQuery({ name: 'date', required: true })
  @ApiResponse({ status: 200, description: 'Capacity summary' })
  async getCapacitySummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('facilityId', ParseUUIDPipe) facilityId: string,
    @Query('date') date: string,
  ) {
    return this.schedulingService.getCapacitySummary(
      user.organizationId,
      facilityId,
      new Date(date),
    );
  }
}
