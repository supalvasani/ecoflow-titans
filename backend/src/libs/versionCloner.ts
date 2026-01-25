import { db } from './prisma.js';
import { ItemStatus } from '@prisma/client';

/**
 * Clone a product version with draft changes applied
 * This creates a new version, applies changes, and archives the old version
 */
export async function cloneProductVersion(
    activeVersion: any,
    draft: any,
    draftAttachments: any[]
) {
    // Get next version number
    const nextVersion = activeVersion.version + 1;

    // Clone with changes from draft
    const newVersion = await db.productVersion.create({
        data: {
            productId: activeVersion.productId,
            version: nextVersion,
            salePrice: draft?.salePrice ?? activeVersion.salePrice,
            costPrice: draft?.costPrice ?? activeVersion.costPrice,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    // Clone existing attachments
    const existingAttachments = await db.productAttachment.findMany({
        where: { productVersionId: activeVersion.id },
    });

    for (const att of existingAttachments) {
        // Skip if marked for deletion in draft
        const toDelete = draftAttachments.find(
            d => d.filename === att.filename && d.action === 'DELETE'
        );
        if (toDelete) continue;

        await db.productAttachment.create({
            data: {
                productVersionId: newVersion.id,
                filename: att.filename,
                url: att.url,
            },
        });
    }

    // Add new attachments from draft
    for (const draftAtt of draftAttachments) {
        if (draftAtt.action === 'ADD') {
            await db.productAttachment.create({
                data: {
                    productVersionId: newVersion.id,
                    filename: draftAtt.filename,
                    url: draftAtt.url,
                },
            });
        }
    }

    // Archive old version
    await db.productVersion.update({
        where: { id: activeVersion.id },
        data: {
            status: ItemStatus.ARCHIVED,
            isCurrent: false,
        },
    });

    return newVersion;
}

/**
 * Update the CURRENT product version in-place (no version increment)
 */
export async function updateCurrentProductVersion(
    activeVersion: any,
    draft: any,
    draftAttachments: any[]
) {
    // Update active version directly
    const updatedVersion = await db.productVersion.update({
        where: { id: activeVersion.id },
        data: {
            salePrice: draft?.salePrice ?? activeVersion.salePrice,
            costPrice: draft?.costPrice ?? activeVersion.costPrice,
        },
    });

    // Handle attachments (Add/Delete)
    // First, handle deletions
    const attachmentsToDelete = draftAttachments.filter(d => d.action === 'DELETE');
    for (const att of attachmentsToDelete) {
        // Find attachment by filename for this version
        const toDelete = await db.productAttachment.findFirst({
            where: {
                productVersionId: activeVersion.id,
                filename: att.filename,
            },
        });

        if (toDelete) {
            await db.productAttachment.delete({ where: { id: toDelete.id } });
        }
    }

    // Handle additions
    const attachmentsToAdd = draftAttachments.filter(d => d.action === 'ADD');
    for (const att of attachmentsToAdd) {
        await db.productAttachment.create({
            data: {
                productVersionId: activeVersion.id,
                filename: att.filename,
                url: att.url,
            },
        });
    }

    return updatedVersion;
}

/**
 * Clone a BOM version with draft changes applied
 * This creates a new version, applies component/operation changes, and archives the old version
 */
export async function cloneBOMVersion(
    activeVersion: any,
    draft: any,
    draftComponents: any[],
    draftOperations: any[]
) {
    // Get next version number
    const nextVersion = activeVersion.version + 1;

    // Clone BOM version
    const newVersion = await db.bOMVersion.create({
        data: {
            bomId: activeVersion.bomId,
            productVersionId: activeVersion.productVersionId,
            version: nextVersion,
            status: ItemStatus.ACTIVE,
            isCurrent: true,
        },
    });

    // Clone existing components
    const existingComponents = await db.bOMComponent.findMany({
        where: { bomVersionId: activeVersion.id },
    });

    // Track which components to keep/update
    const componentMap = new Map<string, { quantity: number; action: string }>();

    // Start with existing components
    for (const comp of existingComponents) {
        componentMap.set(comp.componentVersionId, {
            quantity: comp.quantity,
            action: 'KEEP',
        });
    }

    // Apply draft changes
    for (const draftComp of draftComponents) {
        if (draftComp.action === 'DELETE') {
            componentMap.delete(draftComp.componentVersionId);
        } else if (draftComp.action === 'UPDATE') {
            componentMap.set(draftComp.componentVersionId, {
                quantity: draftComp.quantity,
                action: 'UPDATE',
            });
        } else if (draftComp.action === 'ADD') {
            componentMap.set(draftComp.componentVersionId, {
                quantity: draftComp.quantity,
                action: 'ADD',
            });
        }
    }

    // Create components for new version
    for (const [componentVersionId, { quantity }] of componentMap) {
        await db.bOMComponent.create({
            data: {
                bomVersionId: newVersion.id,
                componentVersionId,
                quantity,
            },
        });
    }

    // Clone existing operations
    const existingOperations = await db.bOMOperation.findMany({
        where: { bomVersionId: activeVersion.id },
    });

    // Track operations
    const operationMap = new Map<string, { name: string; timeMinutes: number; workCenter: string }>();

    // Start with existing operations (use name as key)
    for (const op of existingOperations) {
        operationMap.set(op.name, {
            name: op.name,
            timeMinutes: op.timeMinutes,
            workCenter: op.workCenter,
        });
    }

    // Apply draft operation changes
    for (const draftOp of draftOperations) {
        if (draftOp.action === 'DELETE') {
            operationMap.delete(draftOp.name);
        } else if (draftOp.action === 'UPDATE' || draftOp.action === 'ADD') {
            operationMap.set(draftOp.name, {
                name: draftOp.name,
                timeMinutes: draftOp.timeMinutes,
                workCenter: draftOp.workCenter,
            });
        }
    }

    // Create operations for new version
    for (const op of operationMap.values()) {
        await db.bOMOperation.create({
            data: {
                bomVersionId: newVersion.id,
                name: op.name,
                timeMinutes: op.timeMinutes,
                workCenter: op.workCenter,
            },
        });
    }

    // Archive old version
    await db.bOMVersion.update({
        where: { id: activeVersion.id },
        data: {
            status: ItemStatus.ARCHIVED,
            isCurrent: false,
        },
    });

    return newVersion;
}

/**
 * Update the CURRENT BOM version in-place (no version increment)
 */
export async function updateCurrentBOMVersion(
    activeVersion: any,
    draft: any,
    draftComponents: any[],
    draftOperations: any[]
) {
    // 1. Handle Components
    for (const draftComp of draftComponents) {
        if (draftComp.action === 'DELETE') {
            await db.bOMComponent.deleteMany({
                where: {
                    bomVersionId: activeVersion.id,
                    componentVersionId: draftComp.componentVersionId,
                },
            });
        } else if (draftComp.action === 'UPDATE') {
            await db.bOMComponent.updateMany({
                where: {
                    bomVersionId: activeVersion.id,
                    componentVersionId: draftComp.componentVersionId,
                },
                data: { quantity: draftComp.quantity },
            });
        } else if (draftComp.action === 'ADD') {
            await db.bOMComponent.create({
                data: {
                    bomVersionId: activeVersion.id,
                    componentVersionId: draftComp.componentVersionId,
                    quantity: draftComp.quantity,
                },
            });
        }
    }

    // 2. Handle Operations
    // Note: Operations are tricky because they don't have stable IDs in the draft, usually matched by name
    for (const draftOp of draftOperations) {
        if (draftOp.action === 'DELETE') {
            await db.bOMOperation.deleteMany({
                where: {
                    bomVersionId: activeVersion.id,
                    name: draftOp.name,
                },
            });
        } else if (draftOp.action === 'UPDATE') {
            await db.bOMOperation.updateMany({
                where: {
                    bomVersionId: activeVersion.id,
                    name: draftOp.name,
                },
                data: {
                    timeMinutes: draftOp.timeMinutes,
                    workCenter: draftOp.workCenter,
                },
            });
        } else if (draftOp.action === 'ADD') {
            await db.bOMOperation.create({
                data: {
                    bomVersionId: activeVersion.id,
                    name: draftOp.name,
                    timeMinutes: draftOp.timeMinutes,
                    workCenter: draftOp.workCenter,
                },
            });
        }
    }

    return activeVersion;
}
