// Role-based routing utilities
import { Role } from '../types/auth';

/**
 * Get the dashboard path for a given role
 */
export const getRoleBasedPath = (role: Role): string => {
    switch (role) {
        case Role.ENGINEERING_USER:
            return '/engineering';
        case Role.APPROVER:
            return '/approver';
        case Role.OPERATIONS_USER:
            return '/operations';
        case Role.ADMIN:
            return '/admin';
        default:
            return '/login';
    }
};

/**
 * Get the display name for a role
 */
export const getRoleDisplayName = (role: Role): string => {
    switch (role) {
        case Role.ENGINEERING_USER:
            return 'Engineering User';
        case Role.APPROVER:
            return 'Approver';
        case Role.OPERATIONS_USER:
            return 'Operations User';
        case Role.ADMIN:
            return 'Admin';
        default:
            return 'Unknown Role';
    }
};
