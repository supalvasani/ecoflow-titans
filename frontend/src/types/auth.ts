// Auth Types for EcoFlow

export const Role = {
    ENGINEERING_USER: 'ENGINEERING_USER',
    APPROVER: 'APPROVER',
    OPERATIONS_USER: 'OPERATIONS_USER',
    ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

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
