// Protected Route Component with multi-role and forbidden role support
import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types/auth';

interface ProtectedRouteProps {
    children: ReactNode;
    allowedRoles?: Role[];
    forbiddenRoles?: Role[];
    requiredRole?: Role;
}

export const ProtectedRoute = ({ children, allowedRoles, forbiddenRoles, requiredRole }: ProtectedRouteProps) => {
    const { isAuthenticated, isLoading, user } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#F7F6F3] flex items-center justify-center font-mono text-xs text-[#6B6862]">
                Initializing console session...
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" replace />;
    }

    // Role aliases resolution
    const currentRole: Role = user.role;

    // Check specific required role
    if (requiredRole && currentRole !== requiredRole) {
        return <Navigate to="/" replace />;
    }

    // Check allowed roles array
    if (allowedRoles && !allowedRoles.includes(currentRole)) {
        return <Navigate to="/" replace />;
    }

    // Check forbidden roles array (e.g. STOREFRONT_VIEWER blocked from CCRs / Reports)
    if (forbiddenRoles && forbiddenRoles.includes(currentRole)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
