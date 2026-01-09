/**
 * FERALIS MANUFACTURING PLATFORM
 * Phase 7: Analytics & Customer Portal
 * 
 * Customer Portal Module - Entity Definitions
 */

// ============================================================================
// ENUMERATIONS
// ============================================================================

export enum PortalRole {
  ADMIN = 'ADMIN',
  BUYER = 'BUYER',
  ENGINEER = 'ENGINEER',
  VIEWER = 'VIEWER'
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  LOGGED_OUT = 'LOGGED_OUT'
}

export enum RFQStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PROCESSING = 'PROCESSING',
  QUOTED = 'QUOTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  DELEGATED = 'DELEGATED'
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  ARCHIVED = 'ARCHIVED'
}

export enum NotificationType {
  ORDER_STATUS = 'ORDER_STATUS',
  QUOTE_READY = 'QUOTE_READY',
  SHIPMENT = 'SHIPMENT',
  APPROVAL_REQUIRED = 'APPROVAL_REQUIRED',
  DOCUMENT_AVAILABLE = 'DOCUMENT_AVAILABLE',
  MESSAGE = 'MESSAGE',
  SYSTEM = 'SYSTEM',
  ALERT = 'ALERT'
}

export enum ApprovalRequestType {
  FAI = 'FAI',
  DEVIATION = 'DEVIATION',
  CHANGE_ORDER = 'CHANGE_ORDER',
  SAMPLE = 'SAMPLE',
  DOCUMENT = 'DOCUMENT'
}

export enum DeliveryUrgency {
  STANDARD = 'STANDARD',
  RUSH = 'RUSH',
  CRITICAL = 'CRITICAL'
}

export enum MessagePriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum SenderType {
  CUSTOMER = 'CUSTOMER',
  INTERNAL = 'INTERNAL',
  SYSTEM = 'SYSTEM'
}

export enum DocumentAccessType {
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  PRINT = 'PRINT'
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface AuditFields {
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
  updatedBy?: string;
}

export interface OrgScopedEntity {
  organizationId: string;
}

// ============================================================================
// PORTAL CONFIGURATION ENTITIES
// ============================================================================

export interface CustomerPortalConfig extends AuditFields {
  id: string;
  customerId: string;
  organizationId: string;
  
  // Access settings
  isEnabled: boolean;
  instantQuoteEnabled: boolean;
  orderPlacementEnabled: boolean;
  documentAccessEnabled: boolean;
  approvalWorkflowEnabled: boolean;
  messagingEnabled: boolean;
  
  // Document visibility
  visibleDocumentTypes: string[];
  
  // Pricing visibility
  showPricing: boolean;
  showCostBreakdown: boolean;
  
  // Notification preferences
  notificationPreferences: NotificationPreferences;
  
  // Branding
  customBranding: CustomBranding;
  welcomeMessage?: string;
  
  // Limits
  maxFileUploadMb: number;
  maxRfqPerMonth?: number;
}

export interface NotificationPreferences {
  orderStatusChanges: boolean;
  quoteReady: boolean;
  shipmentUpdates: boolean;
  approvalReminders: boolean;
  documentAvailable: boolean;
  messageNotifications: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface CustomBranding {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}

// ============================================================================
// PORTAL USER ENTITIES
// ============================================================================

export interface PortalUser extends AuditFields {
  id: string;
  userId: string;
  customerId: string;
  contactId?: string;
  
  // Role and permissions
  portalRole: PortalRole;
  permissions: string[];
  
  // Access control
  isActive: boolean;
  canPlaceOrders: boolean;
  canApprove: boolean;
  canViewPricing: boolean;
  canUploadFiles: boolean;
  
  // Approval limits
  approvalLimit?: number;
  
  // Preferences
  defaultShipToId?: string;
  notificationPreferences: NotificationPreferences;
  
  // Activity tracking
  lastLoginAt?: Date;
  lastActivityAt?: Date;
}

export interface PortalSession {
  id: string;
  portalUserId: string;
  
