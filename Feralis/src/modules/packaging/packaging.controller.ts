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
import { PackagingService } from './packaging.service';
import {
  CreatePackageSpecDto,
  UpdatePackageSpecDto,
  PackageSpecQueryDto,
  CreatePartPackagingDto,
  CreatePackageDto,
  UpdatePackageDto,
  SealPackageDto,
  AddPackageContentDto,
  PackageQueryDto,
} from './dto';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

@ApiTags('Packaging')
@ApiBearerAuth()
@Controller('packaging')
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  // ==========================================================================
  // PACKAGE SPECIFICATIONS
  // ==========================================================================

  @Post('specs')
  @RequirePermissions('packaging:specs:create')
  @ApiOperation({ summary: 'Create a package specification' })
  @ApiResponse({ status: 201, description: 'Spec created' })
  async createSpec(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePackageSpecDto,
  ) {
    return this.packagingService.createSpec(user.organizationId, dto);
  }

  @Get('specs')
  @RequirePermissions('packaging:specs:read')
  @ApiOperation({ summary: 'List package specifications' })
  @ApiResponse({ status: 200, description: 'Specs list' })
  async findAllSpecs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PackageSpecQueryDto,
  ) {
    return this.packagingService.findAllSpecs(user.organizationId, query);
  }

  @Get('specs/:id')
  @RequirePermissions('packaging:specs:read')
  @ApiOperation({ summary: 'Get package specification details' })
  @ApiParam({ name: 'id', description: 'Spec ID' })
  @ApiResponse({ status: 200, description: 'Spec details' })
  async findOneSpec(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.packagingService.findOneSpec(user.organizationId, id);
  }

  @Patch('specs/:id')
  @RequirePermissions('packaging:specs:update')
  @ApiOperation({ summary: 'Update a package specification' })
  @ApiParam({ name: 'id', description: 'Spec ID' })
  @ApiResponse({ status: 200, description: 'Spec updated' })
  async updateSpec(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePackageSpecDto,
  ) {
    return this.packagingService.updateSpec(user.organizationId, id, dto);
  }

  // ==========================================================================
  // PART PACKAGING
  // ==========================================================================

  @Post('part-packaging')
  @RequirePermissions('packaging:parts:create')
  @ApiOperation({ summary: 'Create part packaging configuration' })
  @ApiResponse({ status: 201, description: 'Part packaging created' })
  async createPartPackaging(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePartPackagingDto,
  ) {
    return this.packagingService.createPartPackaging(user.organizationId, dto);
  }

  @Get('part-packaging/:partId')
  @RequirePermissions('packaging:parts:read')
  @ApiOperation({ summary: 'Get part packaging configuration' })
  @ApiParam({ name: 'partId', description: 'Part ID' })
  @ApiResponse({ status: 200, description: 'Part packaging config' })
  async findPartPackaging(
    @CurrentUser() user: AuthenticatedUser,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.packagingService.findPartPackaging(user.organizationId, partId, customerId);
  }

  // ==========================================================================
  // PACKAGES
  // ==========================================================================

  @Post()
  @RequirePermissions('packaging:packages:create')
  @ApiOperation({ summary: 'Create a package' })
  @ApiResponse({ status: 201, description: 'Package created' })
  async createPackage(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePackageDto,
  ) {
    return this.packagingService.createPackage(user.organizationId, dto, user.id);
  }

  @Get()
  @RequirePermissions('packaging:packages:read')
  @ApiOperation({ summary: 'List packages' })
  @ApiResponse({ status: 200, description: 'Packages list' })
  async findAllPackages(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PackageQueryDto,
  ) {
    return this.packagingService.findAllPackages(user.organizationId, query);
  }

  @Get('staged')
  @RequirePermissions('packaging:packages:read')
  @ApiOperation({ summary: 'Get staged packages ready for shipment' })
  @ApiResponse({ status: 200, description: 'Staged packages' })
  async getStagedPackages(
    @CurrentUser() user: AuthenticatedUser,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.packagingService.getStagedPackages(user.organizationId, facilityId);
  }

  @Get(':id')
  @RequirePermissions('packaging:packages:read')
  @ApiOperation({ summary: 'Get package details' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package details' })
  async findOnePackage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.packagingService.findOnePackage(user.organizationId, id);
  }

  @Post(':id/contents')
  @RequirePermissions('packaging:packages:pack')
  @ApiOperation({ summary: 'Add content to package' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 201, description: 'Content added' })
  async addContent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPackageContentDto,
  ) {
    return this.packagingService.addContent(user.organizationId, id, dto, user.id);
  }

  @Delete(':id/contents/:contentId')
  @RequirePermissions('packaging:packages:pack')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove content from package' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiParam({ name: 'contentId', description: 'Content ID' })
  @ApiResponse({ status: 204, description: 'Content removed' })
  async removeContent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contentId', ParseUUIDPipe) contentId: string,
  ) {
    return this.packagingService.removeContent(user.organizationId, id, contentId);
  }

  @Post(':id/seal')
  @RequirePermissions('packaging:packages:pack')
  @ApiOperation({ summary: 'Seal a package' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package sealed' })
  async sealPackage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SealPackageDto,
  ) {
    return this.packagingService.sealPackage(user.organizationId, id, dto, user.id);
  }

  @Post(':id/label')
  @RequirePermissions('packaging:packages:pack')
  @ApiOperation({ summary: 'Label a package' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package labeled' })
  async labelPackage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('barcode') barcode: string,
  ) {
    return this.packagingService.labelPackage(user.organizationId, id, barcode, user.id);
  }

  @Post(':id/stage')
  @RequirePermissions('packaging:packages:pack')
  @ApiOperation({ summary: 'Stage package for shipment' })
  @ApiParam({ name: 'id', description: 'Package ID' })
  @ApiResponse({ status: 200, description: 'Package staged' })
  async stagePackage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.packagingService.stagePackage(user.organizationId, id, user.id);
  }
}
