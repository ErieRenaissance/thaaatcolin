// =============================================================================
// FERALIS PLATFORM - INVENTORY CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
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

import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { QueryInventoryDto } from './dto/query-inventory.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransferDto } from './dto/transfer.dto';
import { AdjustmentDto } from './dto/adjustment.dto';

@ApiTags('Inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ===========================================================================
  // INV-004: Query Inventory
  // ===========================================================================

  @Get()
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Get all inventory with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Inventory retrieved successfully' })
  async findAll(
    @Query() query: QueryInventoryDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.findAllInventory(
      currentUser.organizationId,
      query,
    );
  }

  // ===========================================================================
  // INV-012: Get Stock Summary
  // ===========================================================================

  @Get('summary')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Get inventory stock summary' })
  async getStockSummary(
    @Query('facilityId') facilityId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.getStockSummary(
      currentUser.organizationId,
      facilityId,
    );
  }

  // ===========================================================================
  // INV-011: Get Transaction History
  // ===========================================================================

  @Get('transactions')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Get inventory transaction history' })
  async getTransactionHistory(
    @Query('partId') partId: string,
    @Query('locationId') locationId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('limit') limit: number,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.getTransactionHistory(
      currentUser.organizationId,
      partId,
      locationId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
      limit || 100,
    );
  }

  // ===========================================================================
  // INV-005: Get Inventory by Part
  // ===========================================================================

  @Get('by-part/:partId')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Get inventory for a specific part' })
  async getInventoryByPart(
    @Param('partId', ParseUUIDPipe) partId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.getInventoryByPart(
      partId,
      currentUser.organizationId,
    );
  }

  // ===========================================================================
  // INV-006: Record Receipt
  // ===========================================================================

  @Post('receipt')
  @Permissions('inventory.create')
  @ApiOperation({ summary: 'Record inventory receipt' })
  @ApiResponse({ status: 201, description: 'Receipt recorded successfully' })
  async recordReceipt(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.recordReceipt(
      createTransactionDto,
      currentUser.organizationId,
      currentUser.defaultFacilityId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // INV-007: Record Issue
  // ===========================================================================

  @Post('issue')
  @Permissions('inventory.create')
  @ApiOperation({ summary: 'Record inventory issue' })
  @ApiResponse({ status: 201, description: 'Issue recorded successfully' })
  async recordIssue(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.recordIssue(
      createTransactionDto,
      currentUser.organizationId,
      currentUser.defaultFacilityId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // INV-008: Record Transfer
  // ===========================================================================

  @Post('transfer')
  @Permissions('inventory.create')
  @ApiOperation({ summary: 'Record inventory transfer between locations' })
  @ApiResponse({ status: 201, description: 'Transfer recorded successfully' })
  async recordTransfer(
    @Body() transferDto: TransferDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.recordTransfer(
      transferDto.partId,
      transferDto.fromLocationId,
      transferDto.toLocationId,
      transferDto.quantity,
      currentUser.organizationId,
      currentUser.defaultFacilityId,
      transferDto.lotNumber,
      transferDto.reason,
      currentUser.id,
    );
  }

  // ===========================================================================
  // INV-009: Record Adjustment
  // ===========================================================================

  @Post('adjustment')
  @Permissions('inventory.adjust')
  @ApiOperation({ summary: 'Record inventory adjustment' })
  @ApiResponse({ status: 201, description: 'Adjustment recorded successfully' })
  async recordAdjustment(
    @Body() adjustmentDto: AdjustmentDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.recordAdjustment(
      adjustmentDto.partId,
      adjustmentDto.locationId,
      adjustmentDto.adjustmentQty,
      adjustmentDto.reason,
      currentUser.organizationId,
      currentUser.defaultFacilityId,
      adjustmentDto.lotNumber,
      currentUser.id,
    );
  }

  // ===========================================================================
  // INV-010: Set Quarantine
  // ===========================================================================

  @Put(':id/quarantine')
  @Permissions('inventory.adjust')
  @ApiOperation({ summary: 'Set or release inventory quarantine' })
  async setQuarantine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('isQuarantined') isQuarantined: boolean,
    @Body('reason') reason: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.inventoryService.setQuarantine(
      id,
      currentUser.organizationId,
      isQuarantined,
      reason,
      currentUser.id,
    );
  }
}
