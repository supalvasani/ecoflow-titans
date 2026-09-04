import { db, schema } from '../db/index.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

/** CCR change history */
export const getCCRHistory = async (filters?: {
    type?: string;
    stageId?: string;
    startDate?: Date;
    endDate?: Date;
}) => {
    const conditions: any[] = [];
    if (filters?.type)      conditions.push(eq(schema.catalogChangeRequests.type, filters.type as any));
    if (filters?.stageId)   conditions.push(eq(schema.catalogChangeRequests.stageId, filters.stageId));
    if (filters?.startDate) conditions.push(gte(schema.catalogChangeRequests.createdAt, filters.startDate));
    if (filters?.endDate)   conditions.push(lte(schema.catalogChangeRequests.createdAt, filters.endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.catalogChangeRequests.findMany({
        where: whereClause,
        with: {
            createdBy:  { columns: { id: true, name: true, email: true } },
            stage:      true,
            draftCatalogItem: { columns: { id: true, name: true, sku: true } },
            draftVariantSet:  { columns: { id: true } },
        },
        orderBy: [desc(schema.catalogChangeRequests.createdAt)],
    });
};

/** CatalogItem version history */
export const getCatalogItemVersionHistory = async (catalogItemId?: string) => {
    const whereClause = catalogItemId
        ? eq(schema.catalogItemVersions.catalogItemId, catalogItemId)
        : undefined;

    return db.query.catalogItemVersions.findMany({
        where: whereClause,
        with: {
            catalogItem: { columns: { id: true, name: true, sku: true } },
            content: true,
        },
        orderBy: [desc(schema.catalogItemVersions.version)],
    });
};

/** VariantSet change history */
export const getVariantSetHistory = async (variantSetId?: string) => {
    const whereClause = variantSetId
        ? eq(schema.variantSetVersions.variantSetId, variantSetId)
        : undefined;

    return db.query.variantSetVersions.findMany({
        where: whereClause,
        with: {
            variantSet: { columns: { id: true } },
            variants: {
                with: {
                    variantVersion: { columns: { id: true, version: true, catalogItemId: true } },
                },
            },
            channelPublishRules: true,
        },
        orderBy: [desc(schema.variantSetVersions.version)],
    });
};

/** Active CatalogItem–Version–VariantSet matrix */
export const getActiveMatrix = async () => {
    const catalogItems = await db.query.catalogItems.findMany({
        with: {
            versions: {
                where: and(
                    eq(schema.catalogItemVersions.isCurrent, true),
                    eq(schema.catalogItemVersions.status, 'ACTIVE')
                ),
                with: { content: true },
            },
        },
    });

    const variantSets = await db.query.variantSets.findMany({
        with: {
            versions: {
                where: and(
                    eq(schema.variantSetVersions.isCurrent, true),
                    eq(schema.variantSetVersions.status, 'ACTIVE')
                ),
                with: {
                    variants: {
                        with: {
                            variantVersion: {
                                columns: { id: true, version: true, catalogItemId: true },
                                with: { catalogItem: { columns: { name: true, sku: true } } },
                            },
                        },
                    },
                    channelPublishRules: true,
                },
            },
        },
    });

    return { catalogItems, variantSets, timestamp: new Date() };
};

/** Archived CatalogItems */
export const getArchivedCatalogItems = async () => {
    return db.query.catalogItemVersions.findMany({
        where: eq(schema.catalogItemVersions.status, 'ARCHIVED'),
        with: {
            catalogItem: { columns: { id: true, name: true, sku: true } },
        },
        orderBy: [desc(schema.catalogItemVersions.createdAt)],
    });
};

export const reportService = {
    getCCRHistory,
    getCatalogItemVersionHistory,
    getVariantSetHistory,
    getArchivedCatalogItems,
    getActiveMatrix,
};
