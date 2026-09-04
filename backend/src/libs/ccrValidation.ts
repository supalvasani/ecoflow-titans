import { db, schema } from '../db/index.js';
import { eq, asc } from 'drizzle-orm';

/**
 * Validate that a CCR can be edited (must be in the first/draft stage).
 */
export async function validateCCREdit(ccrStageId: string) {
    const stage = await db.query.ccrStages.findFirst({ where: eq(schema.ccrStages.id, ccrStageId) });
    if (!stage) throw new Error('Stage not found');

    const firstStage = await db.query.ccrStages.findFirst({ orderBy: [asc(schema.ccrStages.sequence)] });

    if (stage.id !== firstStage?.id) {
        throw new Error('Catalog Change Request cannot be edited after leaving the draft stage.');
    }
}

/**
 * Validate that the current user role can approve a CCR at its stage.
 */
export async function validateApproval(ccrStageId: string, userRole: string) {
    const stage = await db.query.ccrStages.findFirst({ where: eq(schema.ccrStages.id, ccrStageId) });
    if (!stage) throw new Error('Stage not found');

    if (!stage.requiresApproval) {
        throw new Error('This stage does not require approval');
    }
    if (!['CATEGORY_APPROVER', 'ADMIN'].includes(userRole)) {
        throw new Error('Only Category Approvers can approve Catalog Change Requests');
    }
}

/**
 * Validate that the CCR can be applied (stage must not already be final).
 */
export async function validateApply(ccrStageId: string) {
    const stage = await db.query.ccrStages.findFirst({ where: eq(schema.ccrStages.id, ccrStageId) });
    if (!stage) throw new Error('Stage not found');

    if (stage.isFinal) {
        throw new Error('Catalog Change Request is already applied/final.');
    }
}

/**
 * Prevent direct mutations to master catalog data.
 */
export function preventDirectUpdate(): never {
    throw new Error('Direct updates forbidden. All changes must go through the CCR workflow.');
}

/**
 * Validate that a CatalogItemVersion or VariantSetVersion is ACTIVE (not archived).
 */
export async function validateActiveVersion(versionId: string, type: 'catalogItem' | 'variantSet') {
    if (type === 'catalogItem') {
        const version = await db.query.catalogItemVersions.findFirst({
            where: eq(schema.catalogItemVersions.id, versionId),
        });

        if (!version) {
            throw new Error('CatalogItem version not found');
        }
        if (version.status !== 'ACTIVE') {
            throw new Error('Cannot create a CCR for an archived CatalogItem. Only ACTIVE items can be modified.');
        }
    } else {
        const version = await db.query.variantSetVersions.findFirst({
            where: eq(schema.variantSetVersions.id, versionId),
        });

        if (!version) {
            throw new Error('VariantSet version not found');
        }
        if (version.status !== 'ACTIVE') {
            throw new Error('Cannot create a CCR for an archived VariantSet. Only ACTIVE sets can be modified.');
        }
    }
}

/**
 * Validate that a Variant references an ACTIVE CatalogItemVersion.
 * (Was: validateComponentIsActive — same rule, new naming.)
 */
export async function validateVariantVersionIsActive(variantVersionId: string) {
    const version = await db.query.catalogItemVersions.findFirst({
        where: eq(schema.catalogItemVersions.id, variantVersionId),
    });

    if (!version) {
        throw new Error('Variant CatalogItemVersion not found');
    }
    if (version.status !== 'ACTIVE') {
        throw new Error('Cannot use an archived CatalogItemVersion as a Variant. Only ACTIVE versions can be referenced.');
    }
}

/**
 * Check if user role can view CCRs (STOREFRONT_VIEWER cannot).
 */
export function canViewCCRs(userRole: string): boolean {
    return userRole !== 'STOREFRONT_VIEWER';
}
