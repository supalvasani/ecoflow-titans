import { Request, Response } from 'express';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

export const getOperationsTasks = async (req: Request, res: Response) => {
    try {
        const tasks = await db.query.operationsTasks.findMany({
            where: eq(schema.operationsTasks.status, 'PENDING'),
            with: {
                eco: {
                    columns: {
                        title: true,
                        type: true,
                        createdById: true,
                    },
                },
            },
            orderBy: [desc(schema.operationsTasks.createdAt)],
        });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching operations tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};

export const completeOperationsTask = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await db.update(schema.operationsTasks)
            .set({
                status: 'COMPLETED',
                completedAt: new Date(),
            })
            .where(eq(schema.operationsTasks.id, id));

        const updatedTask = await db.query.operationsTasks.findFirst({
            where: eq(schema.operationsTasks.id, id),
        });

        res.json(updatedTask);
    } catch (error) {
        console.error('Error completing task:', error);
        res.status(500).json({ error: 'Failed to complete task' });
    }
};
