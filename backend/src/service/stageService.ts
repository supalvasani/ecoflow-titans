import { db, schema } from '../db/index.js';
import { eq, gt, asc } from 'drizzle-orm';

export class StageService {
    /**
     * Get the initial stage (sequence 1 = Draft).
     */
    async getInitialStage() {
        const stage = await db.query.ccrStages.findFirst({
            orderBy: [asc(schema.ccrStages.sequence)],
        });

        if (!stage) {
            throw new Error('No CCR stages defined. Please run the seed script.');
        }

        return stage;
    }

    /**
     * Get the next stage in sequence.
     */
    async getNextStage(currentStageId: string) {
        const currentStage = await db.query.ccrStages.findFirst({
            where: eq(schema.ccrStages.id, currentStageId),
        });

        if (!currentStage) {
            throw new Error('Current stage not found');
        }

        const nextStage = await db.query.ccrStages.findFirst({
            where: gt(schema.ccrStages.sequence, currentStage.sequence),
            orderBy: [asc(schema.ccrStages.sequence)],
        });

        return nextStage || null;
    }

    /**
     * Get the rejection target stage (named "Rejected" or falls back to initial Draft).
     */
    async getRejectionTargetStage() {
        const rejectedStage = await db.query.ccrStages.findFirst({
            where: eq(schema.ccrStages.name, 'Rejected'),
        });

        if (rejectedStage) {
            return rejectedStage;
        }

        // Default back to initial draft stage if dedicated Rejected stage doesn't exist
        return this.getInitialStage();
    }

    /**
     * Check if a stage transition is valid based on sequence rules.
     */
    async validateTransition(fromStageId: string, toStageId: string): Promise<boolean> {
        const from = await db.query.ccrStages.findFirst({ where: eq(schema.ccrStages.id, fromStageId) });
        const to = await db.query.ccrStages.findFirst({ where: eq(schema.ccrStages.id, toStageId) });

        if (!from || !to) return false;

        // Allow moving forward in sequence
        if (to.sequence > from.sequence) return true;

        // Allow moving back to Draft (for re-editing after rejection)
        const initial = await this.getInitialStage();
        if (to.id === initial.id) return true;

        // Allow moving to the Rejected terminal stage from any stage
        if (to.name === 'Rejected') return true;

        return false;
    }

    /**
     * Count how many APPROVED CCRApproval decisions exist for a given CCR.
     * Used by N-of-M: CCR advances only when count >= stage.minApprovals.
     */
    async countApprovedDecisions(ccrId: string): Promise<number> {
        const approvals = await db.query.ccrApprovals.findMany({
            where: eq(schema.ccrApprovals.ccrId, ccrId),
        });
        return approvals.filter(a => a.decision === 'APPROVED').length;
    }
}

export const stageService = new StageService();
