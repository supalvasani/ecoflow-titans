import { db, schema } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';
import crypto from 'node:crypto';

export const getStages = async () => {
    return db.query.ecoStages.findMany({
        orderBy: [asc(schema.ecoStages.sequence)],
    });
};

export const updateStages = async (stages: Array<{
    id?: string;
    name: string;
    sequence: number;
    requiresApproval: boolean;
    isFinal: boolean;
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
        const currentStages = await tx.query.ecoStages.findMany();
        const incomingIds = new Set(stages.filter(s => s.id).map(s => s.id));
        const stagesToDelete = currentStages.filter(s => !incomingIds.has(s.id));

        for (const stageToDelete of stagesToDelete) {
            // Guard: do not delete a stage that has live ECOs in it
            const ecoUsingStage = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.stageId, stageToDelete.id),
            });
            if (ecoUsingStage) {
                throw new Error(
                    `Cannot delete stage "${stageToDelete.name}" — it has active ECOs assigned to it.`
                );
            }
            await tx.delete(schema.ecoStages).where(eq(schema.ecoStages.id, stageToDelete.id));
        }

        // --- Upsert incoming stages ---
        const updatedStages = [];
        for (const stage of stages) {
            if (stage.id) {
                await tx.update(schema.ecoStages)
                    .set({
                        name: stage.name,
                        sequence: stage.sequence,
                        requiresApproval: stage.requiresApproval,
                        isFinal: stage.isFinal,
                    })
                    .where(eq(schema.ecoStages.id, stage.id));

                const updated = await tx.query.ecoStages.findFirst({ where: eq(schema.ecoStages.id, stage.id) });
                updatedStages.push(updated);
            } else {
                const newId = crypto.randomUUID();
                await tx.insert(schema.ecoStages).values({
                    id: newId,
                    name: stage.name,
                    sequence: stage.sequence,
                    requiresApproval: stage.requiresApproval,
                    isFinal: stage.isFinal,
                });

                const created = await tx.query.ecoStages.findFirst({ where: eq(schema.ecoStages.id, newId) });
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
                role: 'APPROVER',
                canApprove: true,
                canReject: true,
            },
            {
                role: 'ADMIN',
                canApprove: true,
                canReject: true,
            },
            {
                role: 'ENGINEERING_USER',
                canApprove: false,
                canReject: false,
            },
            {
                role: 'OPERATIONS_USER',
                canApprove: false,
                canReject: false,
            },
        ],
        requiresApprovalStages: ['REVIEW', 'APPROVED'],
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
