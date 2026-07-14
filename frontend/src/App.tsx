import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import ECOListPage from './pages/ecos/ECOListPage';
import ECOCreatePage from './pages/ecos/ECOCreatePage';
import ECODetailPage from './pages/ecos/ECODetailPage';
import BOMPage from './pages/boms/BOMPage';
import BOMDetailPage from './pages/boms/BOMDetailPage';
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
          {/* Root - Redirects based on auth status */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Role-Based Protected Routes */}
          <Route
            path="/engineering"
            element={
              <ProtectedRoute requiredRole={Role.ENGINEERING_USER}>
                <EngineeringDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/approver"
            element={
              <ProtectedRoute requiredRole={Role.APPROVER}>
                <ApproverDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/operations"
            element={
              <ProtectedRoute requiredRole={Role.OPERATIONS_USER}>
                <OperationsDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole={Role.ADMIN}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Product Routes - Accessible to all authenticated users */}
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <ProductListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/new"
            element={
              <ProtectedRoute>
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
          <Route
            path="/products/new"
            element={
              <ProtectedRoute requiredRole={Role.ADMIN}>
                <ProductCreatePage />
              </ProtectedRoute>
            }
          />

          {/* ECO Routes */}
          <Route
            path="/ecos/new"
            element={
              <ProtectedRoute>
                <ECOCreatePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ecos"
            element={
              <ProtectedRoute>
                <ECOListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ecos/:id"
            element={
              <ProtectedRoute>
                <ECODetailPage />
              </ProtectedRoute>
            }
          />

          {/* BOM Routes */}
          <Route
            path="/boms"
            element={
              <ProtectedRoute>
                <BOMPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/boms/:id"
            element={
              <ProtectedRoute>
                <BOMDetailPage />
              </ProtectedRoute>
            }
          />

          {/* Audit Log Routes */}
          <Route
            path="/audit"
            element={
              <ProtectedRoute>
                <AuditLogPage />
              </ProtectedRoute>
            }
          />

          {/* Reports Routes */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />

          {/* Settings Routes */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRole={Role.ADMIN}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />

          {/* User Management Route */}
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute requiredRole={Role.ADMIN}>
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

