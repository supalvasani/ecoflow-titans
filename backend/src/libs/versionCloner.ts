import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

/**
 * Clone a product version with draft changes applied inside a transaction block
 */
export async function cloneProductVersion(
    tx: any,
    activeVersion: any,
    draft: any,
    draftAttachments: any[] = []
) {
    const nextVersion = activeVersion.version + 1;
    const newVersionId = crypto.randomUUID();

    // 1. Archive current active version
    await tx
        .update(schema.productVersions)
        .set({
            status: 'ARCHIVED',
            isCurrent: false,
        })
        .where(eq(schema.productVersions.id, activeVersion.id));

    // 2. Create new ACTIVE version
    await tx.insert(schema.productVersions).values({
        id: newVersionId,
        productId: activeVersion.productId,
        version: nextVersion,
        salePrice: (draft?.salePrice ?? activeVersion.salePrice).toString(),
        costPrice: (draft?.costPrice ?? activeVersion.costPrice).toString(),
        status: 'ACTIVE',
        isCurrent: true,
    });

    // 3. Clone existing attachments
    const existingAttachments = await tx.query.productAttachments.findMany({
        where: eq(schema.productAttachments.productVersionId, activeVersion.id),
    });

    for (const att of existingAttachments) {
        const toDelete = draftAttachments.find(
            (d: any) => d.filename === att.filename && d.action === 'DELETE'
        );
        if (toDelete) continue;

        await tx.insert(schema.productAttachments).values({
            id: crypto.randomUUID(),
            productVersionId: newVersionId,
            filename: att.filename,
            url: att.url,
        });
    }

    // 4. Add new draft attachments
    for (const draftAtt of draftAttachments) {
        if (draftAtt.action === 'ADD') {
            await tx.insert(schema.productAttachments).values({
                id: crypto.randomUUID(),
                productVersionId: newVersionId,
                filename: draftAtt.filename,
                url: draftAtt.url,
            });
        }
    }

    const newVersion = await tx.query.productVersions.findFirst({
        where: eq(schema.productVersions.id, newVersionId),
        with: { attachments: true },
    });

    return newVersion;
}

/**
 * Update existing active Product Version in-place (hotfix mode)
 */
export async function updateCurrentProductVersion(
    tx: any,
    activeVersion: any,
    draft: any,
    draftAttachments: any[] = []
) {
    await tx
        .update(schema.productVersions)
        .set({
            salePrice: (draft?.salePrice ?? activeVersion.salePrice).toString(),
            costPrice: (draft?.costPrice ?? activeVersion.costPrice).toString(),
        })
        .where(eq(schema.productVersions.id, activeVersion.id));

    // Deletions
    const attachmentsToDelete = draftAttachments.filter((d: any) => d.action === 'DELETE');
    for (const att of attachmentsToDelete) {
        const toDelete = await tx.query.productAttachments.findFirst({
            where: and(
                eq(schema.productAttachments.productVersionId, activeVersion.id),
                eq(schema.productAttachments.filename, att.filename)
            ),
        });
        if (toDelete) {
            await tx.delete(schema.productAttachments).where(eq(schema.productAttachments.id, toDelete.id));
        }
    }

    // Additions
    const attachmentsToAdd = draftAttachments.filter((d: any) => d.action === 'ADD');
    for (const att of attachmentsToAdd) {
        await tx.insert(schema.productAttachments).values({
            id: crypto.randomUUID(),
            productVersionId: activeVersion.id,
            filename: att.filename,
            url: att.url,
        });
    }

    const updated = await tx.query.productVersions.findFirst({
        where: eq(schema.productVersions.id, activeVersion.id),
        with: { attachments: true },
    });

    return updated;
}

/**
 * Clone a BOM version with draft changes applied inside a transaction block
 */
