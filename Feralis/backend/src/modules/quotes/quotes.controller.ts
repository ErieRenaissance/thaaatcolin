// =============================================================================
// FERALIS PLATFORM - QUOTES CONTROLLER
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
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

import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuotesDto } from './dto/query-quotes.dto';
import { CreateQuoteLineDto } from './dto/create-quote-line.dto';
import { UpdateQuoteLineDto } from './dto/update-quote-line.dto';

@ApiTags('Quotes')
@Controller('quotes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  // ===========================================================================
  // QUOT-001: Create Quote
  // ===========================================================================

  @Post()
  @Permissions('quotes.create')
  @ApiOperation({ summary: 'Create a new quote' })
  @ApiResponse({ status: 201, description: 'Quote created successfully' })
  async create(
    @Body() createQuoteDto: CreateQuoteDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.create(
      createQuoteDto,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-002: Query Quotes
  // ===========================================================================

  @Get()
  @Permissions('quotes.read')
  @ApiOperation({ summary: 'Get all quotes with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Quotes retrieved successfully' })
  async findAll(
    @Query() query: QueryQuotesDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.findAll(currentUser.organizationId, query);
  }

  // ===========================================================================
  // QUOT-003: Get Quote by ID
  // ===========================================================================

  @Get(':id')
  @Permissions('quotes.read')
  @ApiOperation({ summary: 'Get a quote by ID with all relations' })
  @ApiResponse({ status: 200, description: 'Quote retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.findOne(id, currentUser.organizationId);
  }

  // ===========================================================================
  // QUOT-004: Update Quote
  // ===========================================================================

  @Put(':id')
  @Permissions('quotes.update')
  @ApiOperation({ summary: 'Update a quote' })
  @ApiResponse({ status: 200, description: 'Quote updated successfully' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.update(
      id,
      currentUser.organizationId,
      updateQuoteDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-005: Delete Quote
  // ===========================================================================

  @Delete(':id')
  @Permissions('quotes.delete')
  @ApiOperation({ summary: 'Delete a quote (only DRAFT)' })
  @ApiResponse({ status: 200, description: 'Quote deleted successfully' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.quotesService.remove(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
    return { message: 'Quote deleted successfully' };
  }

  // ===========================================================================
  // QUOT-006: Submit Quote for Approval
  // ===========================================================================

  @Post(':id/submit')
  @Permissions('quotes.update')
  @ApiOperation({ summary: 'Submit quote for approval' })
  async submitForApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.submitForApproval(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-007: Approve Quote
  // ===========================================================================

  @Post(':id/approve')
  @Permissions('quotes.approve')
  @ApiOperation({ summary: 'Approve a quote' })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.approve(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-008: Reject Quote
  // ===========================================================================

  @Post(':id/reject')
  @Permissions('quotes.approve')
  @ApiOperation({ summary: 'Reject a quote' })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.reject(
      id,
      currentUser.organizationId,
      reason,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-009: Send Quote to Customer
  // ===========================================================================

  @Post(':id/send')
  @Permissions('quotes.update')
  @ApiOperation({ summary: 'Send quote to customer' })
  async sendToCustomer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.sendToCustomer(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-010: Convert Quote to Order
  // ===========================================================================

  @Post(':id/convert')
  @Permissions('orders.create')
  @ApiOperation({ summary: 'Convert quote to order' })
  @ApiResponse({ status: 201, description: 'Order created from quote' })
  async convertToOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('customerPO') customerPO: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.convertToOrder(
      id,
      currentUser.organizationId,
      customerPO,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-014: Create Quote Revision
  // ===========================================================================

  @Post(':id/revise')
  @Permissions('quotes.create')
  @ApiOperation({ summary: 'Create a new revision of the quote' })
  async createRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.createRevision(
      id,
      currentUser.organizationId,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-011: Add Quote Line
  // ===========================================================================

  @Post(':id/lines')
  @Permissions('quotes.update')
  @ApiOperation({ summary: 'Add a line to quote' })
  @ApiResponse({ status: 201, description: 'Line added successfully' })
  async addLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createLineDto: CreateQuoteLineDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.addLine(
      id,
      currentUser.organizationId,
      createLineDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-012: Update Quote Line
  // ===========================================================================

  @Put(':id/lines/:lineId')
  @Permissions('quotes.update')
  @ApiOperation({ summary: 'Update a quote line' })
  async updateLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() updateLineDto: UpdateQuoteLineDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.quotesService.updateLine(
      id,
      lineId,
      currentUser.organizationId,
      updateLineDto,
      currentUser.id,
    );
  }

  // ===========================================================================
  // QUOT-013: Remove Quote Line
  // ===========================================================================

  @Delete(':id/lines/:lineId')
  @Permissions('quotes.update')
  @ApiOperation({ summary: 'Remove a quote line' })
  async removeLine(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @CurrentUser() currentUser: any,
  ) {
    await this.quotesService.removeLine(
      id,
      lineId,
      currentUser.organizationId,
    );
    return { message: 'Line removed successfully' };
  }
}
