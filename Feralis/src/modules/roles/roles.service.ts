// =============================================================================
// FERALIS PLATFORM - ROLES SERVICE
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Role, Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    createRoleDto: CreateRoleDto,
    organizationId: string,
  ): Promise<Role> {
    // Check if code already exists
    const existingRole = await this.prisma.role.findFirst({
      where: {
        organizationId,
        code: createRoleDto.code.toUpperCase(),
      },
    });

    if (existingRole) {
      throw new ConflictException('A role with this code already exists');
    }

    const role = await this.prisma.role.create({
      data: {
        ...createRoleDto,
        organizationId,
        code: createRoleDto.code.toUpperCase(),
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return role;
  }

  async findAll(organizationId: string): Promise<Role[]> {
    return this.prisma.role.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: null, isSystem: true },
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            userRoles: true,
          },
        },
      },
      orderBy: [
        { isSystem: 'desc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string, organizationId: string): Promise<Role> {
    const role = await this.prisma.role.findFirst({
      where: {
        id,
        OR: [
          { organizationId },
          { organizationId: null, isSystem: true },
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async update(
    id: string,
    organizationId: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<Role> {
    const role = await this.findOne(id, organizationId);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    if (updateRoleDto.code && updateRoleDto.code !== role.code) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          organizationId,
          code: updateRoleDto.code.toUpperCase(),
          id: { not: id },
        },
      });

      if (existingRole) {
        throw new ConflictException('A role with this code already exists');
      }
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...updateRoleDto,
        code: updateRoleDto.code?.toUpperCase(),
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async remove(id: string, organizationId: string): Promise<void> {
    const role = await this.findOne(id, organizationId);

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is assigned to users
    const userCount = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (userCount > 0) {
      throw new ConflictException(
        `Cannot delete role assigned to ${userCount} users`,
      );
    }

    await this.prisma.role.delete({
      where: { id },
    });
  }

  async assignPermissions(
    roleId: string,
    organizationId: string,
    permissionIds: string[],
  ): Promise<Role> {
    const role = await this.findOne(roleId, organizationId);

    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system role permissions');
    }

    // Remove existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
      });
    }

    return this.findOne(roleId, organizationId);
  }
}
