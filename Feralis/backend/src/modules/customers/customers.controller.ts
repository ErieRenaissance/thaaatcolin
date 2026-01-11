// =============================================================================
// FERALIS PLATFORM - CUSTOMERS CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';

import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateRequirementDto } from './dto/create-requirement.dto';

@ApiTags('Customers')
@Controller('customers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ===========================================================================
  // CUST-001: Create Customer
  // ===========================================================================

  @Post()
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Create a new customer' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 409, description: 'Customer code already exists' })
  async create(
    @Body() createCustomerDto: CreateCustomerDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.create(
      createCustomerDto,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-002: Query Customers
  // ===========================================================================

  @Get()
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Get all customers with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  async findAll(
    @Query() query: QueryCustomersDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.findAll(currentUser.organizationId, query);
  }

  // ===========================================================================
  // Helper: Get Customers for Dropdown
  // ===========================================================================

  @Get('select')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Get active customers for dropdown selection' })
  async getActiveForSelect(@CurrentUser() currentUser: any) {
    return this.customersService.getActiveCustomersForSelect(
      currentUser.organizationId,
    );
  }

  // ===========================================================================
  // CUST-003: Get Customer by ID
  // ===========================================================================

  @Get(':id')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Get a customer by ID with all relations' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.findOne(id, currentUser.organizationId);
  }

  // ===========================================================================
  // CUST-004: Update Customer
  // ===========================================================================

  @Put(':id')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Update a customer' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.update(
      id,
      currentUser.organizationId,
      updateCustomerDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-005: Delete Customer
  // ===========================================================================

  @Delete(':id')
  @Permissions('customers.delete')
  @ApiOperation({ summary: 'Delete a customer (soft delete)' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 409, description: 'Customer has associated records' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.customersService.remove(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
    return { message: 'Customer deleted successfully' };
  }

  // ===========================================================================
  // CUST-006: Update Customer Status
  // ===========================================================================

  @Patch(':id/status')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Update customer status' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: CustomerStatus,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.updateStatus(
      id,
      currentUser.organizationId,
      status,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-007: Set Credit Hold
  // ===========================================================================

  @Patch(':id/credit-hold')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Set or release credit hold' })
  @ApiResponse({ status: 200, description: 'Credit hold updated' })
  async setCreditHold(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isOnHold') isOnHold: boolean,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.setCreditHold(
      id,
      currentUser.organizationId,
      isOnHold,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-015: Get Customer Statistics
  // ===========================================================================

  @Get(':id/statistics')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Get customer statistics' })
  async getStatistics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.getStatistics(id, currentUser.organizationId);
  }

  // ===========================================================================
  // CUST-008: Create Contact
  // ===========================================================================

  @Post(':id/contacts')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Add a contact to customer' })
  @ApiResponse({ status: 201, description: 'Contact created successfully' })
  async createContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createContactDto: CreateContactDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.createContact(
      id,
      currentUser.organizationId,
      createContactDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-009: Update Contact
  // ===========================================================================

  @Put(':id/contacts/:contactId')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Update a customer contact' })
  async updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() updateContactDto: UpdateContactDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.updateContact(
      id,
      contactId,
      currentUser.organizationId,
      updateContactDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-010: Delete Contact
  // ===========================================================================

  @Delete(':id/contacts/:contactId')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Delete a customer contact' })
  async removeContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.customersService.removeContact(
      id,
      contactId,
      currentUser.organizationId,
    );
    return { message: 'Contact deleted successfully' };
  }

  // ===========================================================================
  // CUST-011: Create Address
  // ===========================================================================

  @Post(':id/addresses')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Add an address to customer' })
  @ApiResponse({ status: 201, description: 'Address created successfully' })
  async createAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createAddressDto: CreateAddressDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.createAddress(
      id,
      currentUser.organizationId,
      createAddressDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-012: Update Address
  // ===========================================================================

  @Put(':id/addresses/:addressId')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Update a customer address' })
  async updateAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.updateAddress(
      id,
      addressId,
      currentUser.organizationId,
      updateAddressDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // CUST-013: Delete Address
  // ===========================================================================

  @Delete(':id/addresses/:addressId')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Delete a customer address' })
  async removeAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('addressId', ParseUUIDPipe) addressId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.customersService.removeAddress(
      id,
      addressId,
      currentUser.organizationId,
    );
    return { message: 'Address deleted successfully' };
  }

  // ===========================================================================
  // CUST-014: Create Requirement
  // ===========================================================================

  @Post(':id/requirements')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Add a requirement to customer' })
  @ApiResponse({ status: 201, description: 'Requirement created successfully' })
  async createRequirement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createRequirementDto: CreateRequirementDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.customersService.createRequirement(
      id,
      currentUser.organizationId,
      createRequirementDto,
      currentUser.id,
    );
  }
}