  // Session details
  sessionToken: string;
  refreshToken?: string;
  
  // Device info
  userAgent?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  
  // Status
  status: SessionStatus;
  
  // Timing
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  endedAt?: Date;
}

export interface PortalUserProfile {
  id: string;
  userId: string;
  customerId: string;
  customerName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  department?: string;
  portalRole: PortalRole;
  permissions: string[];
  canPlaceOrders: boolean;
  canApprove: boolean;
  canViewPricing: boolean;
  approvalLimit?: number;
  notificationPreferences: NotificationPreferences;
  lastLoginAt?: Date;
}

// ============================================================================
// RFQ ENTITIES
// ============================================================================

export interface RFQ extends AuditFields {
  id: string;
  organizationId: string;
  customerId: string;
  
  // RFQ identification
  rfqNumber: string;
  customerReference?: string;
  
  // Submitter
  submittedBy: string;
  submittedAt: Date;
  
  // Status
  status: RFQStatus;
  
  // Requirements
  materialPreference?: string;
  finishRequirements?: string;
  toleranceRequirements?: string;
  quantityRequested?: number;
  quantityTiers: number[];
  
  // Delivery
  requestedDeliveryDate?: Date;
  deliveryUrgency: DeliveryUrgency;
  
  // Files
  cadFileIds: string[];
  drawingFileIds: string[];
  supportingFileIds: string[];
  
  // Notes
  customerNotes?: string;
  internalNotes?: string;
  
  // Processing
  assignedTo?: string;
  assignedAt?: Date;
  
  // Quote linkage
  quoteId?: string;
  quoteSentAt?: Date;
  
  // Instant quote
  instantQuoteEligible: boolean;
  instantQuoteResult?: InstantQuoteResult;
}

export interface RFQLine extends AuditFields {
  id: string;
  rfqId: string;
  
  // Line identification
  lineNumber: number;
  
  // Part info
  partName: string;
  partNumber?: string;
  description?: string;
  
  // Files
  cadFileId?: string;
  drawingFileId?: string;
  
  // Requirements
  material?: string;
  finish?: string;
  quantity: number;
  
  // Analysis results
  geometryAnalysis?: GeometryAnalysis;
  manufacturabilityScore?: number;
  manufacturabilityIssues?: ManufacturabilityIssue[];
  
  // Notes
  notes?: string;
}

export interface InstantQuoteResult {
  eligible: boolean;
  reason?: string;
  unitPrice?: number;
  totalPrice?: number;
  leadTimeDays?: number;
  validUntil?: Date;
  quantityBreaks?: QuantityBreak[];
}

export interface QuantityBreak {
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  leadTimeDays: number;
}

export interface GeometryAnalysis {
  boundingBox: BoundingBox;
  volume?: number;
  surfaceArea?: number;
  features: Feature[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

export interface BoundingBox {
  length: number;
  width: number;
  height: number;
  unit: string;
}

export interface Feature {
  type: string;
  count: number;
  details?: Record<string, any>;
}

export interface ManufacturabilityIssue {
  severity: 'INFO' | 'WARNING' | 'ERROR';
  category: string;
  description: string;
  suggestion?: string;
  location?: string;
}

// ============================================================================
// APPROVAL ENTITIES
// ============================================================================

export interface ApprovalRequest extends AuditFields {
  id: string;
  organizationId: string;
  customerId: string;
  
  // Request identification
  requestNumber: string;
  requestType: ApprovalRequestType;
  
  // Related entity
  entityType: string;
  entityId: string;
  
  // Request details
  title: string;
  description?: string;
  
  // Documents
  documentIds: string[];
  
  // Status
  status: ApprovalStatus;
  
  // Deadline
  deadline?: Date;
  reminderSentAt?: Date;
  
  // Assignment
  assignedTo?: string;
  delegatedTo?: string;
  delegatedAt?: Date;
  delegationNotes?: string;
  
  // Resolution
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  digitalSignature?: DigitalSignature;
  
  // Internal tracking
  internalOwnerId?: string;
}

export interface ApprovalHistory {
  id: string;
  approvalRequestId: string;
  
  // Action
  action: ApprovalAction;
  actionBy: string;
  actionAt: Date;
  
  // Details
  comments?: string;
  attachments: string[];
  
  // Signature
  digitalSignature?: DigitalSignature;
  ipAddress?: string;
}

export type ApprovalAction = 'VIEWED' | 'COMMENTED' | 'APPROVED' | 'REJECTED' | 'DELEGATED' | 'REQUESTED_INFO';

export interface DigitalSignature {
  signatureData: string;
  signedAt: Date;
  signerName: string;
  signerEmail: string;
  ipAddress: string;
  userAgent?: string;
  certificateHash?: string;
}

export interface PendingApproval {
  id: string;
  requestNumber: string;
  requestType: ApprovalRequestType;
  title: string;
  description?: string;
  entityType: string;
  entityId: string;
  deadline?: Date;
  daysRemaining?: number;
  isOverdue: boolean;
  documents: ApprovalDocument[];
  createdAt: Date;
}

export interface ApprovalDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  documentType: string;
  previewUrl?: string;
  downloadUrl: string;
}

// ============================================================================
// MESSAGING ENTITIES
// ============================================================================

export interface MessageThread extends AuditFields {
  id: string;
  organizationId: string;
  customerId: string;
  
