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
import { InspectionsService } from './inspections.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  StartInspectionDto,
  CompleteInspectionDto,
  RecordInspectionResultDto,
  InspectionQueryDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Quality Inspections')
@ApiBearerAuth()
@Controller('quality/inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  @RequirePermissions('quality:inspections:create')
  @ApiOperation({ summary: 'Create an inspection' })
  @ApiResponse({ status: 201, description: 'Inspection created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInspectionDto,
  ) {
    return this.inspectionsService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('quality:inspections:read')
  @ApiOperation({ summary: 'List inspections' })
  @ApiResponse({ status: 200, description: 'Inspections list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InspectionQueryDto,
  ) {
    return this.inspectionsService.findAll(user.organizationId, query);
  }

  @Get('statistics')
  @RequirePermissions('quality:inspections:read')
  @ApiOperation({ summary: 'Get inspection statistics' })
  @ApiResponse({ status: 200, description: 'Inspection statistics' })
  async getStatistics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.inspectionsService.getStatistics(
      user.organizationId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get(':id')
  @RequirePermissions('quality:inspections:read')
  @ApiOperation({ summary: 'Get inspection details' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({ status: 200, description: 'Inspection details' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inspectionsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('quality:inspections:update')
  @ApiOperation({ summary: 'Update an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({ status: 200, description: 'Inspection updated' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInspectionDto,
  ) {
    return this.inspectionsService.update(user.organizationId, id, dto, user.id);
  }

  @Post(':id/start')
  @RequirePermissions('quality:inspections:execute')
  @ApiOperation({ summary: 'Start an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({ status: 200, description: 'Inspection started' })
  async start(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartInspectionDto,
  ) {
    return this.inspectionsService.start(user.organizationId, id, dto, user.id);
  }

  @Post(':id/results')
  @RequirePermissions('quality:inspections:execute')
  @ApiOperation({ summary: 'Record inspection result' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({ status: 201, description: 'Result recorded' })
  async recordResult(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordInspectionResultDto,
  ) {
    return this.inspectionsService.recordResult(user.organizationId, id, dto, user.id);
  }

  @Post(':id/complete')
  @RequirePermissions('quality:inspections:execute')
  @ApiOperation({ summary: 'Complete an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({ status: 200, description: 'Inspection completed' })
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteInspectionDto,
  ) {
    return this.inspectionsService.complete(user.organizationId, id, dto, user.id);
  }

  @Post(':id/approve')
  @RequirePermissions('quality:inspections:approve')
  @ApiOperation({ summary: 'Approve an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({ status: 200, description: 'Inspection approved' })
  async approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.inspectionsService.approve(user.organizationId, id, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('quality:inspections:update')
  @ApiOperation({ summary: 'Cancel an inspection' })
  @ApiParam({ name: 'id', description: 'Inspection ID' })
  @ApiResponse({ status: 200, description: 'Inspection cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.inspectionsService.cancel(user.organizationId, id, reason, user.id);
  }
}
