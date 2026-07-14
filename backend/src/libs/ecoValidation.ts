import { db, schema } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';

/**
 * Validate that ECO can be edited (must be in the first/draft stage)
 */
export async function validateECOEdit(ecoStageId: string) {
    const stage = await db.query.ecoStages.findFirst({ where: eq(schema.ecoStages.id, ecoStageId) });
    if (!stage) throw new Error('Stage not found');

    const firstStage = await db.query.ecoStages.findFirst({ orderBy: [asc(schema.ecoStages.sequence)] });

    if (stage.id !== firstStage?.id) {
        throw new Error('ECO cannot be edited after leaving the draft stage.');
    }
}

/**
 * Validate that user can approve ECO
 */
export async function validateApproval(ecoStageId: string, userRole: string) {
    const stage = await db.query.ecoStages.findFirst({ where: eq(schema.ecoStages.id, ecoStageId) });
    if (!stage) throw new Error('Stage not found');

    if (!stage.requiresApproval) {
        throw new Error('This stage does not require approval');
    }
    if (!['APPROVER', 'ADMIN'].includes(userRole)) {
        throw new Error('Only approvers can approve ECOs');
    }
}

/**
 * Validate that ECO can be applied
 */
export async function validateApply(ecoStageId: string) {
    const stage = await db.query.ecoStages.findFirst({ where: eq(schema.ecoStages.id, ecoStageId) });
    if (!stage) throw new Error('Stage not found');

    if (stage.isFinal) {
        throw new Error('ECO is already applied/final.');
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
        const version = await db.query.productVersions.findFirst({
            where: eq(schema.productVersions.id, versionId),
        });

        if (!version) {
            throw new Error('Product version not found');
        }

        if (version.status !== 'ACTIVE') {
            throw new Error('Cannot create ECO for archived product. Only ACTIVE products can be modified.');
        }
    } else {
        const version = await db.query.bomVersions.findFirst({
            where: eq(schema.bomVersions.id, versionId),
        });

        if (!version) {
            throw new Error('BOM version not found');
        }

        if (version.status !== 'ACTIVE') {
            throw new Error('Cannot create ECO for archived BOM. Only ACTIVE BOMs can be modified.');
        }
    }
}

/**
 * Validate that component references ACTIVE product only
 */
export async function validateComponentIsActive(componentVersionId: string) {
    const version = await db.query.productVersions.findFirst({
        where: eq(schema.productVersions.id, componentVersionId),
    });

    if (!version) {
        throw new Error('Component product version not found');
    }

    if (version.status !== 'ACTIVE') {
        throw new Error('Cannot use archived product as component. Only ACTIVE products can be used in BOMs.');
    }
}

/**
 * Check if user can view ECOs (not OPERATIONS_USER)
 */
export function canViewECOs(userRole: string): boolean {
    return userRole !== 'OPERATIONS_USER';
}
