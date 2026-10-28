import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import { ProductsListPage } from './pages/products/ProductsListPage';
import { BatchesListPage } from './pages/batches/BatchesListPage';
import { NewBatchPage } from './pages/batches/NewBatchPage';
import { BatchDetailPage } from './pages/batches/BatchDetailPage';
import { VerifyPage } from './pages/verify/VerifyPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { ShipmentsPage } from './pages/shipments/ShipmentsPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { OrganizationsPage } from './pages/organizations/OrganizationsPage';
import { UsersPage } from './pages/users/UsersPage';
import { SystemHealthPage } from './pages/health/SystemHealthPage';
import { SettingsPage } from './pages/settings/SettingsPage';

const AppContent: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <AppShell user={user} onLogout={logout}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        {/* Public Verification — no auth required */}
        <Route path="/verify" element={<VerifyPage />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
        <Route path="/qr/:token" element={<VerifyPage />} />

        {/* Authenticated Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Product Templates */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsListPage />
            </ProtectedRoute>
          }
        />

        {/* Batch Inventory & Lifecycle */}
        <Route
          path="/batches"
          element={
            <ProtectedRoute>
              <BatchesListPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/batches/new"
          element={
            <ProtectedRoute allowedRoles={['SUPPLIER', 'PROCESSOR', 'ADMIN']}>
              <NewBatchPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/batches/:batchId"
          element={
            <ProtectedRoute>
              <BatchDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Shipments & Logistics Tracking */}
        <Route
          path="/shipments"
          element={
            <ProtectedRoute>
              <ShipmentsPage />
            </ProtectedRoute>
          }
        />

        {/* Analytics & AI Risk Intelligence */}
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Consortium Audit Trail */}
        <Route
          path="/audit-logs"
          element={
            <ProtectedRoute>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Consortium Organizations Registry */}
        <Route
          path="/organizations"
          element={
            <ProtectedRoute>
              <OrganizationsPage />
            </ProtectedRoute>
          }
        />

        {/* Users & Roles Management */}
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        {/* System Health & Node Diagnostics — Public Diagnostic Probe */}
        <Route path="/system-health" element={<SystemHealthPage />} />

        {/* Operator Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;
