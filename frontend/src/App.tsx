import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootRedirect } from './components/RootRedirect';
import { LoginPage } from './pages/LoginPage';
import { EngineeringDashboard } from './pages/EngineeringDashboard';
import { ApproverDashboard } from './pages/ApproverDashboard';
import { OperationsDashboard } from './pages/OperationsDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import ProductListPage from './pages/products/ProductListPage';
import ProductCreatePage from './pages/products/ProductCreatePage';
import ProductDetailPage from './pages/products/ProductDetailPage';
import CCRListPage from './pages/ccrs/CCRListPage';
import CCRCreatePage from './pages/ccrs/CCRCreatePage';
import CCRDetailPage from './pages/ccrs/CCRDetailPage';
import VariantSetPage from './pages/variant-sets/VariantSetPage';
import VariantSetDetailPage from './pages/variant-sets/VariantSetDetailPage';
import AuditLogPage from './pages/audit/AuditLogPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import UserManagementPage from './pages/admin/UserManagementPage';
import { Role } from './types/auth';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root - Redirects based on auth status and role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Role-Dedicated Consoles */}
          <Route
            path="/merchandiser"
            element={
              <ProtectedRoute allowedRoles={[Role.MERCHANDISER, Role.ADMIN]}>
                <EngineeringDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/engineering"
            element={<Navigate to="/merchandiser" replace />}
          />

          <Route
            path="/approver"
            element={
              <ProtectedRoute allowedRoles={[Role.CATEGORY_APPROVER, Role.ADMIN]}>
                <ApproverDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/storefront"
            element={
              <ProtectedRoute allowedRoles={[Role.STOREFRONT_VIEWER, Role.ADMIN]}>
                <OperationsDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operations"
            element={<Navigate to="/storefront" replace />}
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catalog Items Routes */}
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/create"
            element={
              <ProtectedRoute allowedRoles={[Role.MERCHANDISER, Role.ADMIN]}>
                <ProductCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/new"
            element={
              <ProtectedRoute allowedRoles={[Role.MERCHANDISER, Role.ADMIN]}>
                <ProductCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:id"
            element={
              <ProtectedRoute>
                <ProductDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Change Requests (CCR) Routes */}
          <Route
            path="/ccrs"
            element={
              <ProtectedRoute forbiddenRoles={[Role.STOREFRONT_VIEWER]}>
                <CCRListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ccrs/create"
            element={
              <ProtectedRoute allowedRoles={[Role.MERCHANDISER, Role.ADMIN]}>
                <CCRCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ccrs/new"
            element={
              <ProtectedRoute allowedRoles={[Role.MERCHANDISER, Role.ADMIN]}>
                <CCRCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ccrs/:id"
            element={
              <ProtectedRoute forbiddenRoles={[Role.STOREFRONT_VIEWER]}>
                <CCRDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Variant Sets Routes */}
          <Route
            path="/variant-sets"
            element={
              <ProtectedRoute>
                <VariantSetPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/variant-sets/:id"
            element={
              <ProtectedRoute>
                <VariantSetDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Audit Trail Route */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />

          {/* Reports Route */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute forbiddenRoles={[Role.STOREFRONT_VIEWER]}>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Governance Settings Route */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* User Directory Management Route */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={[Role.ADMIN]}>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
