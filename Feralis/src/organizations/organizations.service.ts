// =============================================================================
// FERALIS PLATFORM - ORGANIZATIONS SERVICE
// =============================================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Organization } from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // Create Organization
  // ===========================================================================

  async create(createOrganizationDto: CreateOrganizationDto): Promise<Organization> {
    // Check if code already exists
    const existingOrg = await this.prisma.organization.findUnique({
      where: { code: createOrganizationDto.code.toUpperCase() },
    });

    if (existingOrg) {
      throw new ConflictException('Organization with this code already exists');
    }

    const organization = await this.prisma.organization.create({
      data: {
        ...createOrganizationDto,
        code: createOrganizationDto.code.toUpperCase(),
      },
    });

    return organization;
  }

  // ===========================================================================
  // Find One Organization
  // ===========================================================================

  async findOne(id: string): Promise<Organization> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        facilities: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            city: true,
            state: true,
          },
        },
        _count: {
          select: {
            users: true,
            facilities: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  // ===========================================================================
  // Find by Code
  // ===========================================================================

  async findByCode(code: string): Promise<Organization | null> {
    return this.prisma.organization.findUnique({
      where: { code: code.toUpperCase() },
    });
  }

  // ===========================================================================
  // Update Organization
  // ===========================================================================

  async update(
    id: string,
    updateOrganizationDto: UpdateOrganizationDto,
  ): Promise<Organization> {
    await this.findOne(id);

    // Check code uniqueness if being changed
    if (updateOrganizationDto.code) {
      const existingOrg = await this.prisma.organization.findFirst({
        where: {
          code: updateOrganizationDto.code.toUpperCase(),
          id: { not: id },
        },
      });

      if (existingOrg) {
        throw new ConflictException('Organization with this code already exists');
      }
    }

    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        ...updateOrganizationDto,
        code: updateOrganizationDto.code?.toUpperCase(),
      },
    });

    return organization;
  }

  // ===========================================================================
  // Update Settings
  // ===========================================================================

  async updateSettings(id: string, settings: Record<string, any>): Promise<Organization> {
    const organization = await this.findOne(id);

    const updatedSettings = {
      ...(organization.settings as object),
      ...settings,
    };

    return this.prisma.organization.update({
      where: { id },
      data: { settings: updatedSettings },
    });
  }

  // ===========================================================================
  // Get Statistics
  // ===========================================================================

  async getStatistics(id: string): Promise<any> {
    await this.findOne(id);

    const [
      userCount,
      activeUserCount,
      facilityCount,
      roleCount,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { organizationId: id, deletedAt: null },
      }),
      this.prisma.user.count({
        where: { organizationId: id, deletedAt: null, status: 'ACTIVE' },
      }),
      this.prisma.facility.count({
        where: { organizationId: id, isActive: true },
      }),
      this.prisma.role.count({
        where: { organizationId: id },
      }),
    ]);

    return {
      users: {
        total: userCount,
        active: activeUserCount,
      },
      facilities: facilityCount,
      roles: roleCount,
    };
  }
}
