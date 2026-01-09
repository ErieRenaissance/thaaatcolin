// =============================================================================
// FERALIS PLATFORM - FACILITIES SERVICE
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Facility, Prisma } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { QueryFacilitiesDto } from './dto/query-facilities.dto';

export interface PaginatedFacilities {
  items: Facility[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class FacilitiesService {
  private readonly logger = new Logger(FacilitiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // Create Facility
  // ===========================================================================

  async create(
    createFacilityDto: CreateFacilityDto,
    organizationId: string,
  ): Promise<Facility> {
    // Check if code already exists in organization
    const existingFacility = await this.prisma.facility.findFirst({
      where: {
        organizationId,
        code: createFacilityDto.code.toUpperCase(),
      },
    });

    if (existingFacility) {
      throw new ConflictException('A facility with this code already exists');
    }

    const facility = await this.prisma.facility.create({
      data: {
        ...createFacilityDto,
        organizationId,
        code: createFacilityDto.code.toUpperCase(),
      },
      include: {
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

    return facility;
  }

  // ===========================================================================
  // Find All Facilities
  // ===========================================================================

  async findAll(
    organizationId: string,
    query: QueryFacilitiesDto,
  ): Promise<PaginatedFacilities> {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      isActive,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.FacilityWhereInput = {
      organizationId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const orderBy: Prisma.FacilityOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      this.prisma.facility.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              users: true,
            },
          },
        },
      }),
      this.prisma.facility.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  // ===========================================================================
  // Find One Facility
  // ===========================================================================

  async findOne(id: string, organizationId: string): Promise<Facility> {
    const facility = await this.prisma.facility.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    return facility;
  }

  // ===========================================================================
  // Update Facility
  // ===========================================================================

  async update(
    id: string,
    organizationId: string,
    updateFacilityDto: UpdateFacilityDto,
  ): Promise<Facility> {
    const facility = await this.findOne(id, organizationId);

    // Check code uniqueness if being changed
    if (
      updateFacilityDto.code &&
      updateFacilityDto.code.toUpperCase() !== facility.code
    ) {
      const existingFacility = await this.prisma.facility.findFirst({
        where: {
          organizationId,
          code: updateFacilityDto.code.toUpperCase(),
          id: { not: id },
        },
      });

      if (existingFacility) {
        throw new ConflictException('A facility with this code already exists');
      }
    }

    const updatedFacility = await this.prisma.facility.update({
      where: { id },
      data: {
        ...updateFacilityDto,
        code: updateFacilityDto.code?.toUpperCase(),
      },
      include: {
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

    return updatedFacility;
  }

  // ===========================================================================
  // Delete Facility
  // ===========================================================================

  async remove(id: string, organizationId: string): Promise<void> {
    await this.findOne(id, organizationId);

    // Check if facility has users
    const userCount = await this.prisma.user.count({
      where: {
        defaultFacilityId: id,
        deletedAt: null,
      },
    });

    if (userCount > 0) {
      throw new ConflictException(
        `Cannot delete facility with ${userCount} assigned users`,
      );
    }

    await this.prisma.facility.delete({
      where: { id },
    });
  }

  // ===========================================================================
  // Activate/Deactivate Facility
  // ===========================================================================

  async setActive(
    id: string,
    organizationId: string,
    isActive: boolean,
  ): Promise<Facility> {
    await this.findOne(id, organizationId);

    return this.prisma.facility.update({
      where: { id },
      data: { isActive },
    });
  }
}
