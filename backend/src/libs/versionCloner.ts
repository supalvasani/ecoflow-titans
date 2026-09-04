import { db, schema } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';

// ============================================================
// CatalogItemVersion cloners (was: ProductVersion cloners)
// ============================================================

/**
 * Clone a CatalogItemVersion with draft changes applied inside a transaction.
 * Was: cloneProductVersion()
 */
export async function cloneCatalogItemVersion(
    tx: any,
    activeVersion: any,
    draft: any,
    draftContent: any[] = []
) {
    const nextVersion = activeVersion.version + 1;
    const newVersionId = crypto.randomUUID();

    // 1. Archive current active version
    await tx.update(schema.catalogItemVersions)
        .set({ status: 'ARCHIVED', isCurrent: false })
        .where(eq(schema.catalogItemVersions.id, activeVersion.id));

    // 2. Create new ACTIVE version with draft delta merged
    await tx.insert(schema.catalogItemVersions).values({
        id: newVersionId,
        catalogItemId: activeVersion.catalogItemId,
        version: nextVersion,
        salePrice: ((draft?.salePrice) ?? parseFloat(activeVersion.salePrice)).toString(),
        costPrice: ((draft?.costPrice) ?? parseFloat(activeVersion.costPrice)).toString(),
        currency: draft?.currency ?? activeVersion.currency ?? 'USD',
        status: 'ACTIVE',
        isCurrent: true,
    });

    // 3. Clone existing content items (was: attachments), skipping DELETE-flagged ones
    const existingContent = await tx.query.catalogItemContent.findMany({
        where: eq(schema.catalogItemContent.catalogItemVersionId, activeVersion.id),
    });

    for (const item of existingContent) {
        const toDelete = draftContent.find(
            (d: any) => d.filename === item.filename && d.action === 'DELETE'
        );
        if (toDelete) continue;

        await tx.insert(schema.catalogItemContent).values({
            id: crypto.randomUUID(),
            catalogItemVersionId: newVersionId,
            locale: item.locale,
            contentType: item.contentType,
            filename: item.filename,
            url: item.url,
            approved: item.approved,
        });
    }

    // 4. Add new draft content items
    for (const draftItem of draftContent) {
        if (draftItem.action === 'ADD') {
            await tx.insert(schema.catalogItemContent).values({
                id: crypto.randomUUID(),
                catalogItemVersionId: newVersionId,
                locale: draftItem.locale ?? 'en-US',
                contentType: draftItem.contentType ?? 'IMAGE',
                filename: draftItem.filename,
                url: draftItem.url,
                approved: false, // New content always starts unapproved
            });
        }
    }

    return tx.query.catalogItemVersions.findFirst({
        where: eq(schema.catalogItemVersions.id, newVersionId),
        with: { content: true },
    });
}

/**
 * Update existing active CatalogItemVersion in-place (hotfix / no version increment).
 * Was: updateCurrentProductVersion()
 */
export async function updateCurrentCatalogItemVersion(
    tx: any,
    activeVersion: any,
    draft: any,
    draftContent: any[] = []
) {
    await tx.update(schema.catalogItemVersions)
        .set({
            salePrice: ((draft?.salePrice) ?? parseFloat(activeVersion.salePrice)).toString(),
            costPrice: ((draft?.costPrice) ?? parseFloat(activeVersion.costPrice)).toString(),
            currency: draft?.currency ?? activeVersion.currency,
        })
        .where(eq(schema.catalogItemVersions.id, activeVersion.id));

    // Handle content deletions
    for (const item of draftContent.filter((d: any) => d.action === 'DELETE')) {
        const toDelete = await tx.query.catalogItemContent.findFirst({
            where: and(
                eq(schema.catalogItemContent.catalogItemVersionId, activeVersion.id),
                eq(schema.catalogItemContent.filename, item.filename)
            ),
        });
        if (toDelete) {
            await tx.delete(schema.catalogItemContent)
                .where(eq(schema.catalogItemContent.id, toDelete.id));
        }
    }

    // Handle content additions
    for (const item of draftContent.filter((d: any) => d.action === 'ADD')) {
        await tx.insert(schema.catalogItemContent).values({
            id: crypto.randomUUID(),
            catalogItemVersionId: activeVersion.id,
            locale: item.locale ?? 'en-US',
            contentType: item.contentType ?? 'IMAGE',
            filename: item.filename,
            url: item.url,
            approved: false,
        });
    }

    return tx.query.catalogItemVersions.findFirst({
        where: eq(schema.catalogItemVersions.id, activeVersion.id),
        with: { content: true },
    });
}

