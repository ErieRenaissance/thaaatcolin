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
import { LaborService } from './labor.service';
import {
  StartLaborEntryDto,
  EndLaborEntryDto,
  CreateManualLaborEntryDto,
  UpdateLaborEntryDto,
  LaborEntryQueryDto,
  CreateScrapRecordDto,
  UpdateScrapRecordDto,
  ScrapRecordQueryDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Labor Tracking')
@ApiBearerAuth()
@Controller('labor')
export class LaborController {
  constructor(private readonly laborService: LaborService) {}

  // ==========================================================================
  // LABOR CLOCK IN/OUT
  // ==========================================================================

  @Post('clock-in')
  @RequirePermissions('production:labor:clock')
  @ApiOperation({ summary: 'Clock in to operation' })
  @ApiResponse({ status: 201, description: 'Clocked in' })
  async clockIn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartLaborEntryDto,
  ) {
    return this.laborService.startLaborEntry(user.organizationId, dto, user.id);
  }

  @Post('clock-out/:id')
  @RequirePermissions('production:labor:clock')
  @ApiOperation({ summary: 'Clock out from operation' })
  @ApiParam({ name: 'id', description: 'Labor entry ID' })
  @ApiResponse({ status: 200, description: 'Clocked out' })
  async clockOut(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndLaborEntryDto,
  ) {
    return this.laborService.endLaborEntry(user.organizationId, id, dto, user.id);
  }

  @Get('active')
  @RequirePermissions('production:labor:read')
  @ApiOperation({ summary: 'Get current active labor entry for user' })
  @ApiResponse({ status: 200, description: 'Active entry or null' })
  async getActive(@CurrentUser() user: AuthenticatedUser) {
    return this.laborService.getActiveEntry(user.organizationId, user.id);
  }

  // ==========================================================================
  // LABOR ENTRY MANAGEMENT
  // ==========================================================================

  @Get()
  @RequirePermissions('production:labor:read')
  @ApiOperation({ summary: 'List labor entries' })
  @ApiResponse({ status: 200, description: 'Labor entries list' })
  async findEntries(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: LaborEntryQueryDto,
  ) {
    return this.laborService.findEntries(user.organizationId, query);
  }

  @Post('manual')
  @RequirePermissions('production:labor:create')
  @ApiOperation({ summary: 'Create manual labor entry' })
  @ApiResponse({ status: 201, description: 'Entry created' })
  async createManual(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateManualLaborEntryDto,
  ) {
    return this.laborService.createManualEntry(user.organizationId, dto, user.id);
  }

  @Patch(':id')
  @RequirePermissions('production:labor:update')
  @ApiOperation({ summary: 'Update labor entry' })
  @ApiParam({ name: 'id', description: 'Labor entry ID' })
  @ApiResponse({ status: 200, description: 'Entry updated' })
  async updateEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLaborEntryDto,
  ) {
    return this.laborService.updateEntry(user.organizationId, id, dto, user.id);
  }

  @Delete(':id')
  @RequirePermissions('production:labor:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete labor entry' })
  @ApiParam({ name: 'id', description: 'Labor entry ID' })
  @ApiResponse({ status: 204, description: 'Entry deleted' })
  async deleteEntry(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.laborService.deleteEntry(user.organizationId, id, user.id);
  }

  // ==========================================================================
  // LABOR ANALYTICS
  // ==========================================================================

  @Get('work-order/:workOrderId/summary')
  @RequirePermissions('production:labor:read')
  @ApiOperation({ summary: 'Get labor summary for work order' })
  @ApiParam({ name: 'workOrderId', description: 'Work order ID' })
  @ApiResponse({ status: 200, description: 'Labor summary' })
  async getWorkOrderSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workOrderId', ParseUUIDPipe) workOrderId: string,
  ) {
    return this.laborService.getWorkOrderLaborSummary(user.organizationId, workOrderId);
  }

  @Get('operator/:operatorId/efficiency')
  @RequirePermissions('production:labor:read')
  @ApiOperation({ summary: 'Get operator efficiency metrics' })
  @ApiParam({ name: 'operatorId', description: 'Operator user ID' })
  @ApiQuery({ name: 'fromDate', required: true })
  @ApiQuery({ name: 'toDate', required: true })
  @ApiResponse({ status: 200, description: 'Efficiency metrics' })
  async getOperatorEfficiency(
    @CurrentUser() user: AuthenticatedUser,
    @Param('operatorId', ParseUUIDPipe) operatorId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.laborService.getOperatorEfficiency(
      user.organizationId,
      operatorId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  // ==========================================================================
  // SCRAP RECORDS
  // ==========================================================================

  @Get('scrap')
  @RequirePermissions('production:scrap:read')
  @ApiOperation({ summary: 'List scrap records' })
  @ApiResponse({ status: 200, description: 'Scrap records list' })
  async findScrap(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ScrapRecordQueryDto,
  ) {
    return this.laborService.findScrapRecords(user.organizationId, query);
  }

  @Post('scrap')
  @RequirePermissions('production:scrap:create')
  @ApiOperation({ summary: 'Create scrap record' })
  @ApiResponse({ status: 201, description: 'Scrap record created' })
  async createScrap(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateScrapRecordDto,
  ) {
    return this.laborService.createScrapRecord(user.organizationId, dto, user.id);
  }

  @Patch('scrap/:id')
  @RequirePermissions('production:scrap:update')
  @ApiOperation({ summary: 'Update scrap record (add analysis)' })
  @ApiParam({ name: 'id', description: 'Scrap record ID' })
  @ApiResponse({ status: 200, description: 'Scrap record updated' })
  async updateScrap(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScrapRecordDto,
  ) {
    return this.laborService.updateScrapRecord(user.organizationId, id, dto, user.id);
  }
}