  // Thread identification
  subject: string;
  
  // Related entity
  entityType?: string;
  entityId?: string;
  
  // Tags
  tags: string[];
  priority: MessagePriority;
  
  // Status
  isOpen: boolean;
  isArchived: boolean;
  
  // Internal assignment
  assignedTo?: string;
  
  // Metrics
  messageCount: number;
  lastMessageAt?: Date;
  lastCustomerMessageAt?: Date;
  lastInternalMessageAt?: Date;
  
  // SLA
  slaDeadline?: Date;
  slaBreached: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  
  // Sender
  senderType: SenderType;
  senderPortalUserId?: string;
  senderUserId?: string;
  senderName?: string;
  
  // Content
  body: string;
  bodyHtml?: string;
  
  // Attachments
  attachmentIds: string[];
  attachments?: MessageAttachment[];
  
  // Status
  status: MessageStatus;
  
  // Read tracking
  readByCustomer: boolean;
  readByCustomerAt?: Date;
  readByInternal: boolean;
  readByInternalAt?: Date;
  
  // Audit
  createdAt: Date;
  editedAt?: Date;
  isEdited: boolean;
}

export interface MessageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
}

export interface ThreadSummary {
  id: string;
  subject: string;
  entityType?: string;
  entityId?: string;
  entityReference?: string;
  priority: MessagePriority;
  isOpen: boolean;
  messageCount: number;
  unreadCount: number;
  lastMessage?: MessagePreview;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessagePreview {
  id: string;
  senderType: SenderType;
  senderName: string;
  bodyPreview: string;
  createdAt: Date;
  hasAttachments: boolean;
}

// ============================================================================
// NOTIFICATION ENTITIES
// ============================================================================

export interface PortalNotification {
  id: string;
  portalUserId: string;
  
  // Notification details
  notificationType: NotificationType;
  title: string;
  body?: string;
  
  // Related entity
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  
  // Status
  isRead: boolean;
  readAt?: Date;
  isDismissed: boolean;
  dismissedAt?: Date;
  
  // Delivery
  channels: string[];
  emailSent: boolean;
  emailSentAt?: Date;
  smsSent: boolean;
  smsSentAt?: Date;
  
  // Priority
  priority: MessagePriority;
  expiresAt?: Date;
  
  // Audit
  createdAt: Date;
}

export interface NotificationSummary {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  recent: PortalNotification[];
}

// ============================================================================
// ACTIVITY ENTITIES
// ============================================================================

export interface PortalActivityLog {
  id: string;
  portalUserId: string;
  customerId: string;
  
