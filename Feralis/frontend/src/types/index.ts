// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: UserRole;
  organizationId: string;
  facilityId?: string;
  permissions: string[];
  mfaEnabled: boolean;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'OPERATOR'
  | 'QUALITY_INSPECTOR'
  | 'CUSTOMER';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface MFAVerification {
  token: string;
  code: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  requiresMFA?: boolean;
  mfaToken?: string;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  timestamp: string;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardSummary {
  orders: {
    total: number;
    inProduction: number;
    readyToShip: number;
    shipped: number;
  };
  quotes: {
    pending: number;
    expiringSoon: number;
  };
  approvals: {
    pending: number;
    urgent: number;
  };
  messages: {
    unread: number;
  };
}

export interface KPIMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  target: number;
  variance: number;
  variancePercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  status: 'ON_TARGET' | 'WARNING' | 'CRITICAL' | 'EXCEEDS';
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export interface Order {
  id: string;
  orderNumber: string;
  customerPO: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  totalValue: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'DRAFT'
  | 'CONFIRMED'
  | 'IN_PRODUCTION'
  | 'FINISHING'
  | 'PACKAGING'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

// ============================================================================
// QUOTE TYPES
// ============================================================================

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  status: QuoteStatus;
  totalValue: number;
  validUntil: string;
  lineCount: number;
  createdAt: string;
}

export type QuoteStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SENT'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CONVERTED';

// ============================================================================
// PRODUCTION TYPES
// ============================================================================

export interface Machine {
  id: string;
  name: string;
  type: string;
  status: MachineStatus;
  currentOEE: number;
  availability: number;
  performance: number;
  quality: number;
}

export type MachineStatus =
  | 'RUNNING'
  | 'IDLE'
  | 'SETUP'
  | 'MAINTENANCE'
  | 'ALARM'
  | 'OFFLINE';

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRead: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'ORDER_UPDATE'
  | 'QUOTE_RESPONSE'
  | 'SHIPMENT_STATUS'
  | 'APPROVAL_REQUIRED'
  | 'SYSTEM_ALERT'
  | 'QUALITY_ISSUE';

// ============================================================================
// FORM TYPES
// ============================================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  required?: boolean;
  validation?: any;
}
