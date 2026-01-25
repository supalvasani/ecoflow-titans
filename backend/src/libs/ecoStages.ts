// ECO Stage Constants and Transition Logic

export const ECO_STAGES = {
    NEW: 'stage-draft',
    REVIEW: 'stage-review',
    APPROVED: 'stage-approved',
    APPLIED: 'stage-implemented',
} as const;

export const STAGE_TRANSITIONS: Record<string, string[]> = {
    [ECO_STAGES.NEW]: [ECO_STAGES.REVIEW],
    [ECO_STAGES.REVIEW]: [ECO_STAGES.APPROVED, ECO_STAGES.NEW], // Can reject back to NEW
    [ECO_STAGES.APPROVED]: [ECO_STAGES.APPLIED],
    [ECO_STAGES.APPLIED]: [], // Terminal state
};

/**
 * Check if transition from one stage to another is allowed
 */
export function canTransition(fromStageId: string, toStageId: string): boolean {
    return STAGE_TRANSITIONS[fromStageId]?.includes(toStageId) ?? false;
}

/**
 * Check if ECO can be edited in this stage
 */
export function isEditableStage(stageId: string): boolean {
    return stageId === ECO_STAGES.NEW;
}

/**
 * Check if stage requires approval
 */
export function requiresApproval(stageId: string): boolean {
    return stageId === ECO_STAGES.REVIEW;
}

/**
 * Check if stage is final (terminal)
 */
export function isFinalStage(stageId: string): boolean {
    return stageId === ECO_STAGES.APPLIED;
}
