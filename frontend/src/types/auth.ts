// SynchroShift Core Role and User Definitions

export const Role = {
    MERCHANDISER: 'MERCHANDISER',
    CATEGORY_APPROVER: 'CATEGORY_APPROVER',
    STOREFRONT_VIEWER: 'STOREFRONT_VIEWER',
    ADMIN: 'ADMIN',
} as const;

export type Role = 'MERCHANDISER' | 'CATEGORY_APPROVER' | 'STOREFRONT_VIEWER' | 'ADMIN';

export interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    message: string;
    token: string;
    user: User;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}
