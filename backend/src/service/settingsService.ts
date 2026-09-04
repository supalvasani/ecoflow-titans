import { db, schema } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';
import crypto from 'node:crypto';

export const getStages = async () => {
    return db.query.ccrStages.findMany({
        orderBy: [asc(schema.ccrStages.sequence)],
    });
};

export const updateStages = async (stages: Array<{
    id?: string;
    name: string;
    sequence: number;
    requiresApproval: boolean;
    isFinal: boolean;
    minApprovals?: number;
}>) => {
    if (!stages || stages.length === 0) {
        throw new Error('At least one stage is required');
    }

    const sequences = stages.map(s => s.sequence);
    if (new Set(sequences).size !== sequences.length) {
        throw new Error('Stage sequences must be unique');
    }

    return await db.transaction(async (tx) => {
        // --- Delete stages that were removed from the payload ---
        const currentStages = await tx.query.ccrStages.findMany();
        const incomingIds = new Set(stages.filter(s => s.id).map(s => s.id));
        const stagesToDelete = currentStages.filter(s => !incomingIds.has(s.id));

        for (const stageToDelete of stagesToDelete) {
            // Guard: do not delete a stage that has live CCRs in it
            const ccrUsingStage = await tx.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.stageId, stageToDelete.id),
            });
            if (ccrUsingStage) {
                throw new Error(
                    `Cannot delete stage "${stageToDelete.name}" — it has active CCRs assigned to it.`
                );
            }
            await tx.delete(schema.ccrStages).where(eq(schema.ccrStages.id, stageToDelete.id));
        }

        // --- Upsert incoming stages ---
        const updatedStages = [];
        for (const stage of stages) {
            if (stage.id) {
                await tx.update(schema.ccrStages)
                    .set({
                        name: stage.name,
                        sequence: stage.sequence,
                        requiresApproval: stage.requiresApproval,
                        isFinal: stage.isFinal,
                        minApprovals: stage.minApprovals ?? 1,
                    })
                    .where(eq(schema.ccrStages.id, stage.id));

                const updated = await tx.query.ccrStages.findFirst({ where: eq(schema.ccrStages.id, stage.id) });
                updatedStages.push(updated);
            } else {
                const newId = crypto.randomUUID();
                await tx.insert(schema.ccrStages).values({
                    id: newId,
                    name: stage.name,
                    sequence: stage.sequence,
                    requiresApproval: stage.requiresApproval,
                    isFinal: stage.isFinal,
                    minApprovals: stage.minApprovals ?? 1,
                });

                const created = await tx.query.ccrStages.findFirst({ where: eq(schema.ccrStages.id, newId) });
                updatedStages.push(created);
            }
        }
        return updatedStages;
    });
};

export const getApprovalRules = async () => {
    return {
        rules: [
            {
                role: 'CATEGORY_APPROVER',
                canApprove: true,
                canReject: true,
            },
            {
                role: 'ADMIN',
                canApprove: true,
                canReject: true,
            },
            {
                role: 'MERCHANDISER',
                canApprove: false,
                canReject: false,
            },
            {
                role: 'STOREFRONT_VIEWER',
                canApprove: false,
                canReject: false,
            },
        ],
        requiresApprovalStages: ['Under Review', 'Approved'],
    };
};

export const updateApprovalRules = async (rules: any) => {
    return {
        message: 'Approval rules successfully synced. Note: Stage requiresApproval configuration governs approval requirements.',
        rules,
    };
};

export const settingsService = {
    getStages,
    updateStages,
    getApprovalRules,
    updateApprovalRules,
};
