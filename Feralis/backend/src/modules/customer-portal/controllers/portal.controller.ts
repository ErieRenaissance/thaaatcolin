/**
 * Feralis Manufacturing Platform
 * Customer Portal Controller - REST API endpoints for customer self-service
 * Phase 7: Analytics & Customer Portal Implementation
 */

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
  Request,
  HttpStatus,
  HttpException,
  ParseUUIDPipe,
  ValidationPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { PortalService } from '../services/portal.service';
import {
  PortalLoginRequestDto,
  CreateRFQRequestDto,
  SubmitApprovalRequestDto,
  DelegateApprovalRequestDto,
  CreateMessageRequestDto,
  PortalOrdersRequestDto,
  PortalQuotesRequestDto,
  ConvertQuoteToOrderRequestDto,
  CreateSavedSearchRequestDto,
  AddFavoriteRequestDto,
} from '../dto/portal.dto';
import { PortalAuthGuard } from '../../../common/guards/auth.guard';
import { PortalRoles, CurrentPortalUser } from '../../../common/decorators/decorators';

// ============================================================================
// PUBLIC AUTHENTICATION ENDPOINTS (No Guard)
// ============================================================================

@ApiTags('Portal Authentication')
@Controller('api/v1/portal/auth')
export class PortalAuthController {
  constructor(private readonly portalService: PortalService) {}

  @Post('login')
  @ApiOperation({ summary: 'Customer portal login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body(ValidationPipe) request: PortalLoginRequestDto) {
    const result = await this.portalService.login(
      request.email,
      request.password,
      request.deviceInfo,
    );
    if (!result) {
      throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async forgotPassword(@Body('email') email: string) {
    await this.portalService.requestPasswordReset(email);
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    const result = await this.portalService.resetPassword(token, newPassword);
    if (!result) {
      throw new HttpException('Invalid or expired reset token', HttpStatus.BAD_REQUEST);
    }
    return { message: 'Password reset successful' };
  }

  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Body('refreshToken') refreshToken: string) {
    const result = await this.portalService.refreshSession(refreshToken);
    if (!result) {
      throw new HttpException('Invalid refresh token', HttpStatus.UNAUTHORIZED);
    }
    return result;
  }

  @Post('logout')
  @UseGuards(PortalAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from portal' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@CurrentPortalUser() user: any) {
    await this.portalService.logout(user.sessionId);
    return { message: 'Logout successful' };
  }
}

// ============================================================================
// PROTECTED PORTAL ENDPOINTS
// ============================================================================

@ApiTags('Customer Portal')
@Controller('api/v1/portal')
@UseGuards(PortalAuthGuard)
@ApiBearerAuth()
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  @Get('dashboard')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get customer portal dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data' })
  async getDashboard(@CurrentPortalUser() user: any) {
    return this.portalService.getDashboard(user.customerId, user.id);
  }

  // ============================================================================
  // USER PROFILE
  // ============================================================================

  @Get('profile')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentPortalUser() user: any) {
    return this.portalService.getUserProfile(user.id);
  }

