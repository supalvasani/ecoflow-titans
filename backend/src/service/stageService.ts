import { db, schema } from '../db/index.js';
import { eq, gt, asc } from 'drizzle-orm';

export class StageService {
    /**
     * Get the initial stage (usually sequence 1)
     */
    async getInitialStage() {
        const stage = await db.query.ecoStages.findFirst({
            orderBy: [asc(schema.ecoStages.sequence)],
        });

        if (!stage) {
            throw new Error('No ECO stages defined. Please run seed script.');
        }

        return stage;
    }

    /**
     * Get the next stage in sequence
     */
    async getNextStage(currentStageId: string) {
        const currentStage = await db.query.ecoStages.findFirst({
            where: eq(schema.ecoStages.id, currentStageId),
        });

        if (!currentStage) {
            throw new Error('Current stage not found');
        }

        const nextStage = await db.query.ecoStages.findFirst({
            where: gt(schema.ecoStages.sequence, currentStage.sequence),
            orderBy: [asc(schema.ecoStages.sequence)],
        });

        return nextStage || null;
    }

    /**
     * Get the rejection target stage (usually Draft or Rejected)
     */
    async getRejectionTargetStage() {
        const rejectedStage = await db.query.ecoStages.findFirst({
            where: eq(schema.ecoStages.name, 'Rejected'),
        });

        if (rejectedStage) {
            return rejectedStage;
        }

        // Default back to initial draft stage if dedicated Rejected stage doesn't exist
        return this.getInitialStage();
    }

    /**
     * Check if transition is valid based on sequence
     */
    async validateTransition(fromStageId: string, toStageId: string): Promise<boolean> {
        const from = await db.query.ecoStages.findFirst({ where: eq(schema.ecoStages.id, fromStageId) });
        const to = await db.query.ecoStages.findFirst({ where: eq(schema.ecoStages.id, toStageId) });

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
