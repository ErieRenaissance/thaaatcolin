/**
 * Feralis Manufacturing Platform
 * Customer Portal Dashboard Component
 * Phase 7: Analytics & Customer Portal Implementation
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DashboardSummary {
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

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerPO: string;
  status: string;
  statusDisplay: string;
  dueDate: string;
  totalValue: number;
  progress: number;
  currentStage: string;
}

interface PendingApproval {
  id: string;
  type: string;
  title: string;
  orderNumber?: string;
  dueDate: string;
  isOverdue: boolean;
  priority: string;
}

interface ActiveQuote {
  id: string;
  quoteNumber: string;
  totalValue: number;
  validUntil: string;
  daysUntilExpiry: number;
  lineCount: number;
}

interface RecentShipment {
  id: string;
  shipmentNumber: string;
  orderNumber: string;
  carrier: string;
  trackingNumber?: string;
  status: string;
  shipDate: string;
  expectedDelivery?: string;
}

interface PortalNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

interface PortalDashboardData {
  summary: DashboardSummary;
  recentOrders: RecentOrder[];
  pendingApprovals: PendingApproval[];
  activeQuotes: ActiveQuote[];
  recentShipments: RecentShipment[];
  notifications: PortalNotification[];
}

// ============================================================================
// API HOOK
// ============================================================================

const usePortalDashboard = () => {
  const [data, setData] = useState<PortalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/portal/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('portalToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const dashboardData = await response.json();
      setData(dashboardData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    // Refresh every 2 minutes
    const interval = setInterval(fetchDashboard, 120000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return { data, loading, error, refresh: fetchDashboard };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    IN_PRODUCTION: 'bg-yellow-100 text-yellow-800',
    FINISHING: 'bg-purple-100 text-purple-800',
    PACKAGING: 'bg-indigo-100 text-indigo-800',
    READY_TO_SHIP: 'bg-cyan-100 text-cyan-800',
    SHIPPED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    ON_HOLD: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
};

// ============================================================================
// SUMMARY CARD COMPONENT
// ============================================================================

const SummaryCard: React.FC<{
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  onClick?: () => void;
}> = ({ title, value, subtitle, icon, color, onClick }) => {
  return (
    <div
      className={`bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>{icon}</div>
      </div>
    </div>
  );
};

// ============================================================================
// ORDER CARD COMPONENT
// ============================================================================

const OrderCard: React.FC<{ order: RecentOrder }> = ({ order }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium text-gray-900">{order.orderNumber}</h4>
          <p className="text-sm text-gray-500">PO: {order.customerPO}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
          {order.statusDisplay}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Due Date</span>
          <span className="font-medium">{formatDate(order.dueDate)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Value</span>
          <span className="font-medium">{formatCurrency(order.totalValue)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Stage</span>
          <span className="font-medium">{order.currentStage}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{order.progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full"
            style={{ width: `${order.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// APPROVAL ITEM COMPONENT
// ============================================================================

const ApprovalItem: React.FC<{ approval: PendingApproval }> = ({ approval }) => {
  return (
    <div
      className={`p-4 rounded-lg border ${
        approval.isOverdue
          ? 'border-red-200 bg-red-50'
          : approval.priority === 'HIGH'
          ? 'border-yellow-200 bg-yellow-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-gray-900">{approval.title}</h4>
          {approval.orderNumber && (
            <p className="text-sm text-gray-500">Order: {approval.orderNumber}</p>
          )}
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            approval.isOverdue
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {approval.type}
        </span>
      </div>
      <div className="mt-2 flex items-center text-sm">
        <svg className="w-4 h-4 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className={approval.isOverdue ? 'text-red-600' : 'text-gray-500'}>
          Due: {formatDate(approval.dueDate)}
          {approval.isOverdue && ' (Overdue)'}
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// QUOTE ITEM COMPONENT
// ============================================================================

const QuoteItem: React.FC<{ quote: ActiveQuote }> = ({ quote }) => {
  const isExpiringSoon = quote.daysUntilExpiry <= 7;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <h4 className="font-medium text-gray-900">{quote.quoteNumber}</h4>
        <p className="text-sm text-gray-500">{quote.lineCount} line items</p>
      </div>
      <div className="text-right">
        <p className="font-medium text-gray-900">{formatCurrency(quote.totalValue)}</p>
        <p
          className={`text-sm ${
            isExpiringSoon ? 'text-red-600' : 'text-gray-500'
          }`}
        >
          {quote.daysUntilExpiry} days left
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// SHIPMENT ITEM COMPONENT
// ============================================================================

const ShipmentItem: React.FC<{ shipment: RecentShipment }> = ({ shipment }) => {
  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <div className="p-2 bg-green-100 rounded-lg mr-3">
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
          </svg>
        </div>
        <div>
          <h4 className="font-medium text-gray-900">{shipment.orderNumber}</h4>
          <p className="text-sm text-gray-500">
            {shipment.carrier}
            {shipment.trackingNumber && ` - ${shipment.trackingNumber}`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-gray-900">{shipment.status}</p>
        <p className="text-xs text-gray-500">
          {shipment.expectedDelivery
            ? `ETA: ${formatDate(shipment.expectedDelivery)}`
            : `Shipped: ${formatDate(shipment.shipDate)}`}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// NOTIFICATION ITEM COMPONENT
// ============================================================================

const NotificationItem: React.FC<{
  notification: PortalNotification;
  onMarkRead: (id: string) => void;
}> = ({ notification, onMarkRead }) => {
  return (
    <div
      className={`p-3 rounded-lg cursor-pointer hover:bg-gray-50 ${
        !notification.isRead ? 'bg-blue-50' : ''
      }`}
      onClick={() => !notification.isRead && onMarkRead(notification.id)}
    >
      <div className="flex items-start">
        {!notification.isRead && (
          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-2 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
          <p className="text-sm text-gray-500 truncate">{notification.message}</p>
          <p className="text-xs text-gray-400 mt-1">
            {new Date(notification.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN PORTAL DASHBOARD COMPONENT
// ============================================================================

export const PortalDashboard: React.FC = () => {
  const { data, loading, error, refresh } = usePortalDashboard();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);

  useEffect(() => {
    if (data) {
      setNotifications(data.notifications);
    }
  }, [data]);

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/v1/portal/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('portalToken')}`,
        },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error loading dashboard</h3>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, recentOrders, pendingApprovals, activeQuotes, recentShipments } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow-lg p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome to Your Customer Portal</h1>
        <p className="mt-2 text-blue-100">
          Track orders, manage quotes, and stay connected with your manufacturing partner.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="Active Orders"
          value={summary.orders.total}
          subtitle={`${summary.orders.inProduction} in production`}
          color="bg-blue-100 text-blue-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />

        <SummaryCard
          title="Pending Quotes"
          value={summary.quotes.pending}
          subtitle={summary.quotes.expiringSoon > 0 ? `${summary.quotes.expiringSoon} expiring soon` : undefined}
          color="bg-green-100 text-green-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <SummaryCard
          title="Awaiting Approval"
          value={summary.approvals.pending}
          subtitle={summary.approvals.urgent > 0 ? `${summary.approvals.urgent} urgent` : undefined}
          color="bg-yellow-100 text-yellow-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <SummaryCard
          title="Unread Messages"
          value={summary.messages.unread}
          color="bg-purple-100 text-purple-600"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                <a href="/portal/orders" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All →
                </a>
              </div>
            </div>
            <div className="p-6">
              {recentOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentOrders.slice(0, 4).map((order) => (
                    <OrderCard key={order.id} order={order} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No recent orders</p>
              )}
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-medium">
                  {notifications.filter((n) => !n.isRead).length} new
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkNotificationRead}
                  />
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No notifications</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Approvals */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Pending Approvals</h2>
              <a href="/portal/approvals" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {pendingApprovals.length > 0 ? (
              pendingApprovals.slice(0, 3).map((approval) => (
                <ApprovalItem key={approval.id} approval={approval} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No pending approvals</p>
            )}
          </div>
        </div>

        {/* Active Quotes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Active Quotes</h2>
              <a href="/portal/quotes" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {activeQuotes.length > 0 ? (
              activeQuotes.slice(0, 4).map((quote) => (
                <QuoteItem key={quote.id} quote={quote} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-4">No active quotes</p>
            )}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recent Shipments</h2>
              <a href="/portal/shipments" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All →
              </a>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {recentShipments.length > 0 ? (
              recentShipments.slice(0, 4).map((shipment) => (
                <ShipmentItem key={shipment.id} shipment={shipment} />
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">No recent shipments</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/portal/rfq/new"
            className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm font-medium text-blue-800">Request Quote</span>
          </a>
          <a
            href="/portal/orders"
            className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <svg className="w-8 h-8 text-green-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-medium text-green-800">Track Orders</span>
          </a>
          <a
            href="/portal/documents"
            className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <svg className="w-8 h-8 text-purple-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-purple-800">Documents</span>
          </a>
          <a
            href="/portal/messages"
            className="flex flex-col items-center p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
          >
            <svg className="w-8 h-8 text-yellow-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium text-yellow-800">Messages</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PortalDashboard;
