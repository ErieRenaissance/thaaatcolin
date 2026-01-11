// =============================================================================
// FERALIS PLATFORM - FILES SERVICE
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileAttachment } from '@prisma/client';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import * as path from 'path';

import { PrismaService } from '@/common/prisma/prisma.service';

export interface UploadFileDto {
  entityType: string;
  entityId: string;
  organizationId: string;
  uploadedBy: string;
  documentType?: string;
  description?: string;
  revision?: string;
  isCustomerVisible?: boolean;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  private readonly minioClient: Minio.Client;
  private readonly defaultBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get<string>('storage.endpoint'),
      port: this.configService.get<number>('storage.port'),
      useSSL: this.configService.get<boolean>('storage.useSSL'),
      accessKey: this.configService.get<string>('storage.accessKey'),
      secretKey: this.configService.get<string>('storage.secretKey'),
    });

    this.defaultBucket = this.configService.get<string>('storage.buckets.files');
  }

  async upload(
    file: UploadedFile,
    dto: UploadFileDto,
    bucket?: string,
  ): Promise<FileAttachment> {
    const targetBucket = bucket || this.defaultBucket;
    
    // Generate unique file path
    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileId = crypto.randomUUID();
    const storagePath = `${dto.organizationId}/${dto.entityType}/${dto.entityId}/${fileId}${fileExt}`;

    // Calculate checksum
    const checksum = crypto
      .createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    // Upload to MinIO
    await this.minioClient.putObject(
      targetBucket,
      storagePath,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
        'x-amz-meta-original-name': encodeURIComponent(file.originalname),
        'x-amz-meta-checksum': checksum,
      },
    );

    // Create database record
    const fileAttachment = await this.prisma.fileAttachment.create({
      data: {
        organizationId: dto.organizationId,
        entityType: dto.entityType,
        entityId: dto.entityId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: BigInt(file.size),
        fileExtension: fileExt.replace('.', ''),
        storagePath,
        storageBucket: targetBucket,
        documentType: dto.documentType,
        description: dto.description,
        revision: dto.revision,
        isCustomerVisible: dto.isCustomerVisible || false,
        checksum,
        uploadedBy: dto.uploadedBy,
      },
    });

    return fileAttachment;
  }

  async download(
    fileId: string,
    organizationId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; file: FileAttachment }> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: {
        id: fileId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    const stream = await this.minioClient.getObject(
      file.storageBucket,
      file.storagePath,
    );

    return { stream, file };
  }

  async getSignedUrl(
    fileId: string,
    organizationId: string,
    expirySeconds = 3600,
  ): Promise<string> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: {
        id: fileId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return this.minioClient.presignedGetObject(
      file.storageBucket,
      file.storagePath,
      expirySeconds,
    );
  }

  async findByEntity(
    entityType: string,
    entityId: string,
    organizationId: string,
  ): Promise<FileAttachment[]> {
    return this.prisma.fileAttachment.findMany({
      where: {
        entityType,
        entityId,
        organizationId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(
    fileId: string,
    organizationId: string,
    deletedBy: string,
  ): Promise<void> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: {
        id: fileId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Soft delete in database
    await this.prisma.fileAttachment.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    // Note: Physical deletion from MinIO can be done via a cleanup job
  }

  async getMetadata(
    fileId: string,
    organizationId: string,
  ): Promise<FileAttachment> {
    const file = await this.prisma.fileAttachment.findFirst({
      where: {
        id: fileId,
        organizationId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    return file;
  }
}
