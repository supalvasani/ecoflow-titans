import { db } from './prisma.js';
import { ItemStatus } from '@prisma/client';
import { isEditableStage, ECO_STAGES } from './ecoStages.js';

/**
 * Validate that ECO can be edited (must be in NEW stage)
 */
export function validateECOEdit(ecoStageId: string) {
    if (!isEditableStage(ecoStageId)) {
        throw new Error('ECO cannot be edited after review. Current stage does not allow modifications.');
    }
}

/**
 * Validate that user can approve ECO
 */
export function validateApproval(ecoStageId: string, userRole: string) {
    if (ecoStageId !== ECO_STAGES.REVIEW) {
        throw new Error('ECO must be in REVIEW stage to approve');
    }
    if (!['APPROVER', 'ADMIN'].includes(userRole)) {
        throw new Error('Only approvers can approve ECOs');
    }
}

/**
 * Validate that ECO can be applied
 */
export function validateApply(ecoStageId: string) {
    if (ecoStageId !== ECO_STAGES.APPROVED) {
        throw new Error('ECO must be APPROVED before applying. Please get approval first.');
    }
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
