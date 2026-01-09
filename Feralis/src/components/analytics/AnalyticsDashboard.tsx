/**
 * Feralis Manufacturing Platform
 * Analytics Dashboard Component
 * Phase 7: Analytics & Customer Portal Implementation
 */

import React, { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface KPISnapshot {
  id: string;
  name: string;
  category: string;
  currentValue: number;
  previousValue: number;
  target: number;
  variance: number;
  variancePercent: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  trendPercent: number;
  status: 'ON_TARGET' | 'WARNING' | 'CRITICAL' | 'EXCEEDS';
  unit: string;
  format: string;
  sparklineData: number[];
  periodLabel: string;
}

interface AnalyticsSummary {
  period: { start: string; end: string };
  production: {
    totalOrders: number;
    completedOrders: number;
    totalParts: number;
    goodParts: number;
    scrapParts: number;
    productionHours: number;
    averageOEE: number;
  };
  quality: {
    firstPassYield: number;
    defectRate: number;
    ncrCount: number;
    customerReturns: number;
  };
  delivery: {
    onTimeRate: number;
    earlyCount: number;
    lateCount: number;
    averageLeadTime: number;
  };
  financial: {
    revenue: number;
    cost: number;
    margin: number;
    marginPercent: number;
  };
  trends: {
    productionTrend: number[];
    qualityTrend: number[];
    deliveryTrend: number[];
    revenueTrend: number[];
  };
}

interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

interface Dashboard {
  id: string;
  name: string;
  widgets: DashboardWidget[];
}

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useAnalyticsData = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [kpis, setKpis] = useState<KPISnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch analytics summary
      const summaryRes = await fetch('/api/v1/analytics/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          periodType: 'MONTH',
          compareWithPrevious: true,
        }),
      });
      
      if (!summaryRes.ok) throw new Error('Failed to fetch analytics summary');
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      // Fetch KPIs
      const kpiRes = await fetch('/api/v1/analytics/kpis?featured=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!kpiRes.ok) throw new Error('Failed to fetch KPIs');
      const kpiData = await kpiRes.json();
      
      // Fetch snapshots for each KPI
      const snapshots = await Promise.all(
        kpiData.map(async (kpi: any) => {
          const res = await fetch(`/api/v1/analytics/kpis/${kpi.id}/snapshot`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
          });
          return res.ok ? res.json() : null;
        })
      );
      
      setKpis(snapshots.filter(Boolean));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return { summary, kpis, loading, error, refresh: fetchData };
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const formatValue = (value: number, format: string): string => {
  switch (format) {
    case 'PERCENT':
      return `${value.toFixed(1)}%`;
    case 'CURRENCY':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'NUMBER':
      return new Intl.NumberFormat('en-US').format(value);
    case 'DECIMAL':
      return value.toFixed(2);
    default:
      return value.toString();
  }
};