export async function cloneBOMVersion(
    tx: any,
    activeVersion: any,
    draft: any,
    draftComponents: any[] = [],
    draftOperations: any[] = []
) {
    const nextVersion = activeVersion.version + 1;
    const newVersionId = crypto.randomUUID();

    // 1. Archive current active BOM version
    await tx
        .update(schema.bomVersions)
        .set({
            status: 'ARCHIVED',
            isCurrent: false,
        })
        .where(eq(schema.bomVersions.id, activeVersion.id));

    // 2. Insert new ACTIVE BOM Version
    await tx.insert(schema.bomVersions).values({
        id: newVersionId,
        bomId: activeVersion.bomId,
        productVersionId: activeVersion.productVersionId,
        version: nextVersion,
        status: 'ACTIVE',
        isCurrent: true,
    });

    // 3. Process components map
    const existingComponents = await tx.query.bomComponents.findMany({
        where: eq(schema.bomComponents.bomVersionId, activeVersion.id),
    });

    const componentMap = new Map<string, { quantity: number; action: string }>();
    for (const comp of existingComponents) {
        componentMap.set(comp.componentVersionId, {
            quantity: comp.quantity,
            action: 'KEEP',
        });
    }

    for (const draftComp of draftComponents) {
        if (draftComp.action === 'DELETE') {
            componentMap.delete(draftComp.componentVersionId);
        } else if (draftComp.action === 'UPDATE' || draftComp.action === 'ADD') {
            componentMap.set(draftComp.componentVersionId, {
                quantity: draftComp.quantity,
                action: draftComp.action,
            });
        }
    }

    for (const [componentVersionId, { quantity }] of componentMap) {
        await tx.insert(schema.bomComponents).values({
            id: crypto.randomUUID(),
            bomVersionId: newVersionId,
            componentVersionId,
            quantity,
        });
    }

    // 4. Process operations map
    const existingOperations = await tx.query.bomOperations.findMany({
        where: eq(schema.bomOperations.bomVersionId, activeVersion.id),
    });

    const operationMap = new Map<string, { name: string; timeMinutes: number; workCenter: string }>();
    for (const op of existingOperations) {
        operationMap.set(op.name, {
            name: op.name,
            timeMinutes: op.timeMinutes,
            workCenter: op.workCenter,
        });
    }

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

    for (const op of operationMap.values()) {
        await tx.insert(schema.bomOperations).values({
            id: crypto.randomUUID(),
            bomVersionId: newVersionId,
            name: op.name,
            timeMinutes: op.timeMinutes,
            workCenter: op.workCenter,
        });
    }

    const newVersion = await tx.query.bomVersions.findFirst({
        where: eq(schema.bomVersions.id, newVersionId),
        with: {
            components: true,
            operations: true,
        },
    });

    return newVersion;
}

/**
 * Update existing active BOM version in-place (hotfix mode)
 */
export async function updateCurrentBOMVersion(
    tx: any,
    activeVersion: any,
    draft: any,
    draftComponents: any[] = [],
    draftOperations: any[] = []
) {
    // 1. Components
    for (const draftComp of draftComponents) {
        if (draftComp.action === 'DELETE') {
            await tx
                .delete(schema.bomComponents)
                .where(
                    and(
                        eq(schema.bomComponents.bomVersionId, activeVersion.id),
                        eq(schema.bomComponents.componentVersionId, draftComp.componentVersionId)
                    )
                );
        } else if (draftComp.action === 'UPDATE') {
            await tx
                .update(schema.bomComponents)
                .set({ quantity: draftComp.quantity })
                .where(
                    and(
                        eq(schema.bomComponents.bomVersionId, activeVersion.id),
                        eq(schema.bomComponents.componentVersionId, draftComp.componentVersionId)
                    )
                );
        } else if (draftComp.action === 'ADD') {
            await tx.insert(schema.bomComponents).values({
                id: crypto.randomUUID(),
                bomVersionId: activeVersion.id,
                componentVersionId: draftComp.componentVersionId,
                quantity: draftComp.quantity,
            });
        }
    }

    // 2. Operations
    for (const draftOp of draftOperations) {
        if (draftOp.action === 'DELETE') {
            await tx
                .delete(schema.bomOperations)
                .where(
                    and(
                        eq(schema.bomOperations.bomVersionId, activeVersion.id),
                        eq(schema.bomOperations.name, draftOp.name)
                    )
                );
        } else if (draftOp.action === 'UPDATE') {
            await tx
                .update(schema.bomOperations)
                .set({
                    timeMinutes: draftOp.timeMinutes,
                    workCenter: draftOp.workCenter,
                })
                .where(
                    and(
                        eq(schema.bomOperations.bomVersionId, activeVersion.id),
                        eq(schema.bomOperations.name, draftOp.name)
                    )
                );
        } else if (draftOp.action === 'ADD') {
            await tx.insert(schema.bomOperations).values({
                id: crypto.randomUUID(),
                bomVersionId: activeVersion.id,
                name: draftOp.name,
                timeMinutes: draftOp.timeMinutes,
                workCenter: draftOp.workCenter,
            });
        }
    }

    const updated = await tx.query.bomVersions.findFirst({
        where: eq(schema.bomVersions.id, activeVersion.id),
        with: {
            components: true,
            operations: true,
        },
    });

    return updated;
}
