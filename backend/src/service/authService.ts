import { db } from '../libs/prisma.js';
import { hashPass, comparePass, signToken } from '../libs/auth.js';

export class AuthService {
    /**
     * Login user with email and password
     */
    async login(email: string, password: string) {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Find user
        const user = await db.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verify password
        const isValid = await comparePass(password, user.password);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        // Generate token
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
        const user = await db.user.findUnique({
            where: { id: userId },
            select: {
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
     * Get all users (lightweight)
     */
    async getAllUsers() {
        return db.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Logout (stateless JWT - handled client-side)
     */
    async logout() {
        // Since JWT is stateless, logout is primarily handled on the client
        // by removing the token. This method can be extended for token blacklisting
        // or other server-side logout logic if needed.
        return { message: 'Logout successful' };
    }
}

export const authService = new AuthService();
