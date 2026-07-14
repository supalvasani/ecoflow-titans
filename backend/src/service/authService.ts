import { db, schema } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';
import { comparePass, signToken } from '../libs/auth.js';

export class AuthService {
    /**
     * Login user with email and password
     */
    async login(email: string, password: string) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await comparePass(password, user.password);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        const token = signToken({ userId: user.id, role: user.role });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string) {
        const user = await db.query.users.findFirst({
            where: eq(schema.users.id, userId),
            columns: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    /**
     * Get all users
     */
    async getAllUsers() {
        return db.query.users.findMany({
            columns: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
            orderBy: [asc(schema.users.name)],
        });
    }

    /**
     * Logout
     */
    async logout() {
        return { message: 'Logout successful' };
    }
}

export const authService = new AuthService();
