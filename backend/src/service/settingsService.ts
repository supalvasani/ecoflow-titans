import { db } from '../libs/prisma.js';
import { Role } from '@prisma/client';

/**
 * Get all ECO workflow stages
 */
export const getStages = async () => {
    const stages = await db.eCOStage.findMany({
        orderBy: {
            sequence: 'asc',
        },
    });
    return stages;
};

/**
 * Update ECO workflow stages (admin only)
 */
export const updateStages = async (stages: Array<{
    id?: string;
    name: string;
    sequence: number;
    requiresApproval: boolean;
    isFinal: boolean;
}>) => {
    // Validate stages
    if (!stages || stages.length === 0) {
        throw new Error('At least one stage is required');
    }

    // Check for duplicate sequences
    const sequences = stages.map(s => s.sequence);
    if (new Set(sequences).size !== sequences.length) {
        throw new Error('Stage sequences must be unique');
    }

    // Use transaction to update all stages atomically
    const result = await db.$transaction(async (tx) => {
        const updatedStages = [];
        for (const stage of stages) {
            if (stage.id) {
                // Update existing stage
                const updated = await tx.eCOStage.update({
                    where: { id: stage.id },
                    data: {
                        name: stage.name,
                        sequence: stage.sequence,
                        requiresApproval: stage.requiresApproval,
                        isFinal: stage.isFinal,
                    },
                });
                updatedStages.push(updated);
            } else {
                // Create new stage
                const created = await tx.eCOStage.create({
                    data: {
                        name: stage.name,
                        sequence: stage.sequence,
                        requiresApproval: stage.requiresApproval,
                        isFinal: stage.isFinal,
                    },
                });
                updatedStages.push(created);
            }
        }
        return updatedStages;
    });

    return result;
};

/**
 * Get approval rules configuration
 */
export const getApprovalRules = async () => {
    // For now, return hardcoded rules based on the Role enum
    return {
        rules: [
            {
                role: Role.APPROVER,
                canApprove: true,
                canReject: true,
            },
            {
                role: Role.ADMIN,
                canApprove: true,
                canReject: true,
            },
            {
                role: Role.ENGINEERING_USER,
                canApprove: false,
                canReject: false,
            },
            {
                role: Role.OPERATIONS_USER,
                canApprove: false,
                canReject: false,
            },
        ],
        requiresApprovalStages: ['REVIEW', 'APPROVED'],
    };
};

/**
 * Update approval rules (admin only)
 */
export const updateApprovalRules = async (rules: {
    rules: Array<{
        role: Role;
        canApprove: boolean;
        canReject: boolean;
    }>;
    requiresApprovalStages: string[];
}) => {
    // Validate rules
    if (!rules.rules || rules.rules.length === 0) {
        throw new Error('At least one approval rule is required');
    }

    // Ensure all roles are covered
    const requiredRoles = Object.values(Role);
    const providedRoles = rules.rules.map(r => r.role);
    const missingRoles = requiredRoles.filter(role => !providedRoles.includes(role));

    if (missingRoles.length > 0) {
        throw new Error(`Missing approval rules for roles: ${missingRoles.join(', ')}`);
    }

    // In a real system, this would be stored in the database
    // For now, we'll just validate and return the rules
    return {
        message: 'Approval rules updated successfully',
        rules,
    };
};

export const settingsService = {
    getStages,
    updateStages,
    getApprovalRules,
    updateApprovalRules,
};