// ============================================================
// VariantSetVersion cloners (was: BOMVersion cloners)
// ============================================================

/**
 * Clone a VariantSetVersion with draft changes applied inside a transaction.
 * Was: cloneBOMVersion()
 * draftVariants   = was draftComponents  (ADD/UPDATE/DELETE by variantVersionId)
 * draftChannelRules = was draftOperations (ADD/UPDATE/DELETE by channel+region key)
 */
export async function cloneVariantSetVersion(
    tx: any,
    activeVersion: any,
    draft: any,
    draftVariants: any[] = [],
    draftChannelRules: any[] = []
) {
    const nextVersion = activeVersion.version + 1;
    const newVersionId = crypto.randomUUID();

    // 1. Archive current active VariantSetVersion
    await tx.update(schema.variantSetVersions)
        .set({ status: 'ARCHIVED', isCurrent: false })
        .where(eq(schema.variantSetVersions.id, activeVersion.id));

    // 2. Insert new ACTIVE VariantSetVersion
    await tx.insert(schema.variantSetVersions).values({
        id: newVersionId,
        variantSetId: activeVersion.variantSetId,
        catalogItemVersionId: activeVersion.catalogItemVersionId,
        version: nextVersion,
        status: 'ACTIVE',
        isCurrent: true,
    });

    // 3. Process Variants (was BOMComponents) — merge existing + draft delta
    const existingVariants = await tx.query.variants.findMany({
        where: eq(schema.variants.variantSetVersionId, activeVersion.id),
    });

    // Build map: key = variantVersionId (like componentVersionId in old BOM)
    const variantMap = new Map<string, { attributeName: string; attributeValue: string; stockQty: number }>();
    for (const v of existingVariants) {
        variantMap.set(v.variantVersionId, {
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
            stockQty: v.stockQty,
        });
    }

    for (const dv of draftVariants) {
        if (dv.action === 'DELETE') {
            variantMap.delete(dv.variantVersionId);
        } else if (dv.action === 'UPDATE' || dv.action === 'ADD') {
            variantMap.set(dv.variantVersionId, {
                attributeName: dv.attributeName,
                attributeValue: dv.attributeValue,
                stockQty: dv.stockQty,
            });
        }
    }

    for (const [variantVersionId, v] of variantMap) {
        await tx.insert(schema.variants).values({
            id: crypto.randomUUID(),
            variantSetVersionId: newVersionId,
            variantVersionId,
            attributeName: v.attributeName,
            attributeValue: v.attributeValue,
            stockQty: v.stockQty,
        });
    }

    // 4. Process ChannelPublishRules (was BOMOperations) — keyed by channel+region
    const existingRules = await tx.query.channelPublishRules.findMany({
        where: eq(schema.channelPublishRules.variantSetVersionId, activeVersion.id),
    });

    const ruleMap = new Map<string, { channel: string; region: string; isLive: boolean; goLiveAt: Date | null; publishLeadMinutes: number }>();
    for (const r of existingRules) {
        ruleMap.set(`${r.channel}:${r.region}`, {
            channel: r.channel,
            region: r.region,
            isLive: r.isLive,
            goLiveAt: r.goLiveAt,
            publishLeadMinutes: r.publishLeadMinutes,
        });
    }

    for (const dr of draftChannelRules) {
        const key = `${dr.channel}:${dr.region}`;
        if (dr.action === 'DELETE') {
            ruleMap.delete(key);
        } else if (dr.action === 'UPDATE' || dr.action === 'ADD') {
            ruleMap.set(key, {
                channel: dr.channel,
                region: dr.region,
                isLive: dr.isLive ?? false,
                goLiveAt: dr.goLiveAt ? new Date(dr.goLiveAt) : null,
                publishLeadMinutes: dr.publishLeadMinutes ?? 0,
            });
        }
    }

    for (const r of ruleMap.values()) {
        await tx.insert(schema.channelPublishRules).values({
            id: crypto.randomUUID(),
            variantSetVersionId: newVersionId,
            channel: r.channel,
            region: r.region,
            isLive: r.isLive,
            goLiveAt: r.goLiveAt,
            publishLeadMinutes: r.publishLeadMinutes,
        });
    }

    return tx.query.variantSetVersions.findFirst({
        where: eq(schema.variantSetVersions.id, newVersionId),
        with: { variants: true, channelPublishRules: true },
    });
}

