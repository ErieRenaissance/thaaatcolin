import React from 'react';
import { useAuthStore } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/common/Card';
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();

  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231',
      change: '+20.1%',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Active Orders',
      value: '23',
      change: '+12.5%',
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Customers',
      value: '156',
      change: '+5.2%',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Average OEE',
      value: '87.4%',
      change: '+3.1%',
      icon: TrendingUp,
      color: 'bg-yellow-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-2 text-gray-600">
          Here's what's happening with your manufacturing operations today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} hover>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="mt-1 text-sm text-green-600">{stat.change} from last month</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stat.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary-600 hover:bg-primary-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Create Order</p>
                <p className="text-sm text-gray-500">Start a new production order</p>
              </div>
            </button>

            <button className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary-600 hover:bg-primary-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">New Quote</p>
                <p className="text-sm text-gray-500">Generate customer quote</p>
              </div>
            </button>

            <button className="flex items-center gap-3 rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-primary-600 hover:bg-primary-50">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-500">Check performance metrics</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates and notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 rounded-lg border border-gray-100 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Order #12345 completed</p>
                <p className="text-sm text-gray-500">Customer: Acme Manufacturing Co.</p>
                <p className="text-xs text-gray-400">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-gray-100 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Quote #Q-789 accepted</p>
                <p className="text-sm text-gray-500">Value: $15,420</p>
                <p className="text-xs text-gray-400">5 hours ago</p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-lg border border-gray-100 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">OEE improved to 87.4%</p>
                <p className="text-sm text-gray-500">Machine Center A</p>
                <p className="text-xs text-gray-400">1 day ago</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
