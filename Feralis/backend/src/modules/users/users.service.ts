// =============================================================================
// FERALIS PLATFORM - USERS SERVICE
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma, User, UserStatus } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

export interface PaginatedUsers {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // Create User
  // ===========================================================================

  async create(
    createUserDto: CreateUserDto,
    organizationId: string,
    createdBy?: string,
  ): Promise<User> {
    // Check if email already exists in organization
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: createUserDto.email.toLowerCase(),
        organizationId,
        deletedAt: null,
      },
    });

    if (existingUser) {
      throw new ConflictException('A user with this email already exists');
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: createUserDto.email.toLowerCase(),
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        displayName: createUserDto.displayName,
        phone: createUserDto.phone,
        mobile: createUserDto.mobile,
        jobTitle: createUserDto.jobTitle,
        department: createUserDto.department,
        employeeId: createUserDto.employeeId,
        managerId: createUserDto.managerId,
        userType: createUserDto.userType,
        defaultFacilityId: createUserDto.defaultFacilityId,
        timezone: createUserDto.timezone,
        locale: createUserDto.locale || 'en-US',
        status: UserStatus.PENDING,
        createdBy,
      },
      include: {
        organization: true,
        defaultFacility: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return user;
  }

  // ===========================================================================
  // Find All Users
  // ===========================================================================

  async findAll(
    organizationId: string,
    query: QueryUsersDto,
  ): Promise<PaginatedUsers> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      userType,
      department,
      facilityId,
      managerId,
      sortBy = 'lastName',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      organizationId,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (userType) {
      where.userType = userType;
    }

    if (department) {
      where.department = department;
    }

    if (facilityId) {
      where.defaultFacilityId = facilityId;
    }

    if (managerId) {
      where.managerId = managerId;
    }

    // Build order by
    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // Execute queries
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          defaultFacility: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          userRoles: {
            include: {
              role: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  // ===========================================================================
  // Find One User
  // ===========================================================================

  async findOne(id: string, organizationId: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        organization: true,
        defaultFacility: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        directReports: {
          where: { deletedAt: null },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            jobTitle: true,
          },
        },
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
            facility: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // ===========================================================================
  // Find by Email
  // ===========================================================================

  async findByEmail(email: string, organizationId?: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        ...(organizationId && { organizationId }),
        deletedAt: null,
      },
      include: {
        organization: true,
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // ===========================================================================
  // Update User
  // ===========================================================================

  async update(
    id: string,
    organizationId: string,
    updateUserDto: UpdateUserDto,
    updatedBy?: string,
  ): Promise<User> {
    const user = await this.findOne(id, organizationId);

    // Check email uniqueness if being changed
    if (updateUserDto.email && updateUserDto.email.toLowerCase() !== user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateUserDto.email.toLowerCase(),
          organizationId,
          id: { not: id },
          deletedAt: null,
        },
      });

      if (existingUser) {
        throw new ConflictException('A user with this email already exists');
      }
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        email: updateUserDto.email?.toLowerCase(),
        updatedBy,
      },
      include: {
        organization: true,
        defaultFacility: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return updatedUser;
  }

  // ===========================================================================
  // Delete User (Soft Delete)
  // ===========================================================================

  async remove(id: string, organizationId: string, deletedBy?: string): Promise<void> {
    const user = await this.findOne(id, organizationId);

    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
        status: UserStatus.INACTIVE,
      },
    });
  }

  // ===========================================================================
  // Activate User
  // ===========================================================================

  async activate(id: string, organizationId: string, updatedBy?: string): Promise<User> {
    const user = await this.findOne(id, organizationId);

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.ACTIVE,
        updatedBy,
      },
    });
  }

  // ===========================================================================
  // Deactivate User
  // ===========================================================================

  async deactivate(id: string, organizationId: string, updatedBy?: string): Promise<User> {
    const user = await this.findOne(id, organizationId);

    if (user.status === UserStatus.INACTIVE) {
      throw new BadRequestException('User is already inactive');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.INACTIVE,
        updatedBy,
      },
    });
  }

  // ===========================================================================
  // Assign Role to User
  // ===========================================================================

  async assignRole(
    userId: string,
    roleId: string,
    organizationId: string,
    facilityId?: string,
    grantedBy?: string,
  ): Promise<void> {
    // Verify user exists
    await this.findOne(userId, organizationId);

    // Verify role exists
    const role = await this.prisma.role.findFirst({
      where: {
        id: roleId,
        OR: [
          { organizationId },
          { organizationId: null, isSystem: true },
        ],
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Verify facility if provided
    if (facilityId) {
      const facility = await this.prisma.facility.findFirst({
        where: { id: facilityId, organizationId },
      });
      if (!facility) {
        throw new NotFoundException('Facility not found');
      }
    }

    // Upsert user role
    await this.prisma.userRole.upsert({
      where: {
        userId_roleId: { userId, roleId },
      },
      create: {
        userId,
        roleId,
        facilityId,
        grantedBy,
      },
      update: {
        facilityId,
        grantedBy,
      },
    });
  }

  // ===========================================================================
  // Remove Role from User
  // ===========================================================================

  async removeRole(
    userId: string,
    roleId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(userId, organizationId);

    await this.prisma.userRole.delete({
      where: {
        userId_roleId: { userId, roleId },
      },
    });
  }

  // ===========================================================================
  // Get User Permissions
  // ===========================================================================

  async getPermissions(userId: string, organizationId: string): Promise<string[]> {
    const user = await this.findOne(userId, organizationId);

    const permissions = new Set<string>();

    for (const userRole of (user as any).userRoles || []) {
      for (const rolePermission of userRole.role?.rolePermissions || []) {
        permissions.add(rolePermission.permission.code);
      }
    }

    return Array.from(permissions);
  }
}
