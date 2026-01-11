import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Login } from '@/components/auth/Login';
import { MFAVerification } from '@/components/auth/MFAVerification';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Dashboard } from '@/components/Dashboard';

// ============================================================================
// LAZY LOADED COMPONENTS
// ============================================================================

// Placeholder components for routes that will be implemented
const Analytics = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
    <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
    <p className="mt-2 text-gray-600">Coming soon...</p>
  </div>
);

const Orders = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
    <h2 className="text-2xl font-bold text-gray-900">Orders Management</h2>
    <p className="mt-2 text-gray-600">Coming soon...</p>
  </div>
);

const Inventory = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
    <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
    <p className="mt-2 text-gray-600">Coming soon...</p>
  </div>
);

const Quotes = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
    <h2 className="text-2xl font-bold text-gray-900">Quotes Management</h2>
    <p className="mt-2 text-gray-600">Coming soon...</p>
  </div>
);

const Settings = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
    <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
    <p className="mt-2 text-gray-600">Coming soon...</p>
  </div>
);

const NotFound = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900">404</h1>
      <p className="mt-4 text-xl text-gray-600">Page not found</p>
      <a
        href="/dashboard"
        className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
      >
        Go to Dashboard
      </a>
    </div>
  </div>
);

const Unauthorized = () => (
  <div className="flex min-h-screen items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-900">403</h1>
      <p className="mt-4 text-xl text-gray-600">Unauthorized Access</p>
      <p className="mt-2 text-gray-500">You don't have permission to access this page.</p>
      <a
        href="/dashboard"
        className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700"
      >
        Go to Dashboard
      </a>
    </div>
  </div>
);

// ============================================================================
// ROUTER CONFIGURATION
// ============================================================================

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth/mfa',
    element: <MFAVerification />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'analytics',
        element: <Analytics />,
      },
      {
        path: 'orders',
        element: <Orders />,
      },
      {
        path: 'inventory',
        element: <Inventory />,
      },
      {
        path: 'quotes',
        element: <Quotes />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
    ],
  },
  {
    path: '/unauthorized',
    element: <Unauthorized />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
