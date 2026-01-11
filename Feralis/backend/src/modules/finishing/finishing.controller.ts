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
import { FinishingService } from './finishing.service';
import {
  CreateFinishingProcessDto,
  UpdateFinishingProcessDto,
  FinishingProcessQueryDto,
  CreateFinishingJobDto,
  UpdateFinishingJobDto,
  StartFinishingJobDto,
  CompleteFinishingJobDto,
  ShipToVendorDto,
  ReceiveFromVendorDto,
  FinishingJobQueryDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Finishing')
@ApiBearerAuth()
@Controller('finishing')
export class FinishingController {
  constructor(private readonly finishingService: FinishingService) {}

  // ==========================================================================
  // FINISHING PROCESSES
  // ==========================================================================

  @Post('processes')
  @RequirePermissions('finishing:processes:create')
  @ApiOperation({ summary: 'Create a finishing process' })
  @ApiResponse({ status: 201, description: 'Process created' })
  async createProcess(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFinishingProcessDto,
  ) {
    return this.finishingService.createProcess(user.organizationId, dto, user.id);
  }

  @Get('processes')
  @RequirePermissions('finishing:processes:read')
  @ApiOperation({ summary: 'List finishing processes' })
  @ApiResponse({ status: 200, description: 'Processes list' })
  async findAllProcesses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinishingProcessQueryDto,
  ) {
    return this.finishingService.findAllProcesses(user.organizationId, query);
  }

  @Get('processes/:id')
  @RequirePermissions('finishing:processes:read')
  @ApiOperation({ summary: 'Get finishing process details' })
  @ApiParam({ name: 'id', description: 'Process ID' })
  @ApiResponse({ status: 200, description: 'Process details' })
  async findOneProcess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finishingService.findOneProcess(user.organizationId, id);
  }

  @Patch('processes/:id')
  @RequirePermissions('finishing:processes:update')
  @ApiOperation({ summary: 'Update a finishing process' })
  @ApiParam({ name: 'id', description: 'Process ID' })
  @ApiResponse({ status: 200, description: 'Process updated' })
  async updateProcess(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinishingProcessDto,
  ) {
    return this.finishingService.updateProcess(user.organizationId, id, dto);
  }

  // ==========================================================================
  // FINISHING JOBS
  // ==========================================================================

  @Post('jobs')
  @RequirePermissions('finishing:jobs:create')
  @ApiOperation({ summary: 'Create a finishing job' })
  @ApiResponse({ status: 201, description: 'Job created' })
  async createJob(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateFinishingJobDto,
  ) {
    return this.finishingService.createJob(user.organizationId, dto, user.id);
  }

  @Get('jobs')
  @RequirePermissions('finishing:jobs:read')
  @ApiOperation({ summary: 'List finishing jobs' })
  @ApiResponse({ status: 200, description: 'Jobs list' })
  async findAllJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: FinishingJobQueryDto,
  ) {
    return this.finishingService.findAllJobs(user.organizationId, query);
  }

  @Get('queue')
  @RequirePermissions('finishing:jobs:read')
  @ApiOperation({ summary: 'Get finishing queue' })
  @ApiResponse({ status: 200, description: 'Finishing queue' })
  async getQueue(
    @CurrentUser() user: AuthenticatedUser,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.finishingService.getQueue(user.organizationId, facilityId);
  }

  @Get('jobs/:id')
  @RequirePermissions('finishing:jobs:read')
  @ApiOperation({ summary: 'Get finishing job details' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job details' })
  async findOneJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.finishingService.findOneJob(user.organizationId, id);
  }

  @Patch('jobs/:id')
  @RequirePermissions('finishing:jobs:update')
  @ApiOperation({ summary: 'Update a finishing job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job updated' })
  async updateJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinishingJobDto,
  ) {
    return this.finishingService.updateJob(user.organizationId, id, dto, user.id);
  }

  @Post('jobs/:id/start')
  @RequirePermissions('finishing:jobs:execute')
  @ApiOperation({ summary: 'Start a finishing job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job started' })
  async startJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartFinishingJobDto,
  ) {
    return this.finishingService.startJob(user.organizationId, id, dto, user.id);
  }

  @Post('jobs/:id/complete')
  @RequirePermissions('finishing:jobs:execute')
  @ApiOperation({ summary: 'Complete a finishing job' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Job completed' })
  async completeJob(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteFinishingJobDto,
  ) {
    return this.finishingService.completeJob(user.organizationId, id, dto, user.id);
  }

  @Post('jobs/:id/ship-to-vendor')
  @RequirePermissions('finishing:jobs:execute')
  @ApiOperation({ summary: 'Ship job to vendor' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Shipped to vendor' })
  async shipToVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ShipToVendorDto,
  ) {
    return this.finishingService.shipToVendor(user.organizationId, id, dto, user.id);
  }

  @Post('jobs/:id/receive-from-vendor')
  @RequirePermissions('finishing:jobs:execute')
  @ApiOperation({ summary: 'Receive job from vendor' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: 200, description: 'Received from vendor' })
  async receiveFromVendor(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiveFromVendorDto,
  ) {
    return this.finishingService.receiveFromVendor(user.organizationId, id, dto, user.id);
  }
}
