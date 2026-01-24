import { db } from './prisma.js';
import { ItemStatus } from '@prisma/client';

/**
 * Validate that ECO can be edited (must be in the first/draft stage)
 */
export async function validateECOEdit(ecoStageId: string) {
    const stage = await db.eCOStage.findUnique({ where: { id: ecoStageId } });
    if (!stage) throw new Error('Stage not found');

    // Assuming sequence 1 is always the Draft/Editable stage
    // Or we can add an isEditable boolean to the schema later.
    // For now, let's assume lowest sequence is editable.
    const firstStage = await db.eCOStage.findFirst({ orderBy: { sequence: 'asc' } });

    if (stage.id !== firstStage?.id) {
        throw new Error('ECO cannot be edited after leaving the draft stage.');
    }
}

/**
 * Validate that user can approve ECO
 */
export async function validateApproval(ecoStageId: string, userRole: string) {
    const stage = await db.eCOStage.findUnique({ where: { id: ecoStageId } });
    if (!stage) throw new Error('Stage not found');

    if (!stage.requiresApproval) {
        throw new Error('This stage does not require approval');
    }
    if (!['APPROVER', 'ADMIN'].includes(userRole)) {
        throw new Error('Only approvers can approve ECOs');
    }
}

/**
 * Validate that ECO can be applied (Must be in a stage that allows application, usually Approved? Or is applied FROM Approved?)
 * The logic is: Apply is the transition TO Implemented. So we must be in the stage BEFORE Implemented?
 * Previous logic: Must be APPROVED.
 * Dynamic Logic: Must be in a stage that transitions TO the final stage. 
 * Or simply, the backend `applyECO` handles the transition. 
 * Let's ensure we are NOT yet in the final stage.
 */
export async function validateApply(ecoStageId: string) {
    const stage = await db.eCOStage.findUnique({ where: { id: ecoStageId } });
    if (!stage) throw new Error('Stage not found');

    if (stage.isFinal) {
        throw new Error('ECO is already applied/final.');
    }

    // Check if next stage is final?
    // For now, let's loosen this check to just "Not Final". The service handles the flow.
}

/**
 * Prevent direct updates to master data
 */
export function preventDirectUpdate(): never {
    throw new Error('Direct updates forbidden. All changes must go through ECO workflow.');
}

/**
 * Validate that product/BOM version is ACTIVE (not archived)
 */
export async function validateActiveVersion(versionId: string, type: 'product' | 'bom') {
    if (type === 'product') {
        const version = await db.productVersion.findUnique({
            where: { id: versionId },
        });

        if (!version) {
            throw new Error('Product version not found');
        }

        if (version.status !== ItemStatus.ACTIVE) {
            throw new Error('Cannot create ECO for archived product. Only ACTIVE products can be modified.');
        }
    } else {
        const version = await db.bOMVersion.findUnique({
            where: { id: versionId },
        });

        if (!version) {
            throw new Error('BOM version not found');
        }

        if (version.status !== ItemStatus.ACTIVE) {
            throw new Error('Cannot create ECO for archived BOM. Only ACTIVE BOMs can be modified.');
        }
    }
}

/**
 * Validate that component references ACTIVE product only
 */
export async function validateComponentIsActive(componentVersionId: string) {
    const version = await db.productVersion.findUnique({
        where: { id: componentVersionId },
    });

    if (!version) {
        throw new Error('Component product version not found');
    }

    if (version.status !== ItemStatus.ACTIVE) {
        throw new Error('Cannot use archived product as component. Only ACTIVE products can be used in BOMs.');
    }
}

/**
 * Check if user can view ECOs (not OPERATIONS_USER)
 */
export function canViewECOs(userRole: string): boolean {
    return userRole !== 'OPERATIONS_USER';
}
