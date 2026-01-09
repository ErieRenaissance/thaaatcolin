// =============================================================================
// FERALIS PLATFORM - USERS CONTROLLER
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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { AssignRoleDto } from './dto/assign-role.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ===========================================================================
  // Create User
  // ===========================================================================

  @Post()
  @Permissions('users.create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.create(
      createUserDto,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // Get All Users
  // ===========================================================================

  @Get()
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async findAll(
    @Query() query: QueryUsersDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.findAll(currentUser.organizationId, query);
  }

  // ===========================================================================
  // Get Current User Profile
  // ===========================================================================

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  async getProfile(@CurrentUser() currentUser: any) {
    return this.usersService.findOne(currentUser.id, currentUser.organizationId);
  }

  // ===========================================================================
  // Get Single User
  // ===========================================================================

  @Get(':id')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.findOne(id, currentUser.organizationId);
  }

  // ===========================================================================
  // Update User
  // ===========================================================================

  @Put(':id')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.update(
      id,
      currentUser.organizationId,
      updateUserDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // Delete User
  // ===========================================================================

  @Delete(':id')
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Delete a user (soft delete)' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.usersService.remove(id, currentUser.organizationId, currentUser.id);
    return { message: 'User deleted successfully' };
  }

  // ===========================================================================
  // Activate User
  // ===========================================================================

  @Patch(':id/activate')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Activate a user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.activate(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // Deactivate User
  // ===========================================================================

  @Patch(':id/deactivate')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Deactivate a user' })
  @ApiResponse({ status: 200, description: 'User deactivated successfully' })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.deactivate(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // Assign Role
  // ===========================================================================

  @Post(':id/roles')
  @Permissions('users.update', 'roles.assign')
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiResponse({ status: 200, description: 'Role assigned successfully' })
  async assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() currentUser: any,
  ) {
    await this.usersService.assignRole(
      id,
      assignRoleDto.roleId,
      currentUser.organizationId,
      assignRoleDto.facilityId,
      currentUser.id,
    );
    return { message: 'Role assigned successfully' };
  }

  // ===========================================================================
  // Remove Role
  // ===========================================================================

  @Delete(':id/roles/:roleId')
  @Permissions('users.update', 'roles.assign')
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  async removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.usersService.removeRole(id, roleId, currentUser.organizationId);
    return { message: 'Role removed successfully' };
  }

  // ===========================================================================
  // Get User Permissions
  // ===========================================================================

  @Get(':id/permissions')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Get user permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async getPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    const permissions = await this.usersService.getPermissions(
      id,
      currentUser.organizationId,
    );
    return { permissions };
  }
}
