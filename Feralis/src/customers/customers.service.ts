// =============================================================================
// FERALIS PLATFORM - CUSTOMERS SERVICE
// =============================================================================
// Implements: CUST-001 through CUST-015

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Customer,
  CustomerContact,
  CustomerAddress,
  CustomerRequirement,
  CustomerStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateRequirementDto } from './dto/create-requirement.dto';

export interface PaginatedCustomers {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface CustomerWithRelations extends Customer {
  contacts?: CustomerContact[];
  addresses?: CustomerAddress[];
  requirements?: CustomerRequirement[];
  salesRep?: { id: string; firstName: string; lastName: string; email: string };
  _count?: { parts: number };
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ===========================================================================
  // CUST-001: Create Customer
  // ===========================================================================

  async create(
    createCustomerDto: CreateCustomerDto,
    organizationId: string,
    userId?: string,
  ): Promise<Customer> {
    // Check if code already exists
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        organizationId,
        code: createCustomerDto.code.toUpperCase(),
        deletedAt: null,
      },
    });

    if (existingCustomer) {
      throw new ConflictException('A customer with this code already exists');
    }

    // Validate sales rep if provided
    if (createCustomerDto.salesRepId) {
      const salesRep = await this.prisma.user.findFirst({
        where: {
          id: createCustomerDto.salesRepId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!salesRep) {
        throw new BadRequestException('Invalid sales representative');
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        ...createCustomerDto,
        organizationId,
        code: createCustomerDto.code.toUpperCase(),
        createdBy: userId,
      },
      include: {
        salesRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Audit log
    await this.auditService.log({
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
      entityName: customer.name,
      newValues: customer,
      userId,
      organizationId,
    });

    return customer;
  }

  // ===========================================================================
  // CUST-002: Query Customers
  // ===========================================================================

  async findAll(
    organizationId: string,
    query: QueryCustomersDto,
  ): Promise<PaginatedCustomers> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      customerType,
      salesRepId,
      territoryCode,
      tags,
      creditHold,
      portalEnabled,
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      organizationId,
      deletedAt: null,
    };

    // Search across multiple fields
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { legalName: { contains: search, mode: 'insensitive' } },
        { primaryEmail: { contains: search, mode: 'insensitive' } },
        { primaryPhone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerType) {
      where.customerType = customerType;
    }

    if (salesRepId) {
      where.salesRepId = salesRepId;
    }

    if (territoryCode) {
      where.territoryCode = territoryCode;
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    if (creditHold !== undefined) {
      where.isOnCreditHold = creditHold;
    }

    if (portalEnabled !== undefined) {
      where.portalEnabled = portalEnabled;
    }

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          salesRep: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: {
            select: { contacts: true, addresses: true, parts: true },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  // ===========================================================================
  // CUST-003: Get Customer by ID
  // ===========================================================================

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<CustomerWithRelations> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        organizationId,
        deletedAt: null,
      },
      include: {
        salesRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        contacts: {
          where: { isActive: true },
          orderBy: [{ isPrimary: 'desc' }, { lastName: 'asc' }],
        },
        addresses: {
          where: { isActive: true },
          orderBy: [{ isDefaultBilling: 'desc' }, { isDefaultShipping: 'desc' }],
        },
        requirements: {
          where: { isActive: true },
          orderBy: { category: 'asc' },
        },
        _count: {
          select: { parts: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  // ===========================================================================
  // CUST-004: Update Customer
  // ===========================================================================

  async update(
    id: string,
    organizationId: string,
    updateCustomerDto: UpdateCustomerDto,
    userId?: string,
  ): Promise<Customer> {
    const existing = await this.findOne(id, organizationId);

    // Check code uniqueness if being changed
    if (
      updateCustomerDto.code &&
      updateCustomerDto.code.toUpperCase() !== existing.code
    ) {
      const duplicateCode = await this.prisma.customer.findFirst({
        where: {
          organizationId,
          code: updateCustomerDto.code.toUpperCase(),
          id: { not: id },
          deletedAt: null,
        },
      });

      if (duplicateCode) {
        throw new ConflictException('A customer with this code already exists');
      }
    }

    // Validate sales rep if changed
    if (
      updateCustomerDto.salesRepId &&
      updateCustomerDto.salesRepId !== existing.salesRepId
    ) {
      const salesRep = await this.prisma.user.findFirst({
        where: {
          id: updateCustomerDto.salesRepId,
          organizationId,
          deletedAt: null,
        },
      });
      if (!salesRep) {
        throw new BadRequestException('Invalid sales representative');
      }
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...updateCustomerDto,
        code: updateCustomerDto.code?.toUpperCase(),
        updatedBy: userId,
      },
      include: {
        salesRep: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Audit log with change tracking
    await this.auditService.logChange(
      'CUSTOMER_UPDATED',
      'Customer',
      id,
      existing,
      customer,
      { userId, organizationId },
    );

    return customer;
  }

  // ===========================================================================
  // CUST-005: Delete Customer (Soft Delete)
  // ===========================================================================

  async remove(
    id: string,
    organizationId: string,
    userId?: string,
  ): Promise<void> {
    const customer = await this.findOne(id, organizationId);

    // Check for active orders (would be added in Phase 3)
    // For now, just check for parts
    if (customer._count && customer._count.parts > 0) {
      throw new ConflictException(
        `Cannot delete customer with ${customer._count.parts} associated parts`,
      );
    }

    await this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy: userId,
        status: CustomerStatus.INACTIVE,
      },
    });

    await this.auditService.log({
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
      entityName: customer.name,
      userId,
      organizationId,
    });
  }

  // ===========================================================================
  // CUST-006: Update Customer Status
  // ===========================================================================

  async updateStatus(
    id: string,
    organizationId: string,
    status: CustomerStatus,
    userId?: string,
  ): Promise<Customer> {
    const existing = await this.findOne(id, organizationId);

    // Validate status transitions
    const validTransitions: Record<CustomerStatus, CustomerStatus[]> = {
      [CustomerStatus.PROSPECT]: [CustomerStatus.ACTIVE, CustomerStatus.INACTIVE],
      [CustomerStatus.ACTIVE]: [
        CustomerStatus.INACTIVE,
        CustomerStatus.ON_HOLD,
        CustomerStatus.BLACKLISTED,
      ],
      [CustomerStatus.INACTIVE]: [CustomerStatus.ACTIVE, CustomerStatus.PROSPECT],
      [CustomerStatus.ON_HOLD]: [CustomerStatus.ACTIVE, CustomerStatus.INACTIVE],
      [CustomerStatus.BLACKLISTED]: [CustomerStatus.INACTIVE],
    };

    if (!validTransitions[existing.status]?.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${existing.status} to ${status}`,
      );
    }

    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        status,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: 'CUSTOMER_STATUS_CHANGED',
      entityType: 'Customer',
      entityId: id,
      entityName: customer.name,
      oldValues: { status: existing.status },
      newValues: { status },
      userId,
      organizationId,
    });

    return customer;
  }

  // ===========================================================================
  // CUST-007: Set Credit Hold
  // ===========================================================================

  async setCreditHold(
    id: string,
    organizationId: string,
    isOnHold: boolean,
    userId?: string,
  ): Promise<Customer> {
    const customer = await this.findOne(id, organizationId);

    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        isOnCreditHold: isOnHold,
        updatedBy: userId,
      },
    });

    await this.auditService.log({
      action: isOnHold ? 'CUSTOMER_CREDIT_HOLD_SET' : 'CUSTOMER_CREDIT_HOLD_RELEASED',
      entityType: 'Customer',
      entityId: id,
      entityName: customer.name,
      oldValues: { isOnCreditHold: customer.isOnCreditHold },
      newValues: { isOnCreditHold: isOnHold },
      userId,
      organizationId,
    });

    return updated;
  }

  // ===========================================================================
  // CUST-008: Create Contact
  // ===========================================================================

  async createContact(
    customerId: string,
    organizationId: string,
    createContactDto: CreateContactDto,
    userId?: string,
  ): Promise<CustomerContact> {
    const customer = await this.findOne(customerId, organizationId);

    // If setting as primary, unset other primary contacts
    if (createContactDto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.customerContact.create({
      data: {
        ...createContactDto,
        customerId,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      action: 'CUSTOMER_CONTACT_CREATED',
      entityType: 'CustomerContact',
      entityId: contact.id,
      entityName: `${contact.firstName} ${contact.lastName}`,
      newValues: contact,
      metadata: { customerId, customerName: customer.name },
      userId,
      organizationId,
    });

    return contact;
  }

  // ===========================================================================
  // CUST-009: Update Contact
  // ===========================================================================

  async updateContact(
    customerId: string,
    contactId: string,
    organizationId: string,
    updateContactDto: UpdateContactDto,
    userId?: string,
  ): Promise<CustomerContact> {
    await this.findOne(customerId, organizationId);

    const existing = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId },
    });

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    // If setting as primary, unset other primary contacts
    if (updateContactDto.isPrimary && !existing.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true, id: { not: contactId } },
        data: { isPrimary: false },
      });
    }

    const contact = await this.prisma.customerContact.update({
      where: { id: contactId },
      data: {
        ...updateContactDto,
        updatedBy: userId,
      },
    });

    return contact;
  }

  // ===========================================================================
  // CUST-010: Delete Contact
  // ===========================================================================

  async removeContact(
    customerId: string,
    contactId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(customerId, organizationId);

    const contact = await this.prisma.customerContact.findFirst({
      where: { id: contactId, customerId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    await this.prisma.customerContact.update({
      where: { id: contactId },
      data: { isActive: false },
    });
  }

  // ===========================================================================
  // CUST-011: Create Address
  // ===========================================================================

  async createAddress(
    customerId: string,
    organizationId: string,
    createAddressDto: CreateAddressDto,
    userId?: string,
  ): Promise<CustomerAddress> {
    const customer = await this.findOne(customerId, organizationId);

    // Handle default address flags
    if (createAddressDto.isDefaultBilling) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefaultBilling: true },
        data: { isDefaultBilling: false },
      });
    }

    if (createAddressDto.isDefaultShipping) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefaultShipping: true },
        data: { isDefaultShipping: false },
      });
    }

    const address = await this.prisma.customerAddress.create({
      data: {
        ...createAddressDto,
        customerId,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      action: 'CUSTOMER_ADDRESS_CREATED',
      entityType: 'CustomerAddress',
      entityId: address.id,
      entityName: address.name || `${address.city}, ${address.state}`,
      newValues: address,
      metadata: { customerId, customerName: customer.name },
      userId,
      organizationId,
    });

    return address;
  }

  // ===========================================================================
  // CUST-012: Update Address
  // ===========================================================================

  async updateAddress(
    customerId: string,
    addressId: string,
    organizationId: string,
    updateAddressDto: UpdateAddressDto,
    userId?: string,
  ): Promise<CustomerAddress> {
    await this.findOne(customerId, organizationId);

    const existing = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });

    if (!existing) {
      throw new NotFoundException('Address not found');
    }

    // Handle default address flags
    if (updateAddressDto.isDefaultBilling && !existing.isDefaultBilling) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefaultBilling: true, id: { not: addressId } },
        data: { isDefaultBilling: false },
      });
    }

    if (updateAddressDto.isDefaultShipping && !existing.isDefaultShipping) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefaultShipping: true, id: { not: addressId } },
        data: { isDefaultShipping: false },
      });
    }

    const address = await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: {
        ...updateAddressDto,
        updatedBy: userId,
      },
    });

    return address;
  }

  // ===========================================================================
  // CUST-013: Delete Address
  // ===========================================================================

  async removeAddress(
    customerId: string,
    addressId: string,
    organizationId: string,
  ): Promise<void> {
    await this.findOne(customerId, organizationId);

    const address = await this.prisma.customerAddress.findFirst({
      where: { id: addressId, customerId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.customerAddress.update({
      where: { id: addressId },
      data: { isActive: false },
    });
  }

  // ===========================================================================
  // CUST-014: Create Requirement
  // ===========================================================================

  async createRequirement(
    customerId: string,
    organizationId: string,
    createRequirementDto: CreateRequirementDto,
    userId?: string,
  ): Promise<CustomerRequirement> {
    const customer = await this.findOne(customerId, organizationId);

    const requirement = await this.prisma.customerRequirement.create({
      data: {
        ...createRequirementDto,
        customerId,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      action: 'CUSTOMER_REQUIREMENT_CREATED',
      entityType: 'CustomerRequirement',
      entityId: requirement.id,
      entityName: requirement.name,
      newValues: requirement,
      metadata: { customerId, customerName: customer.name },
      userId,
      organizationId,
    });

    return requirement;
  }

  // ===========================================================================
  // CUST-015: Get Customer Statistics
  // ===========================================================================

  async getStatistics(
    id: string,
    organizationId: string,
  ): Promise<any> {
    const customer = await this.findOne(id, organizationId);

    // Get counts
    const [contactCount, addressCount, requirementCount, partCount] =
      await Promise.all([
        this.prisma.customerContact.count({
          where: { customerId: id, isActive: true },
        }),
        this.prisma.customerAddress.count({
          where: { customerId: id, isActive: true },
        }),
        this.prisma.customerRequirement.count({
          where: { customerId: id, isActive: true },
        }),
        this.prisma.part.count({
          where: { customerId: id, deletedAt: null },
        }),
      ]);

    return {
      customerId: id,
      customerName: customer.name,
      status: customer.status,
      contacts: contactCount,
      addresses: addressCount,
      requirements: requirementCount,
      parts: partCount,
      creditLimit: customer.creditLimit,
      isOnCreditHold: customer.isOnCreditHold,
      portalEnabled: customer.portalEnabled,
      firstOrderDate: customer.firstOrderDate,
      lastOrderDate: customer.lastOrderDate,
    };
  }

  // ===========================================================================
  // Helper: Find by Code
  // ===========================================================================

  async findByCode(
    code: string,
    organizationId: string,
  ): Promise<Customer | null> {
    return this.prisma.customer.findFirst({
      where: {
        organizationId,
        code: code.toUpperCase(),
        deletedAt: null,
      },
    });
  }

  // ===========================================================================
  // Helper: Get Active Customers for Dropdown
  // ===========================================================================

  async getActiveCustomersForSelect(
    organizationId: string,
  ): Promise<{ id: string; code: string; name: string }[]> {
    return this.prisma.customer.findMany({
      where: {
        organizationId,
        status: CustomerStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
