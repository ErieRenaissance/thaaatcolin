// =============================================================================
// FERALIS PLATFORM - PERMISSIONS SERVICE
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Permission } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { isActive: true },
      orderBy: [
        { module: 'asc' },
        { action: 'asc' },
      ],
    });
  }

  async findByModule(module: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        module,
        isActive: true,
      },
      orderBy: { action: 'asc' },
    });
  }

  async getModules(): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: { isActive: true },
      select: { module: true },
      distinct: ['module'],
      orderBy: { module: 'asc' },
    });

    return permissions.map((p) => p.module);
  }

  async groupByModule(): Promise<Record<string, Permission[]>> {
    const permissions = await this.findAll();
    
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  }
}
