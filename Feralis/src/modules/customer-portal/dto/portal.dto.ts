/**
 * Feralis Manufacturing Platform
 * Customer Portal Module - Data Transfer Objects
 * 
 * Request/response DTOs with validation decorators for the Customer Portal API
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  IsDateString,
  IsEmail,
  IsObject,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PortalRole,
  RFQStatus,
  ApprovalStatus,
  MessageStatus,
  NotificationType,
  DeliveryUrgency,
  MessagePriority,
  ApprovalRequestType,
} from '../entities/portal.entity';

// ============================================================================
// AUTHENTICATION DTOs
// ============================================================================

export class PortalLoginDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ description: 'Remember me option' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number and special character',
  })
  newPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New password', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

// ============================================================================
// ORDER DTOs
// ============================================================================

export class OrderFilterDto {
  @ApiPropertyOptional({ description: 'Search by order number, PO, or part number' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional({ description: 'Filter by date range start' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by date range end' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsEnum(['orderDate', 'dueDate', 'orderNumber', 'status', 'total'])
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortDirection?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Page number (1-based)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================================================
// QUOTE DTOs
// ============================================================================

export class QuoteFilterDto {
  @ApiPropertyOptional({ description: 'Search by quote number or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @ApiPropertyOptional({ description: 'Show only active/non-expired quotes' })
  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by date range start' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by date range end' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsEnum(['quoteDate', 'validUntil', 'quoteNumber', 'status', 'totalValue'])
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortDirection?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Page number (1-based)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class ConvertQuoteToOrderDto {
  @ApiProperty({ description: 'Customer PO number' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  customerPO: string;

  @ApiPropertyOptional({ description: 'Customer PO date' })
  @IsOptional()
  @IsDateString()
  customerPODate?: string;

  @ApiPropertyOptional({ description: 'Requested delivery date' })
  @IsOptional()
  @IsDateString()
  requestedDate?: string;

  @ApiPropertyOptional({ description: 'Ship-to address ID' })
  @IsOptional()
  @IsUUID()
  shipToAddressId?: string;

  @ApiPropertyOptional({ description: 'Bill-to address ID' })
  @IsOptional()
  @IsUUID()
  billToAddressId?: string;

  @ApiPropertyOptional({ description: 'Special instructions' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

// ============================================================================
// RFQ DTOs
// ============================================================================

export class RFQLineDto {
  @ApiProperty({ description: 'Part name or description' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  partName: string;

  @ApiPropertyOptional({ description: 'Part number if known' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ description: 'Quantity requested' })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ description: 'Material specification' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  material?: string;

  @ApiPropertyOptional({ description: 'Required tolerances' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tolerances?: string;

  @ApiPropertyOptional({ description: 'Surface finish requirements' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  surfaceFinish?: string;

  @ApiPropertyOptional({ description: 'Finishing requirements' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  finishingRequirements?: string[];

  @ApiPropertyOptional({ description: 'File attachment IDs' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  fileIds?: string[];

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class CreateRFQDto {
  @ApiPropertyOptional({ description: 'RFQ title' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ description: 'Internal reference number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiProperty({ description: 'RFQ line items', type: [RFQLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RFQLineDto)
  lines: RFQLineDto[];

  @ApiPropertyOptional({ description: 'Delivery urgency', enum: DeliveryUrgency })
  @IsOptional()
  @IsEnum(DeliveryUrgency)
  deliveryUrgency?: DeliveryUrgency;

  @ApiPropertyOptional({ description: 'Requested delivery date' })
  @IsOptional()
  @IsDateString()
  requestedDeliveryDate?: string;

  @ApiPropertyOptional({ description: 'Quantity breakpoints for pricing' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  quantityBreaks?: number[];

  @ApiPropertyOptional({ description: 'Ship-to address ID' })
  @IsOptional()
  @IsUUID()
  shipToAddressId?: string;

  @ApiPropertyOptional({ description: 'Special requirements or notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  specialRequirements?: string;

  @ApiPropertyOptional({ description: 'Request instant quote if eligible' })
  @IsOptional()
  @IsBoolean()
  requestInstantQuote?: boolean;
}

export class RFQFilterDto {
  @ApiPropertyOptional({ description: 'Search by RFQ number or title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by status', enum: RFQStatus })
  @IsOptional()
  @IsEnum(RFQStatus)
  status?: RFQStatus;

  @ApiPropertyOptional({ description: 'Filter by date range start' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by date range end' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================================================
// APPROVAL DTOs
// ============================================================================

export class ApprovalFilterDto {
  @ApiPropertyOptional({ description: 'Filter by status', enum: ApprovalStatus })
  @IsOptional()
  @IsEnum(ApprovalStatus)
  status?: ApprovalStatus;

  @ApiPropertyOptional({ description: 'Filter by type', enum: ApprovalRequestType })
  @IsOptional()
  @IsEnum(ApprovalRequestType)
  type?: ApprovalRequestType;

  @ApiPropertyOptional({ description: 'Show only urgent (deadline within 48h)' })
  @IsOptional()
  @IsBoolean()
  urgentOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class DigitalSignatureDto {
  @ApiProperty({ description: 'Signature data (base64 encoded image or typed name)' })
  @IsString()
  data: string;

  @ApiProperty({ description: 'Signature type' })
  @IsEnum(['drawn', 'typed', 'certificate'])
  type: 'drawn' | 'typed' | 'certificate';

  @ApiPropertyOptional({ description: 'IP address' })
  @IsOptional()
  @IsString()
  ipAddress?: string;
}

export class SubmitApprovalDto {
  @ApiProperty({ description: 'Approval decision' })
  @IsEnum(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @ApiPropertyOptional({ description: 'Comments or notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;

  @ApiPropertyOptional({ description: 'Digital signature', type: DigitalSignatureDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DigitalSignatureDto)
  signature?: DigitalSignatureDto;
}

export class DelegateApprovalDto {
  @ApiProperty({ description: 'User ID to delegate to' })
  @IsUUID()
  delegateToUserId: string;

  @ApiPropertyOptional({ description: 'Reason for delegation' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

// ============================================================================
// MESSAGING DTOs
// ============================================================================

export class MessageFilterDto {
  @ApiPropertyOptional({ description: 'Filter by thread status' })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter by related entity type' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Filter by related entity ID' })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Search in messages' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class MessageAttachmentDto {
  @ApiProperty({ description: 'File ID' })
  @IsUUID()
  fileId: string;

  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;
}

export class CreateMessageDto {
  @ApiPropertyOptional({ description: 'Existing thread ID (omit for new thread)' })
  @IsOptional()
  @IsUUID()
  threadId?: string;

  @ApiPropertyOptional({ description: 'Subject (required for new thread)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content: string;

  @ApiPropertyOptional({ description: 'Message priority', enum: MessagePriority })
  @IsOptional()
  @IsEnum(MessagePriority)
  priority?: MessagePriority;

  @ApiPropertyOptional({ description: 'Related entity type' })
  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @ApiPropertyOptional({ description: 'Related entity ID' })
  @IsOptional()
  @IsUUID()
  relatedEntityId?: string;

  @ApiPropertyOptional({ description: 'File attachments', type: [MessageAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}

// ============================================================================
// NOTIFICATION DTOs
// ============================================================================

export class NotificationFilterDto {
  @ApiPropertyOptional({ description: 'Filter by type', enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Show only unread' })
  @IsOptional()
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class MarkNotificationsReadDto {
  @ApiPropertyOptional({ description: 'Notification IDs to mark read (omit for all)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  notificationIds?: string[];
}

// ============================================================================
// DOCUMENT DTOs
// ============================================================================

export class DocumentFilterDto {
  @ApiPropertyOptional({ description: 'Filter by document type' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentTypes?: string[];

  @ApiPropertyOptional({ description: 'Filter by related order ID' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ description: 'Search in document names' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by date range start' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by date range end' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

// ============================================================================
// SAVED SEARCH & FAVORITES DTOs
// ============================================================================

export class SearchFilterDto {
  @ApiProperty({ description: 'Filter field' })
  @IsString()
  field: string;

  @ApiProperty({ description: 'Filter operator' })
  @IsString()
  operator: string;

  @ApiProperty({ description: 'Filter value' })
  value: any;
}

export class CreateSavedSearchDto {
  @ApiProperty({ description: 'Search name' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Entity type (orders, quotes, documents)' })
  @IsString()
  entityType: string;

  @ApiPropertyOptional({ description: 'Search text' })
  @IsOptional()
  @IsString()
  searchText?: string;

  @ApiPropertyOptional({ description: 'Filters', type: [SearchFilterDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SearchFilterDto)
  filters?: SearchFilterDto[];

  @ApiPropertyOptional({ description: 'Sort field' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortDirection?: 'ASC' | 'DESC';

  @ApiPropertyOptional({ description: 'Set as default' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AddFavoriteDto {
  @ApiProperty({ description: 'Entity type (order, quote, document)' })
  @IsString()
  entityType: string;

  @ApiProperty({ description: 'Entity ID' })
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  displayName?: string;
}

// ============================================================================
// ADDRESS DTOs
// ============================================================================

export class AddressDto {
  @ApiPropertyOptional({ description: 'Address ID for existing addresses' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'Address name/label' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Attention line' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  attention?: string;

  @ApiProperty({ description: 'Street address line 1' })
  @IsString()
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({ description: 'Street address line 2' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ description: 'State/Province' })
  @IsString()
  @MaxLength(100)
  state: string;

  @ApiProperty({ description: 'Postal/ZIP code' })
  @IsString()
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ description: 'Country code (ISO 3166-1 alpha-3)' })
  @IsString()
  @MaxLength(3)
  country: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Special delivery instructions' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  specialInstructions?: string;
}

// ============================================================================
// FILE UPLOAD DTOs
// ============================================================================

export class FileUploadDto {
  @ApiProperty({ description: 'Original filename' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiPropertyOptional({ description: 'Document type classification' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export class PortalLoginResponseDto {
  @ApiProperty({ description: 'Access token' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Token expiration in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'User profile' })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: PortalRole;
    permissions: string[];
    customerId: string;
    customerName: string;
  };
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ description: 'Data items' })
  data: T[];

  @ApiProperty({ description: 'Total count' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  pageSize: number;

  @ApiProperty({ description: 'Total pages' })
  totalPages: number;

  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Has previous page' })
  hasPrevious: boolean;
}

export class PortalDashboardResponseDto {
  @ApiProperty({ description: 'Summary counts' })
  summary: {
    activeOrders: number;
    pendingQuotes: number;
    pendingApprovals: number;
    unreadMessages: number;
    shipmentsInTransit: number;
  };

  @ApiProperty({ description: 'Recent orders' })
  recentOrders: any[];

  @ApiProperty({ description: 'Pending approvals' })
  pendingApprovals: any[];

  @ApiProperty({ description: 'Active quotes' })
  activeQuotes: any[];

  @ApiProperty({ description: 'Recent shipments' })
  recentShipments: any[];

  @ApiProperty({ description: 'Recent notifications' })
  notifications: any[];
}

export class OrderDetailResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order number' })
  orderNumber: string;

  @ApiProperty({ description: 'Customer PO' })
  customerPO: string;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiProperty({ description: 'Status display text' })
  statusDisplay: string;

  @ApiProperty({ description: 'Order date' })
  orderDate: string;

  @ApiProperty({ description: 'Due date' })
  dueDate: string;

  @ApiPropertyOptional({ description: 'Promised date' })
  promisedDate?: string;

  @ApiProperty({ description: 'Current stage' })
  currentStage: string;

  @ApiProperty({ description: 'Progress percentage' })
  progressPercent: number;

  @ApiProperty({ description: 'Order total' })
  total: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Line items' })
  lines: any[];

  @ApiProperty({ description: 'Documents' })
  documents: any[];

  @ApiProperty({ description: 'Shipments' })
  shipments: any[];

  @ApiProperty({ description: 'Timeline events' })
  timeline: any[];

  @ApiProperty({ description: 'Ship-to address' })
  shipToAddress: any;

  @ApiProperty({ description: 'Bill-to address' })
  billToAddress: any;
}

export class QuoteDetailResponseDto {
  @ApiProperty({ description: 'Quote ID' })
  id: string;

  @ApiProperty({ description: 'Quote number' })
  quoteNumber: string;

  @ApiProperty({ description: 'Status' })
  status: string;

  @ApiProperty({ description: 'Status display text' })
  statusDisplay: string;

  @ApiProperty({ description: 'Quote date' })
  quoteDate: string;

  @ApiProperty({ description: 'Valid until date' })
  validUntil: string;

  @ApiProperty({ description: 'Days until expiry' })
  daysUntilExpiry: number;

  @ApiProperty({ description: 'Is expired' })
  isExpired: boolean;

  @ApiProperty({ description: 'Total value' })
  totalValue: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;

  @ApiProperty({ description: 'Line items' })
  lines: any[];

  @ApiProperty({ description: 'Documents' })
  documents: any[];

  @ApiPropertyOptional({ description: 'Process animations' })
  animations?: any[];

  @ApiProperty({ description: 'Can convert to order' })
  canConvert: boolean;

  @ApiPropertyOptional({ description: 'Notes' })
  notes?: string;
}

export class RFQResponseDto {
  @ApiProperty({ description: 'RFQ ID' })
  id: string;

  @ApiProperty({ description: 'RFQ number' })
  rfqNumber: string;

  @ApiProperty({ description: 'Status' })
  status: RFQStatus;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Submitted date' })
  submittedAt: string;

  @ApiProperty({ description: 'Line count' })
  lineCount: number;

  @ApiPropertyOptional({ description: 'Associated quote ID' })
  quoteId?: string;

  @ApiPropertyOptional({ description: 'Instant quote result' })
  instantQuoteResult?: any;
}

export class ApprovalResponseDto {
  @ApiProperty({ description: 'Approval ID' })
  id: string;

  @ApiProperty({ description: 'Approval number' })
  approvalNumber: string;

  @ApiProperty({ description: 'Type' })
  type: ApprovalRequestType;

  @ApiProperty({ description: 'Status' })
  status: ApprovalStatus;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Requested date' })
  requestedAt: string;

  @ApiPropertyOptional({ description: 'Deadline' })
  deadline?: string;

  @ApiProperty({ description: 'Is urgent' })
  isUrgent: boolean;

  @ApiProperty({ description: 'Related documents' })
  documents: any[];

  @ApiPropertyOptional({ description: 'Related order' })
  relatedOrder?: any;

  @ApiProperty({ description: 'History' })
  history: any[];
}

export class MessageThreadResponseDto {
  @ApiProperty({ description: 'Thread ID' })
  id: string;

  @ApiProperty({ description: 'Subject' })
  subject: string;

  @ApiProperty({ description: 'Message count' })
  messageCount: number;

  @ApiProperty({ description: 'Unread count' })
  unreadCount: number;

  @ApiProperty({ description: 'Last message preview' })
  lastMessage: {
    content: string;
    senderName: string;
    sentAt: string;
  };

  @ApiPropertyOptional({ description: 'Related entity' })
  relatedEntity?: {
    type: string;
    id: string;
    reference: string;
  };

  @ApiProperty({ description: 'Created date' })
  createdAt: string;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: string;
}

export class NotificationResponseDto {
  @ApiProperty({ description: 'Notification ID' })
  id: string;

  @ApiProperty({ description: 'Type' })
  type: NotificationType;

  @ApiProperty({ description: 'Title' })
  title: string;

  @ApiProperty({ description: 'Message' })
  message: string;

  @ApiProperty({ description: 'Is read' })
  isRead: boolean;

  @ApiProperty({ description: 'Created date' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Action URL' })
  actionUrl?: string;

  @ApiPropertyOptional({ description: 'Related entity' })
  relatedEntity?: {
    type: string;
    id: string;
  };
}
