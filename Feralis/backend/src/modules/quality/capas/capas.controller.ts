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
import { CAPAService } from './capas.service';
import {
  CreateCAPADto,
  UpdateCAPADto,
  VerifyCAPADto,
  CAPAQueryDto,
} from '../dto';
import { CurrentUser, RequirePermissions } from '../../auth/decorators';
import { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';

@ApiTags('Quality - CAPAs')
@ApiBearerAuth()
@Controller('quality/capas')
export class CAPAController {
  constructor(private readonly capaService: CAPAService) {}

  @Post()
  @RequirePermissions('quality:capas:create')
  @ApiOperation({ summary: 'Create a CAPA' })
  @ApiResponse({ status: 201, description: 'CAPA created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCAPADto,
  ) {
    return this.capaService.create(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('quality:capas:read')
  @ApiOperation({ summary: 'List CAPAs' })
  @ApiResponse({ status: 200, description: 'CAPAs list' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: CAPAQueryDto,
  ) {
    return this.capaService.findAll(user.organizationId, query);
  }

  @Get('statistics')
  @RequirePermissions('quality:capas:read')
  @ApiOperation({ summary: 'Get CAPA statistics' })
  @ApiResponse({ status: 200, description: 'CAPA statistics' })
  async getStatistics(
    @CurrentUser() user: AuthenticatedUser,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.capaService.getStatistics(
      user.organizationId,
      new Date(fromDate),
      new Date(toDate),
    );
  }

  @Get(':id')
  @RequirePermissions('quality:capas:read')
  @ApiOperation({ summary: 'Get CAPA details' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'CAPA details' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.capaService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @RequirePermissions('quality:capas:update')
  @ApiOperation({ summary: 'Update a CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'CAPA updated' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCAPADto,
  ) {
    return this.capaService.update(user.organizationId, id, dto, user.id);
  }

  @Post(':id/open')
  @RequirePermissions('quality:capas:update')
  @ApiOperation({ summary: 'Open CAPA (submit from draft)' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'CAPA opened' })
  async open(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.capaService.open(user.organizationId, id, user.id);
  }

  @Post(':id/start')
  @RequirePermissions('quality:capas:execute')
  @ApiOperation({ summary: 'Start working on CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'CAPA started' })
  async startWork(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.capaService.startWork(user.organizationId, id, user.id);
  }

  @Post(':id/complete-actions')
  @RequirePermissions('quality:capas:execute')
  @ApiOperation({ summary: 'Complete CAPA actions' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'Actions completed' })
  async completeActions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { correctiveAction?: string; preventiveAction?: string },
  ) {
    return this.capaService.completeActions(user.organizationId, id, dto, user.id);
  }

  @Post(':id/verify')
  @RequirePermissions('quality:capas:verify')
  @ApiOperation({ summary: 'Verify CAPA effectiveness' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'CAPA verified' })
  async verify(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyCAPADto,
  ) {
    return this.capaService.verify(user.organizationId, id, dto, user.id);
  }

  @Post(':id/close')
  @RequirePermissions('quality:capas:close')
  @ApiOperation({ summary: 'Close CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'CAPA closed' })
  async close(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
  ) {
    return this.capaService.close(user.organizationId, id, notes, user.id);
  }

  @Post(':id/cancel')
  @RequirePermissions('quality:capas:update')
  @ApiOperation({ summary: 'Cancel CAPA' })
  @ApiParam({ name: 'id', description: 'CAPA ID' })
  @ApiResponse({ status: 200, description: 'CAPA cancelled' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
  ) {
    return this.capaService.cancel(user.organizationId, id, reason, user.id);
  }
}