/**
 * Update existing active VariantSetVersion in-place (hotfix mode).
 * Was: updateCurrentBOMVersion()
 */
export async function updateCurrentVariantSetVersion(
    tx: any,
    activeVersion: any,
    draftVariants: any[] = [],
    draftChannelRules: any[] = []
) {
    // 1. Variants (was BOMComponents)
    for (const dv of draftVariants) {
        if (dv.action === 'DELETE') {
            await tx.delete(schema.variants).where(
                and(
                    eq(schema.variants.variantSetVersionId, activeVersion.id),
                    eq(schema.variants.variantVersionId, dv.variantVersionId)
                )
            );
        } else if (dv.action === 'UPDATE') {
            await tx.update(schema.variants)
                .set({ stockQty: dv.stockQty, attributeName: dv.attributeName, attributeValue: dv.attributeValue })
                .where(and(
                    eq(schema.variants.variantSetVersionId, activeVersion.id),
                    eq(schema.variants.variantVersionId, dv.variantVersionId)
                ));
        } else if (dv.action === 'ADD') {
            await tx.insert(schema.variants).values({
                id: crypto.randomUUID(),
                variantSetVersionId: activeVersion.id,
                variantVersionId: dv.variantVersionId,
                attributeName: dv.attributeName,
                attributeValue: dv.attributeValue,
                stockQty: dv.stockQty,
            });
        }
    }

    // 2. ChannelPublishRules (was BOMOperations) — keyed by channel+region
    for (const dr of draftChannelRules) {
        if (dr.action === 'DELETE') {
            await tx.delete(schema.channelPublishRules).where(
                and(
                    eq(schema.channelPublishRules.variantSetVersionId, activeVersion.id),
                    eq(schema.channelPublishRules.channel, dr.channel),
                    eq(schema.channelPublishRules.region, dr.region)
                )
            );
        } else if (dr.action === 'UPDATE') {
            await tx.update(schema.channelPublishRules)
                .set({ isLive: dr.isLive, goLiveAt: dr.goLiveAt ? new Date(dr.goLiveAt) : null, publishLeadMinutes: dr.publishLeadMinutes })
                .where(and(
                    eq(schema.channelPublishRules.variantSetVersionId, activeVersion.id),
                    eq(schema.channelPublishRules.channel, dr.channel),
                    eq(schema.channelPublishRules.region, dr.region)
                ));
        } else if (dr.action === 'ADD') {
            await tx.insert(schema.channelPublishRules).values({
                id: crypto.randomUUID(),
                variantSetVersionId: activeVersion.id,
                channel: dr.channel,
                region: dr.region,
                isLive: dr.isLive ?? false,
                goLiveAt: dr.goLiveAt ? new Date(dr.goLiveAt) : null,
                publishLeadMinutes: dr.publishLeadMinutes ?? 0,
            });
        }
    }

    return tx.query.variantSetVersions.findFirst({
        where: eq(schema.variantSetVersions.id, activeVersion.id),
        with: { variants: true, channelPublishRules: true },
    });
}