  // Activity details
  activityType: string;
  activityDescription?: string;
  
  // Related entity
  entityType?: string;
  entityId?: string;
  
  // Context
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamp
  createdAt: Date;
}

export interface DocumentAccessLog {
  id: string;
  portalUserId: string;
  documentId: string;
  
  // Access details
  accessType: DocumentAccessType;
  
  // Context
  ipAddress?: string;
  userAgent?: string;
  
  // Timestamp
  accessedAt: Date;
}

// ============================================================================
// SAVED ITEMS ENTITIES
// ============================================================================

export interface SavedSearch extends AuditFields {
  id: string;
  portalUserId: string;
  
  // Search details
  name: string;
  searchType: 'ORDERS' | 'QUOTES' | 'DOCUMENTS' | 'SHIPMENTS';
  
  // Criteria
  criteria: SearchCriteria;
  
  // Display
  displayColumns: string[];
  sortBy?: string;
  sortDirection: 'ASC' | 'DESC';
  
  // Usage
  lastUsedAt?: Date;
  useCount: number;
}

export interface SearchCriteria {
  filters: SearchFilter[];
  dateRange?: DateRange;
  textSearch?: string;
}

export interface SearchFilter {
  field: string;
  operator: 'EQ' | 'NE' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'IN' | 'CONTAINS';
  value: any;
}

export interface DateRange {
  field: string;
  start?: Date;
  end?: Date;
}

export interface Favorite {
  id: string;
  portalUserId: string;
  
  // Favorite item
  entityType: string;
  entityId: string;
  
  // Display
  displayName?: string;
  
  // Audit
  createdAt: Date;
}

// ============================================================================
// ORDER VIEW ENTITIES (Customer Portal View)
// ============================================================================

export interface PortalOrderSummary {
  id: string;
  orderNumber: string;
  customerPo?: string;
  status: string;
  statusDisplay: string;
  priority: string;
  
  // Dates
  orderDate: Date;
  dueDate: Date;
  promisedDate?: Date;
  shipDate?: Date;
  
  // Progress
  progressPercent: number;
  currentStage: string;
  
  // Financials (if visible)
  subtotal?: number;
  total?: number;
  currency: string;
  
  // Lines summary
  lineCount: number;
  
  // Milestones
  milestones?: OrderMilestone[];
}

export interface OrderMilestone {
  type: string;
  name: string;
  plannedDate?: Date;
  actualDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETE';
}

export interface PortalOrderDetail extends PortalOrderSummary {
  // Contact info
  contactName?: string;
  
  // Addresses
  shipToAddress?: AddressSummary;
  billToAddress?: AddressSummary;
  
  // Shipping
  shippingMethod?: string;
  
  // Lines
  lines: PortalOrderLine[];
  
  // Documents
  documents: OrderDocument[];
  
  // Shipments
  shipments: ShipmentSummary[];
  
  // Timeline
  timeline: OrderTimelineEvent[];
}

export interface PortalOrderLine {
  id: string;
  lineNumber: number;
  partNumber: string;
  customerPartNumber?: string;
  description: string;
  quantityOrdered: number;
  quantityShipped: number;
  quantityRemaining: number;
  unitPrice?: number;
  lineTotal?: number;
  status: string;
  requestedDate?: Date;
  promisedDate?: Date;
  progressPercent: number;
}

export interface AddressSummary {
  name: string;
  attention?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderDocument {
  id: string;
  fileName: string;
  documentType: string;
  fileSize: number;
  uploadedAt: Date;
  downloadUrl: string;
}

export interface ShipmentSummary {
  id: string;
  shipmentNumber: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  status: string;
  shipDate?: Date;
  deliveryDate?: Date;
  packageCount: number;
}

export interface OrderTimelineEvent {
  type: string;
  title: string;
  description?: string;
  timestamp: Date;
  status: 'COMPLETE' | 'CURRENT' | 'PENDING';
}

// ============================================================================
// QUOTE VIEW ENTITIES (Customer Portal View)
// ============================================================================

export interface PortalQuoteSummary {
  id: string;
  quoteNumber: string;
  rfqReference?: string;
  status: string;
  statusDisplay: string;
  version: number;
  