  @Put('profile')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @Body() updates: any,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.updateUserProfile(user.id, updates);
  }

  @Put('profile/password')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  async changePassword(
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
    @CurrentPortalUser() user: any,
  ) {
    const result = await this.portalService.changePassword(
      user.id,
      currentPassword,
      newPassword,
    );
    if (!result) {
      throw new HttpException('Invalid current password', HttpStatus.BAD_REQUEST);
    }
    return { success: true };
  }

  @Put('profile/notifications')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updateNotificationPreferences(
    @Body() preferences: any,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.updateNotificationPreferences(user.id, preferences);
  }

  // ============================================================================
  // ORDERS
  // ============================================================================

  @Get('orders')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get list of orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by order/PO number' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter by start date' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter by end date' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiResponse({ status: 200, description: 'List of orders' })
  async getOrders(
    @CurrentPortalUser() user: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const request: PortalOrdersRequestDto = {
      status,
      search,
      dateRange: startDate && endDate ? { startDate, endDate } : undefined,
      page: page || 1,
      pageSize: pageSize || 20,
      sortBy: sortBy || 'orderDate',
      sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC',
    };
    return this.portalService.getOrders(user.customerId, request);
  }

  @Get('orders/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get order details' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    const order = await this.portalService.getOrderById(id, user.customerId);
    if (!order) {
      throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }
    return order;
  }

  // ============================================================================
  // QUOTES
  // ============================================================================

  @Get('quotes')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get list of quotes' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by quote number' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiResponse({ status: 200, description: 'List of quotes' })
  async getQuotes(
    @CurrentPortalUser() user: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    const request: PortalQuotesRequestDto = {
      status,
      search,
      page: page || 1,
      pageSize: pageSize || 20,
      sortBy: sortBy || 'quoteDate',
      sortOrder: (sortOrder as 'ASC' | 'DESC') || 'DESC',
    };
    return this.portalService.getQuotes(user.customerId, request);
  }

  @Get('quotes/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get quote details' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({ status: 200, description: 'Quote details' })
  @ApiResponse({ status: 404, description: 'Quote not found' })
  async getQuote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    const quote = await this.portalService.getQuoteById(id, user.customerId);
    if (!quote) {
      throw new HttpException('Quote not found', HttpStatus.NOT_FOUND);
    }
    return quote;
  }

  @Post('quotes/:id/convert')
  @PortalRoles('ADMIN', 'BUYER')
  @ApiOperation({ summary: 'Convert quote to order' })
  @ApiParam({ name: 'id', description: 'Quote ID' })
  @ApiResponse({ status: 201, description: 'Order created from quote' })
  @ApiResponse({ status: 400, description: 'Quote cannot be converted' })
  async convertQuoteToOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) request: ConvertQuoteToOrderRequestDto,
    @CurrentPortalUser() user: any,
  ) {
    const result = await this.portalService.convertQuoteToOrder(
      id,
      user.customerId,
      user.id,
      request,
    );
    if (!result.success) {
      throw new HttpException(result.error || 'Cannot convert quote', HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  // ============================================================================
  // RFQ (Request for Quote)
  // ============================================================================

  @Get('rfqs')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Get list of RFQs' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of RFQs' })
  async getRFQs(
    @CurrentPortalUser() user: any,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.portalService.getRFQs(user.customerId, { status }, { page, pageSize });
  }

  @Get('rfqs/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Get RFQ details' })
  @ApiParam({ name: 'id', description: 'RFQ ID' })
  @ApiResponse({ status: 200, description: 'RFQ details' })
  async getRFQ(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.getRFQById(id, user.customerId);
  }

  @Post('rfqs')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @UseInterceptors(FilesInterceptor('files', 10))
  @ApiOperation({ summary: 'Create new RFQ' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'RFQ created' })
  async createRFQ(
    @Body(ValidationPipe) request: CreateRFQRequestDto,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentPortalUser() user: any,
  ) {
    // Handle file uploads and attach to request
    const fileIds = await this.handleFileUploads(files);
    const rfqRequest = { ...request, attachmentIds: fileIds };
    
    return this.portalService.createRFQ(user.customerId, user.id, rfqRequest);
  }

  private async handleFileUploads(files: Express.Multer.File[]): Promise<string[]> {
    // TODO: Implement file upload to MinIO/S3
    // Return array of file attachment IDs
    return files?.map(() => crypto.randomUUID()) || [];
  }

  // ============================================================================
  // APPROVALS
  // ============================================================================

  @Get('approvals')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Get pending approvals' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by approval type' })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  async getApprovals(
    @CurrentPortalUser() user: any,
    @Query('type') type?: string,
  ) {
    return this.portalService.getPendingApprovals(user.customerId, user.id, type);
  }

  @Get('approvals/pending')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Get pending approvals (alias)' })
  @ApiResponse({ status: 200, description: 'List of pending approvals' })
  async getPendingApprovals(@CurrentPortalUser() user: any) {
    return this.portalService.getPendingApprovals(user.customerId, user.id);
  }

  @Get('approvals/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Get approval details' })
  @ApiParam({ name: 'id', description: 'Approval request ID' })
  @ApiResponse({ status: 200, description: 'Approval details' })
  async getApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.getApprovalById(id, user.customerId);
  }

  @Post('approvals/:id/submit')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Submit approval decision' })
  @ApiParam({ name: 'id', description: 'Approval request ID' })
  @ApiResponse({ status: 200, description: 'Approval submitted' })
  async submitApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) request: SubmitApprovalRequestDto,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.submitApproval(id, user.customerId, user.id, request);
  }

  @Post('approvals/:id/delegate')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Delegate approval to another user' })
  @ApiParam({ name: 'id', description: 'Approval request ID' })
  @ApiResponse({ status: 200, description: 'Approval delegated' })
  async delegateApproval(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) request: DelegateApprovalRequestDto,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.delegateApproval(id, user.customerId, user.id, request);
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  @Get('messages/threads')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get message threads' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of message threads' })
  async getMessageThreads(
    @CurrentPortalUser() user: any,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.portalService.getMessageThreads(
      user.customerId,
      user.id,
      { page: page || 1, pageSize: pageSize || 20 },
    );
  }

  @Get('messages/threads/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get messages in thread' })
  @ApiParam({ name: 'id', description: 'Thread ID' })
  @ApiResponse({ status: 200, description: 'Messages in thread' })
  async getThreadMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.getThreadMessages(id, user.customerId, user.id);
  }

  @Post('messages/threads/:id/messages')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Send a message to thread' })
  @ApiParam({ name: 'id', description: 'Thread ID' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessageToThread(
    @Param('id', ParseUUIDPipe) threadId: string,
    @Body(ValidationPipe) request: CreateMessageRequestDto,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.sendMessage(user.customerId, user.id, {
      ...request,
      threadId,
    });
  }

  @Post('messages')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER')
  @ApiOperation({ summary: 'Send a message (create new thread if needed)' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(
    @Body(ValidationPipe) request: CreateMessageRequestDto,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.sendMessage(user.customerId, user.id, request);
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  @Get('notifications')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get notifications' })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of notifications' })
  async getNotifications(
    @CurrentPortalUser() user: any,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.portalService.getNotifications(
      user.id,
      unreadOnly,
      pageSize || 20,
      page || 1,
    );
  }

  @Put('notifications/:id/read')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    await this.portalService.markNotificationRead(id, user.id);
    return { success: true };
  }

  @Put('notifications/read-all')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsRead(@CurrentPortalUser() user: any) {
    await this.portalService.markAllNotificationsRead(user.id);
    return { success: true };
  }

  // ============================================================================
  // DOCUMENTS
  // ============================================================================

  @Get('documents')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get accessible documents' })
  @ApiQuery({ name: 'orderId', required: false })
  @ApiQuery({ name: 'quoteId', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of documents' })
  async getDocuments(
    @CurrentPortalUser() user: any,
    @Query('orderId') orderId?: string,
    @Query('quoteId') quoteId?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.portalService.getDocuments(
      user.customerId,
      { orderId, quoteId, type, search },
      { page: page || 1, pageSize: pageSize || 20 },
    );
  }

  @Get('documents/:id/download')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get document download URL' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: 'Download URL' })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    // Log document access
    await this.portalService.logDocumentAccess(
      id,
      user.id,
      'DOWNLOAD',
    );
    
    // TODO: Generate signed URL from MinIO/S3
    return {
      downloadUrl: `/api/v1/portal/documents/${id}/file`,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  // ============================================================================
  // SHIPMENTS
  // ============================================================================

  @Get('shipments')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get recent shipments' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of shipments' })
  async getShipments(
    @CurrentPortalUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.portalService.getRecentShipments(user.customerId, limit || 10);
  }

  @Get('shipments/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get shipment details' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment details' })
  async getShipment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.getShipmentById(id, user.customerId);
  }

  @Get('shipments/:id/tracking')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get shipment tracking info' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Tracking information' })
  async getShipmentTracking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.getShipmentTracking(id, user.customerId);
  }

  // ============================================================================
  // SAVED SEARCHES & FAVORITES
  // ============================================================================

  @Get('saved-searches')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get saved searches' })
  @ApiResponse({ status: 200, description: 'List of saved searches' })
  async getSavedSearches(@CurrentPortalUser() user: any) {
    return this.portalService.getSavedSearches(user.id);
  }

  @Post('saved-searches')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Create saved search' })
  @ApiResponse({ status: 201, description: 'Search saved' })
  async createSavedSearch(
    @Body(ValidationPipe) request: CreateSavedSearchRequestDto,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.createSavedSearch(user.id, request);
  }

  @Delete('saved-searches/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Delete saved search' })
  @ApiParam({ name: 'id', description: 'Saved search ID' })
  @ApiResponse({ status: 200, description: 'Search deleted' })
  async deleteSavedSearch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    await this.portalService.deleteSavedSearch(id, user.id);
    return { success: true };
  }

  @Get('favorites')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Get favorites' })
  @ApiQuery({ name: 'type', required: false })
  @ApiResponse({ status: 200, description: 'List of favorites' })
  async getFavorites(
    @CurrentPortalUser() user: any,
    @Query('type') type?: string,
  ) {
    return this.portalService.getFavorites(user.id, type);
  }

  @Post('favorites')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Add favorite' })
  @ApiResponse({ status: 201, description: 'Favorite added' })
  async addFavorite(
    @Body(ValidationPipe) request: AddFavoriteRequestDto,
    @CurrentPortalUser() user: any,
  ) {
    return this.portalService.addFavorite(user.id, request);
  }

  @Delete('favorites/:id')
  @PortalRoles('ADMIN', 'BUYER', 'ENGINEER', 'VIEWER')
  @ApiOperation({ summary: 'Remove favorite' })
  @ApiParam({ name: 'id', description: 'Favorite ID' })
  @ApiResponse({ status: 200, description: 'Favorite removed' })
  async removeFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentPortalUser() user: any,
  ) {
    await this.portalService.removeFavorite(id, user.id);
    return { success: true };
  }
}
