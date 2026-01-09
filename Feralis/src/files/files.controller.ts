// =============================================================================
// FERALIS PLATFORM - FILES CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Response } from 'express';

import { FilesService, UploadedFile as UploadedFileType } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('Files')
@Controller('files')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @Permissions('files.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async upload(
    @UploadedFile() file: UploadedFileType,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @Body('documentType') documentType?: string,
    @Body('description') description?: string,
    @Body('revision') revision?: string,
    @Body('isCustomerVisible') isCustomerVisible?: boolean,
    @CurrentUser() currentUser?: any,
  ) {
    return this.filesService.upload(file, {
      entityType,
      entityId,
      organizationId: currentUser.organizationId,
      uploadedBy: currentUser.id,
      documentType,
      description,
      revision,
      isCustomerVisible: isCustomerVisible === true || isCustomerVisible === 'true' as any,
    });
  }

  @Get(':id/download')
  @Permissions('files.read')
  @ApiOperation({ summary: 'Download a file' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
    @CurrentUser() currentUser: any,
  ) {
    const { stream, file } = await this.filesService.download(
      id,
      currentUser.organizationId,
    );

    res.setHeader('Content-Type', file.fileType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.setHeader('Content-Length', file.fileSize.toString());

    stream.pipe(res);
  }

  @Get(':id/url')
  @Permissions('files.read')
  @ApiOperation({ summary: 'Get signed download URL' })
  @ApiResponse({ status: 200, description: 'URL generated successfully' })
  async getSignedUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('expirySeconds') expirySeconds: number,
    @CurrentUser() currentUser: any,
  ) {
    const url = await this.filesService.getSignedUrl(
      id,
      currentUser.organizationId,
      expirySeconds || 3600,
    );

    return { url };
  }

  @Get('entity/:entityType/:entityId')
  @Permissions('files.read')
  @ApiOperation({ summary: 'Get files for an entity' })
  @ApiResponse({ status: 200, description: 'Files retrieved successfully' })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.filesService.findByEntity(
      entityType,
      entityId,
      currentUser.organizationId,
    );
  }

  @Get(':id')
  @Permissions('files.read')
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiResponse({ status: 200, description: 'Metadata retrieved successfully' })
  async getMetadata(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.filesService.getMetadata(id, currentUser.organizationId);
  }

  @Delete(':id')
  @Permissions('files.delete')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.filesService.delete(id, currentUser.organizationId, currentUser.id);
    return { message: 'File deleted successfully' };
  }
}
