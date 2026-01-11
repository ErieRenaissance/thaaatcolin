import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NCRService } from './ncrs.service';
import {
  CreateNCRDto,
  UpdateNCRDto,
  DispositionNCRDto,
  RecordMRBDto,
  NCRQueryDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Quality - NCRs')
@ApiBearerAuth()
@Controller('quality/ncrs')
export class NCRController {
  constructor(private readonly ncrService: NCRService) {}

  @Post()
  @RequirePermissions('quality:ncrs:create')
  @ApiOperation({ summary: 'Create an NCR' })
  @ApiResponse({ status: 201, description: 'NCR created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateNCRDto,
  ) {
    return this.ncrService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('quality:ncrs:read')
  @ApiOperation({ summary: 'List NCRs' })
  @ApiResponse({ status: 200, description: 'NCRs list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: NCRQueryDto,
  ) {
    return this.ncrService.findAll(user.organizationId, query);
  }

  @Get('statistics')
  @RequirePermissions('quality:ncrs:read')
  @ApiOperation({ summary: 'Get NCR statistics' })
  @ApiResponse({ status: 200, description: 'NCR statistics' })
  async getStatistics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.ncrService.getStatistics(
      user.organizationId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get(':id')
  @RequirePermissions('quality:ncrs:read')
  @ApiOperation({ summary: 'Get NCR details' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'NCR details' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ncrService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('quality:ncrs:update')
  @ApiOperation({ summary: 'Update an NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'NCR updated' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateNCRDto,
  ) {
    return this.ncrService.update(user.organizationId, id, dto, user.id);
  }

  @Post(':id/disposition')
  @RequirePermissions('quality:ncrs:disposition')
  @ApiOperation({ summary: 'Disposition an NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'NCR dispositioned' })
  async disposition(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DispositionNCRDto,
  ) {
    return this.ncrService.disposition(user.organizationId, id, dto, user.id);
  }

  @Post(':id/send-to-mrb')
  @RequirePermissions('quality:ncrs:update')
  @ApiOperation({ summary: 'Send NCR to MRB' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'NCR sent to MRB' })
  async sendToMRB(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ncrService.sendToMRB(user.organizationId, id, user.id);
  }

  @Post(':id/record-mrb')
  @RequirePermissions('quality:ncrs:disposition')
  @ApiOperation({ summary: 'Record MRB decision' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'MRB recorded' })
  async recordMRB(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordMRBDto,
  ) {
    return this.ncrService.recordMRB(user.organizationId, id, dto, user.id);
  }

  @Post(':id/complete-rework')
  @RequirePermissions('quality:ncrs:update')
  @ApiOperation({ summary: 'Complete rework and close NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'Rework completed' })
  async completeRework(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
  ) {
    return this.ncrService.completeRework(user.organizationId, id, notes, user.id);
  }

  @Post(':id/close')
  @RequirePermissions('quality:ncrs:close')
  @ApiOperation({ summary: 'Close NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'NCR closed' })
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
  ) {
    return this.ncrService.close(user.organizationId, id, notes, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('quality:ncrs:update')
  @ApiOperation({ summary: 'Cancel NCR' })
  @ApiParam({ name: 'id', description: 'NCR ID' })
  @ApiResponse({ status: 200, description: 'NCR cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.ncrService.cancel(user.organizationId, id, reason, user.id);
  }
}
