import { Request, Response } from 'express';
import { db } from '../libs/prisma.js';
import { hashPass } from '../libs/auth.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
export const getUsers = async (req: AuthRequest, res: Response) => {
    try {
        const users = await db.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
            orderBy: { name: 'asc' },
        });
        res.json({ users });
    } catch (error: any) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [ENGINEERING_USER, APPROVER, OPERATIONS_USER, ADMIN]
 *     responses:
 *       201:
 *         description: User created
 */
export const createUser = async (req: AuthRequest, res: Response) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, password, and role are required' });
        }

        const existingUser = await db.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        const hashedPassword = await hashPass(password);

        const user = await db.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
            },
        });

        res.status(201).json({ user });
    } catch (error: any) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
};
