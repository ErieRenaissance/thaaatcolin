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
import { WorkCentersService } from './work-centers.service';
import {
  CreateWorkCenterDto,
  UpdateWorkCenterDto,
  WorkCenterQueryDto,
  WorkCenterResponseDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Work Centers')
@ApiBearerAuth()
@Controller('work-centers')
export class WorkCentersController {
  constructor(private readonly workCentersService: WorkCentersService) {}

  @Post()
  @RequirePermissions('production:work-centers:create')
  @ApiOperation({ summary: 'Create a new work center' })
  @ApiResponse({ status: 201, description: 'Work center created', type: WorkCenterResponseDto })
  @ApiResponse({ status: 409, description: 'Work center code already exists' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWorkCenterDto,
  ): Promise<WorkCenterResponseDto> {
    return this.workCentersService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('production:work-centers:read')
  @ApiOperation({ summary: 'List all work centers' })
  @ApiResponse({ status: 200, description: 'Work centers list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkCenterQueryDto,
  ): Promise<{ data: WorkCenterResponseDto[]; total: number; page: number; limit: number }> {
    return this.workCentersService.findAll(user.organizationId, query);
  }

  @Get(':id')
  @RequirePermissions('production:work-centers:read')
  @ApiOperation({ summary: 'Get a work center by ID' })
  @ApiParam({ name: 'id', description: 'Work center ID' })
  @ApiResponse({ status: 200, description: 'Work center details', type: WorkCenterResponseDto })
  @ApiResponse({ status: 404, description: 'Work center not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkCenterResponseDto> {
    return this.workCentersService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('production:work-centers:update')
  @ApiOperation({ summary: 'Update a work center' })
  @ApiParam({ name: 'id', description: 'Work center ID' })
  @ApiResponse({ status: 200, description: 'Work center updated', type: WorkCenterResponseDto })
  @ApiResponse({ status: 404, description: 'Work center not found' })
  @ApiResponse({ status: 409, description: 'Work center code already exists' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkCenterDto,
  ): Promise<WorkCenterResponseDto> {
    return this.workCentersService.update(user.organizationId, id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('production:work-centers:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a work center' })
  @ApiParam({ name: 'id', description: 'Work center ID' })
  @ApiResponse({ status: 204, description: 'Work center deleted' })
  @ApiResponse({ status: 404, description: 'Work center not found' })
  @ApiResponse({ status: 409, description: 'Work center has dependencies' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.workCentersService.delete(user.organizationId, id, user.id);
  }

  @Get(':id/capacity')
  @RequirePermissions('production:work-centers:read')
  @ApiOperation({ summary: 'Get work center capacity and utilization' })
  @ApiParam({ name: 'id', description: 'Work center ID' })
  @ApiQuery({ name: 'fromDate', description: 'Start date', required: true })
  @ApiQuery({ name: 'toDate', description: 'End date', required: true })
  @ApiResponse({ status: 200, description: 'Capacity data' })
  async getCapacity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.workCentersService.getCapacity(
      user.organizationId,
      id,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get(':id/queue')
  @RequirePermissions('production:work-centers:read')
  @ApiOperation({ summary: 'Get work center queue (pending operations)' })
  @ApiParam({ name: 'id', description: 'Work center ID' })
  @ApiResponse({ status: 200, description: 'Queue data' })
  async getQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workCentersService.getQueue(user.organizationId, id);
  }
}
