import { Response } from 'express';
import { db, schema } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { hashPass } from '../libs/auth.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await db.query.users.findMany({
            columns: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: [asc(schema.users.name)],
        });
        res.json({ users });
    } catch (error: any) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, password, and role are required' });
        }

        const existingUser = await db.query.users.findFirst({ where: eq(schema.users.email, email) });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await hashPass(password);
        const userId = crypto.randomUUID();

        await db.insert(schema.users).values({
            id: userId,
            email,
            password: hashedPassword,
            name,
            role,
        });

        const createdUser = await db.query.users.findFirst({
            where: eq(schema.users.id, userId),
            columns: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        res.status(201).json({ user: createdUser });
    } catch (error: any) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};
