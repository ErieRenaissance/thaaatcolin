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
import { MachinesService } from './machines.service';
import {
  CreateMachineDto,
  UpdateMachineDto,
  UpdateMachineStatusDto,
  MachineQueryDto,
  CreateMachineAlarmDto,
  AcknowledgeAlarmDto,
  MachineAlarmQueryDto,
  CreateMaintenanceDto,
  CompleteMaintenanceDto,
  MaintenanceStatus,
  CreateDowntimeDto,
  EndDowntimeDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Machines')
@ApiBearerAuth()
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  // ==========================================================================
  // MACHINE CRUD
  // ==========================================================================

  @Post()
  @RequirePermissions('production:machines:create')
  @ApiOperation({ summary: 'Create a new machine' })
  @ApiResponse({ status: 201, description: 'Machine created' })
  @ApiResponse({ status: 409, description: 'Machine code already exists' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMachineDto,
  ) {
    return this.machinesService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('production:machines:read')
  @ApiOperation({ summary: 'List all machines' })
  @ApiResponse({ status: 200, description: 'Machines list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MachineQueryDto,
  ) {
    return this.machinesService.findAll(user.organizationId, query);
  }

  @Get('floor-status')
  @RequirePermissions('production:machines:read')
  @ApiOperation({ summary: 'Get shop floor machine status overview' })
  @ApiQuery({ name: 'facilityId', required: false })
  @ApiResponse({ status: 200, description: 'Floor status data' })
  async getFloorStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.machinesService.getFloorStatus(user.organizationId, facilityId);
  }

  @Get('alarms')
  @RequirePermissions('production:machines:read')
  @ApiOperation({ summary: 'Get machine alarms' })
  @ApiResponse({ status: 200, description: 'Alarms list' })
  async getAlarms(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MachineAlarmQueryDto,
  ) {
    return this.machinesService.getAlarms(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('production:machines:read')
  @ApiOperation({ summary: 'Get a machine by ID' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Machine details' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.machinesService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('production:machines:update')
  @ApiOperation({ summary: 'Update a machine' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Machine updated' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMachineDto,
  ) {
    return this.machinesService.update(user.organizationId, id, dto, user.id);
  }

  @Patch(':id/status')
  @RequirePermissions('production:machines:operate')
  @ApiOperation({ summary: 'Update machine status' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMachineStatusDto,
  ) {
    return this.machinesService.updateStatus(user.organizationId, id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('production:machines:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a machine' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 204, description: 'Machine deleted' })
  @ApiResponse({ status: 404, description: 'Machine not found' })
  @ApiResponse({ status: 409, description: 'Machine has dependencies' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.machinesService.delete(user.organizationId, id, user.id);
  }

  // ==========================================================================
  // MACHINE OEE
  // ==========================================================================

  @Get(':id/oee')
  @RequirePermissions('production:machines:read')
  @ApiOperation({ summary: 'Get machine OEE metrics' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiResponse({ status: 200, description: 'OEE metrics' })
  async getOEE(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.machinesService.getOEE(
      user.organizationId,
      id,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  // ==========================================================================
  // MACHINE ALARMS
  // ==========================================================================

  @Post(':id/alarms')
  @RequirePermissions('production:machines:operate')
  @ApiOperation({ summary: 'Create a machine alarm' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 201, description: 'Alarm created' })
  async createAlarm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<CreateMachineAlarmDto, 'machineId'>,
  ) {
    return this.machinesService.createAlarm(
      user.organizationId,
      { ...dto, machineId: id },
      user.id,
    );
  }

  @Patch('alarms/:alarmId/acknowledge')
  @RequirePermissions('production:machines:operate')
  @ApiOperation({ summary: 'Acknowledge an alarm' })
  @ApiParam({ name: 'alarmId', description: 'Alarm ID' })
  @ApiResponse({ status: 200, description: 'Alarm acknowledged' })
  async acknowledgeAlarm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('alarmId', ParseUUIDPipe) alarmId: string,
    @Body() dto: AcknowledgeAlarmDto,
  ) {
    return this.machinesService.acknowledgeAlarm(
      user.organizationId,
      alarmId,
      dto,
      user.id,
    );
  }

  @Patch('alarms/:alarmId/clear')
  @RequirePermissions('production:machines:operate')
  @ApiOperation({ summary: 'Clear an alarm' })
  @ApiParam({ name: 'alarmId', description: 'Alarm ID' })
  @ApiResponse({ status: 200, description: 'Alarm cleared' })
  async clearAlarm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('alarmId', ParseUUIDPipe) alarmId: string,
  ) {
    return this.machinesService.clearAlarm(user.organizationId, alarmId, user.id);
  }

  // ==========================================================================
  // MACHINE MAINTENANCE
  // ==========================================================================

  @Post(':id/maintenance')
  @RequirePermissions('production:maintenance:create')
  @ApiOperation({ summary: 'Schedule maintenance' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 201, description: 'Maintenance scheduled' })
  async createMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<CreateMaintenanceDto, 'machineId'>,
  ) {
    return this.machinesService.createMaintenance(
      user.organizationId,
      { ...dto, machineId: id },
      user.id,
    );
  }

  @Get(':id/maintenance')
  @RequirePermissions('production:maintenance:read')
  @ApiOperation({ summary: 'Get machine maintenance records' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiQuery({ name: 'status', enum: MaintenanceStatus, required: false })
  @ApiResponse({ status: 200, description: 'Maintenance records' })
  async getMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: MaintenanceStatus,
  ) {
    return this.machinesService.getMaintenance(user.organizationId, id, status);
  }

  @Patch('maintenance/:maintenanceId/start')
  @RequirePermissions('production:maintenance:execute')
  @ApiOperation({ summary: 'Start maintenance' })
  @ApiParam({ name: 'maintenanceId', description: 'Maintenance ID' })
  @ApiResponse({ status: 200, description: 'Maintenance started' })
  async startMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
  ) {
    return this.machinesService.startMaintenance(
      user.organizationId,
      maintenanceId,
      user.id,
    );
  }

  @Patch('maintenance/:maintenanceId/complete')
  @RequirePermissions('production:maintenance:execute')
  @ApiOperation({ summary: 'Complete maintenance' })
  @ApiParam({ name: 'maintenanceId', description: 'Maintenance ID' })
  @ApiResponse({ status: 200, description: 'Maintenance completed' })
  async completeMaintenance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('maintenanceId', ParseUUIDPipe) maintenanceId: string,
    @Body() dto: CompleteMaintenanceDto,
  ) {
    return this.machinesService.completeMaintenance(
      user.organizationId,
      maintenanceId,
      dto,
      user.id,
    );
  }

  // ==========================================================================
  // MACHINE DOWNTIME
  // ==========================================================================

  @Post(':id/downtime')
  @RequirePermissions('production:machines:operate')
  @ApiOperation({ summary: 'Start downtime tracking' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiResponse({ status: 201, description: 'Downtime tracking started' })
  async startDowntime(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Omit<CreateDowntimeDto, 'machineId'>,
  ) {
    return this.machinesService.startDowntime(
      user.organizationId,
      { ...dto, machineId: id },
      user.id,
    );
  }

  @Get(':id/downtime')
  @RequirePermissions('production:machines:read')
  @ApiOperation({ summary: 'Get machine downtime records' })
  @ApiParam({ name: 'id', description: 'Machine ID' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiResponse({ status: 200, description: 'Downtime records' })
  async getDowntime(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.machinesService.getDowntime(
      user.organizationId,
      id,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Patch('downtime/:downtimeId/end')
  @RequirePermissions('production:machines:operate')
  @ApiOperation({ summary: 'End downtime tracking' })
  @ApiParam({ name: 'downtimeId', description: 'Downtime record ID' })
  @ApiResponse({ status: 200, description: 'Downtime ended' })
  async endDowntime(
    @CurrentUser() user: AuthenticatedUser,
    @Param('downtimeId', ParseUUIDPipe) downtimeId: string,
    @Body() dto: EndDowntimeDto,
  ) {
    return this.machinesService.endDowntime(
      user.organizationId,
      downtimeId,
      dto,
      user.id,
    );
  }
}