const TrendIndicator: React.FC<{ trend: string; percent: number }> = ({
  trend,
  percent,
}) => {
  const color =
    trend === 'UP'
      ? 'text-green-600'
      : trend === 'DOWN'
      ? 'text-red-600'
      : 'text-gray-500';
  const icon =
    trend === 'UP' ? '↑' : trend === 'DOWN' ? '↓' : '→';

  return (
    <span className={`inline-flex items-center ${color} text-sm font-medium`}>
      {icon} {Math.abs(percent).toFixed(1)}%
    </span>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    ON_TARGET: 'bg-green-100 text-green-800',
    WARNING: 'bg-yellow-100 text-yellow-800',
    CRITICAL: 'bg-red-100 text-red-800',
    EXCEEDS: 'bg-blue-100 text-blue-800',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-800'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};

const Sparkline: React.FC<{ data: number[]; height?: number }> = ({
  data,
  height = 30,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 100;
  const pointWidth = width / (data.length - 1);

  const points = data
    .map((v, i) => {
      const x = i * pointWidth;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-blue-500"
      />
    </svg>
  );
};

// ============================================================================
// KPI CARD COMPONENT
// ============================================================================

const KPICard: React.FC<{ kpi: KPISnapshot }> = ({ kpi }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {kpi.name}
          </h3>
          <p className="text-xs text-gray-400">{kpi.periodLabel}</p>
        </div>
        <StatusBadge status={kpi.status} />
      </div>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">
            {formatValue(kpi.currentValue, kpi.format)}
          </p>
          <div className="flex items-center mt-1 space-x-2">
            <TrendIndicator trend={kpi.trend} percent={kpi.trendPercent} />
            <span className="text-sm text-gray-500">
              vs {formatValue(kpi.previousValue, kpi.format)}
            </span>
          </div>
        </div>
        <Sparkline data={kpi.sparklineData} />
      </div>

      {kpi.target && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Target</span>
            <span className="font-medium">
              {formatValue(kpi.target, kpi.format)}
            </span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                kpi.status === 'CRITICAL'
                  ? 'bg-red-500'
                  : kpi.status === 'WARNING'
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min(100, (kpi.currentValue / kpi.target) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SUMMARY CARD COMPONENT
// ============================================================================

const SummaryCard: React.FC<{
  title: string;
  items: { label: string; value: string | number; trend?: number }[];
  icon: React.ReactNode;
}> = ({ title, items, icon }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{icon}</div>
        <h3 className="ml-3 text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{item.label}</span>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900">{item.value}</span>
              {item.trend !== undefined && (
                <span
                  className={`text-xs ${
                    item.trend >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {item.trend >= 0 ? '+' : ''}
                  {item.trend.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN ANALYTICS DASHBOARD COMPONENT
// ============================================================================

export const AnalyticsDashboard: React.FC = () => {
  const { summary, kpis, loading, error, refresh } = useAnalyticsData();
  const [selectedPeriod, setSelectedPeriod] = useState('MONTH');

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
        <h3 className="text-red-800 font-medium">Error loading analytics</h3>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Real-time insights into your manufacturing operations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="DAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
            <option value="QUARTER">This Quarter</option>
            <option value="YEAR">This Year</option>
          </select>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Production"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            }
            items={[
              { label: 'Total Orders', value: summary.production.totalOrders },
              { label: 'Parts Produced', value: summary.production.totalParts.toLocaleString() },
              { label: 'Average OEE', value: `${summary.production.averageOEE.toFixed(1)}%` },
              { label: 'Production Hours', value: summary.production.productionHours.toFixed(0) },
            ]}
          />

          <SummaryCard
            title="Quality"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            items={[
              { label: 'First Pass Yield', value: `${summary.quality.firstPassYield.toFixed(1)}%` },
              { label: 'Defect Rate', value: `${summary.quality.defectRate.toFixed(2)}%` },
              { label: 'NCR Count', value: summary.quality.ncrCount },
              { label: 'Customer Returns', value: summary.quality.customerReturns },
            ]}
          />

          <SummaryCard
            title="Delivery"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            }
            items={[
              { label: 'On-Time Rate', value: `${summary.delivery.onTimeRate.toFixed(1)}%` },
              { label: 'Early Deliveries', value: summary.delivery.earlyCount },
              { label: 'Late Deliveries', value: summary.delivery.lateCount },
              { label: 'Avg Lead Time', value: `${summary.delivery.averageLeadTime.toFixed(1)} days` },
            ]}
          />

          <SummaryCard
            title="Financial"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            items={[
              { label: 'Revenue', value: formatValue(summary.financial.revenue, 'CURRENCY') },
              { label: 'Cost', value: formatValue(summary.financial.cost, 'CURRENCY') },
              { label: 'Margin', value: formatValue(summary.financial.margin, 'CURRENCY') },
              { label: 'Margin %', value: `${summary.financial.marginPercent.toFixed(1)}%` },
            ]}
          />
        </div>
      )}

      {/* Trend Charts Placeholder */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance Trends</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-200">
          <p className="text-gray-500">
            Chart component would render here using Recharts or Chart.js
          </p>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
