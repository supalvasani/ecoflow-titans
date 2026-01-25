import { db } from '../libs/prisma.js';
import { ECOStage } from '@prisma/client';

export class StageService {
    /**
     * Get the initial stage (usually sequence 1)
     */
    async getInitialStage(): Promise<ECOStage> {
        const stage = await db.eCOStage.findFirst({
            orderBy: { sequence: 'asc' },
        });

        if (!stage) {
            throw new Error('No ECO stages defined. Please run seed script.');
        }

        return stage;
    }

    /**
     * Get the next stage in sequence
     */
    async getNextStage(currentStageId: string): Promise<ECOStage | null> {
        const currentStage = await db.eCOStage.findUnique({
            where: { id: currentStageId },
        });

        if (!currentStage) {
            throw new Error('Current stage not found');
        }

        const nextStage = await db.eCOStage.findFirst({
            where: {
                sequence: { gt: currentStage.sequence },
            },
            orderBy: { sequence: 'asc' },
        });

        return nextStage; // Returns null if terminal stage
    }

    /**
     * Get the rejection target stage
     * Returns the "Rejected" stage (terminal state)
     */
    async getRejectionTargetStage(): Promise<ECOStage> {
        const rejectedStage = await db.eCOStage.findFirst({
            where: { name: 'Rejected' },
        });

        if (!rejectedStage) {
            throw new Error('Rejected stage not found. Please run seed script.');
        }

        return rejectedStage;
    }

    /**
     * Check if transition is valid based on sequence
     */
    async validateTransition(fromStageId: string, toStageId: string): Promise<boolean> {
        const from = await db.eCOStage.findUnique({ where: { id: fromStageId } });
        const to = await db.eCOStage.findUnique({ where: { id: toStageId } });

        if (!from || !to) return false;

        // Allow moving forward
        if (to.sequence > from.sequence) return true;

        // Allow moving back to Draft (for re-editing)
        const initial = await this.getInitialStage();
        if (to.id === initial.id) return true;

        // Allow moving to Rejected stage from any stage
        if (to.name === 'Rejected') return true;

        return false;
    }
}

export const stageService = new StageService();
