import { Role } from '../types/auth'; // Ensure this exists or define it

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface User {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    createdAt: string;
}

export interface CreateUserDTO {
    email: string;
    password: string;
    name: string;
    role: Role;
}

class UserService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.message || 'API request failed');
        }

        return response.json();
    }

    async getUsers(token: string): Promise<{ users: User[] }> {
        return this.request('/api/users', token);
    }

    async createUser(token: string, data: CreateUserDTO): Promise<{ user: User }> {
        return this.request('/api/users', token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}

export const userService = new UserService(API_BASE_URL);
