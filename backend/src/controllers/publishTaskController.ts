import { Request, Response } from 'express';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

export const getPublishTasks = async (req: Request, res: Response) => {
    try {
        const tasks = await db.query.publishTasks.findMany({
            where: eq(schema.publishTasks.status, 'PENDING'),
            with: {
                ccr: {
                    columns: {
                        title: true,
                        type: true,
                        createdById: true,
                    },
                },
            },
            orderBy: [desc(schema.publishTasks.createdAt)],
        });
        res.json(tasks);
    } catch (error) {
        console.error('Error fetching publish tasks:', error);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
};

export const completePublishTask = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string;
        await db.update(schema.publishTasks)
            .set({
                status: 'COMPLETED',
                completedAt: new Date(),
            })
            .where(eq(schema.publishTasks.id, id));

        const updatedTask = await db.query.publishTasks.findFirst({
            where: eq(schema.publishTasks.id, id),
        });

        res.json(updatedTask);
    } catch (error) {
        console.error('Error completing publish task:', error);
        res.status(500).json({ error: 'Failed to complete task' });
    }
};

export const getOperationsTasks = getPublishTasks;
export const completeOperationsTask = completePublishTask;
