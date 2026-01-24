import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RootRedirect } from './components/RootRedirect';
import { LoginPage } from './pages/LoginPage';
import { EngineeringDashboard } from './pages/EngineeringDashboard';
import { ApproverDashboard } from './pages/ApproverDashboard';
import { OperationsDashboard } from './pages/OperationsDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

