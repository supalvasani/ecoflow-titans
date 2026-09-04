// Role-based routing utilities for SynchroShift
import { Role } from '../types/auth';

/**
 * Get the dashboard path for a given role
 */
export const getRoleBasedPath = (role: Role): string => {
    switch (role) {
        case 'MERCHANDISER':
            return '/merchandiser';
        case 'CATEGORY_APPROVER':
            return '/approver';
        case 'STOREFRONT_VIEWER':
            return '/storefront';
        case 'ADMIN':
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
        case 'MERCHANDISER':
            return 'Merchandiser';
        case 'CATEGORY_APPROVER':
            return 'Category Approver';
        case 'STOREFRONT_VIEWER':
            return 'Storefront Viewer';
        case 'ADMIN':
            return 'Administrator';
        default:
            return 'User';
    }
};