  // Dates
  quoteDate: Date;
  validUntil: Date;
  daysUntilExpiry: number;
  isExpired: boolean;
  
  // Value
  totalValue?: number;
  currency: string;
  
  // Lines summary
  lineCount: number;
  
  // Actions
  canAccept: boolean;
  canRequestRevision: boolean;
}

export interface PortalQuoteDetail extends PortalQuoteSummary {
  // Notes
  notes?: string;
  
  // Lines
  lines: PortalQuoteLine[];
  
  // Documents
  documents: QuoteDocument[];
  
  // Process animations (if available)
  animations: ProcessAnimation[];
}

export interface PortalQuoteLine {
  id: string;
  lineNumber: number;
  partName: string;
  partNumber?: string;
  description?: string;
  material?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  leadTimeDays?: number;
  
  // Analysis
  manufacturabilityScore?: number;
  hasIssues: boolean;
  
  // Visualization
  thumbnailUrl?: string;
  animationUrl?: string;
}

export interface QuoteDocument {
  id: string;
  fileName: string;
  documentType: string;
  fileSize: number;
  downloadUrl: string;
}

export interface ProcessAnimation {
  id: string;
  lineId: string;
  type: 'CNC' | 'SHEET_METAL' | 'LASER';
  thumbnailUrl: string;
  animationUrl: string;
  duration: number;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface PortalLoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceFingerprint?: string;
}

export interface PortalLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: PortalUserProfile;
}

export interface CreateRFQRequest {
  customerReference?: string;
  materialPreference?: string;
  finishRequirements?: string;
  toleranceRequirements?: string;
  quantityTiers?: number[];
  requestedDeliveryDate?: Date;
  deliveryUrgency?: DeliveryUrgency;
  customerNotes?: string;
  lines: CreateRFQLineRequest[];
}

export interface CreateRFQLineRequest {
  partName: string;
  partNumber?: string;
  description?: string;
  material?: string;
  finish?: string;
  quantity: number;
  cadFileId?: string;
  drawingFileId?: string;
  notes?: string;
}

export interface SubmitApprovalRequest {
  action: 'APPROVE' | 'REJECT';
  comments?: string;
  signature?: DigitalSignature;
}

export interface DelegateApprovalRequest {
  delegateTo: string;
  notes?: string;
}

export interface CreateMessageRequest {
  threadId?: string;
  subject?: string;
  entityType?: string;
  entityId?: string;
  body: string;
  attachmentIds?: string[];
  priority?: MessagePriority;
}

export interface PortalOrdersRequest {
  page?: number;
  pageSize?: number;
  status?: string[];
  search?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  dateFrom?: Date;
  dateTo?: Date;
}

export interface PortalOrdersResponse {
  orders: PortalOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PortalQuotesRequest {
  page?: number;
  pageSize?: number;
  status?: string[];
  search?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  includeExpired?: boolean;
}

export interface PortalQuotesResponse {
  quotes: PortalQuoteSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ConvertQuoteToOrderRequest {
  quoteId: string;
  poNumber: string;
  poDocumentId?: string;
  shipToAddressId?: string;
  requestedDeliveryDate?: Date;
  notes?: string;
}

export interface PortalDashboardResponse {
  summary: PortalDashboardSummary;
  recentOrders: PortalOrderSummary[];
  pendingApprovals: PendingApproval[];
  activeQuotes: PortalQuoteSummary[];
  recentShipments: ShipmentSummary[];
  notifications: PortalNotification[];
}

export interface PortalDashboardSummary {
  openOrders: number;
  ordersInProduction: number;
  ordersShippedThisMonth: number;
  pendingQuotes: number;
  pendingApprovals: number;
  unreadMessages: number;
}
