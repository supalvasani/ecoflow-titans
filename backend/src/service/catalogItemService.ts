import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export class CatalogItemService {
    /**
     * Create a new CatalogItem with initial version (v1).
     */
    async createCatalogItem(
        name: string,
        sku: string,
        salePrice: number,
        costPrice: number,
        userId: string,
        opts?: { brand?: string; category?: string; currency?: string }
    ) {
        if (!name || !sku || salePrice === undefined || costPrice === undefined) {
            throw new Error('Name, SKU, sale price, and cost price are required');
        }
        if (salePrice < 0 || costPrice < 0) {
            throw new Error('Prices cannot be negative');
        }

        const catalogItemId = crypto.randomUUID();
        const versionId = crypto.randomUUID();
        const auditId = crypto.randomUUID();

        return await db.transaction(async (tx) => {
            await tx.insert(schema.catalogItems).values({
                id: catalogItemId,
                name,
                sku,
                brand: opts?.brand ?? null,
                category: opts?.category ?? null,
            });

            await tx.insert(schema.catalogItemVersions).values({
                id: versionId,
                catalogItemId,
                version: 1,
                salePrice: salePrice.toString(),
                costPrice: costPrice.toString(),
                currency: opts?.currency ?? 'USD',
                status: 'ACTIVE',
                isCurrent: true,
            });

            await tx.insert(schema.auditLogs).values({
                id: auditId,
                entity: 'CatalogItem',
                entityId: catalogItemId,
                userId,
                action: 'CREATED',
                oldValue: null,
                newValue: `CatalogItem "${name}" (SKU: ${sku}) created with version 1`,
            });

            return tx.query.catalogItems.findFirst({
                where: eq(schema.catalogItems.id, catalogItemId),
                with: { versions: true },
            });
        });
    }

    /**
     * Get all CatalogItems with their active/specified versions.
     * STOREFRONT_VIEWER only sees ACTIVE+isCurrent versions.
     */
    async getCatalogItems(userRole: string, includeArchived: boolean = false) {
        const isStorefront = userRole === 'STOREFRONT_VIEWER';

        const items = await db.query.catalogItems.findMany({
            with: {
                versions: {
                    where: isStorefront || !includeArchived
                        ? and(eq(schema.catalogItemVersions.status, 'ACTIVE'), eq(schema.catalogItemVersions.isCurrent, true))
                        : undefined,
                    orderBy: [desc(schema.catalogItemVersions.version)],
                    with: { content: true },
                },
            },
            orderBy: [desc(schema.catalogItems.createdAt)],
        });

        if (isStorefront) {
            return items.filter(i => i.versions && i.versions.length > 0);
        }

        return items;
    }

    /**
     * Get a CatalogItem by ID with version details.
     * STOREFRONT_VIEWER only sees active versions.
     */
    async getCatalogItemById(catalogItemId: string, userRole: string, includeVersions: boolean = true) {
        const isStorefront = userRole === 'STOREFRONT_VIEWER';

        const item = await db.query.catalogItems.findFirst({
            where: eq(schema.catalogItems.id, catalogItemId),
            with: {
                ...(includeVersions ? {
                    versions: {
                        where: isStorefront
                            ? and(eq(schema.catalogItemVersions.status, 'ACTIVE'), eq(schema.catalogItemVersions.isCurrent, true))
                            : undefined,
                        orderBy: [desc(schema.catalogItemVersions.version)],
                        with: { content: true },
                    },
                } : {}),
            },
        });

        if (!item) throw new Error('CatalogItem not found');

        const versions = (item as any).versions;
        if (isStorefront && (!versions || versions.length === 0)) {
            throw new Error('CatalogItem not found or no active version available');
        }

        return item;
    }

    /**
     * Get all versions of a CatalogItem (Forbidden for STOREFRONT_VIEWER).
     */
    async getCatalogItemVersions(catalogItemId: string, userRole?: string) {
        if (userRole === 'STOREFRONT_VIEWER') {
            const error: any = new Error('Forbidden: Storefront viewers cannot view version history');
            error.statusCode = 403;
            throw error;
        }

        return db.query.catalogItemVersions.findMany({
            where: eq(schema.catalogItemVersions.catalogItemId, catalogItemId),
            orderBy: [desc(schema.catalogItemVersions.version)],
            with: { content: true },
        });
    }

    /**
     * Get the current active version of a CatalogItem.
     */
    async getActiveCatalogItemVersion(catalogItemId: string) {
        const version = await db.query.catalogItemVersions.findFirst({
            where: and(
                eq(schema.catalogItemVersions.catalogItemId, catalogItemId),
                eq(schema.catalogItemVersions.status, 'ACTIVE'),
                eq(schema.catalogItemVersions.isCurrent, true)
            ),
            with: { content: true },
        });

        if (!version) throw new Error('No active version found for this CatalogItem');

        return version;
    }

    /**
     * Get content for a specific CatalogItemVersion.
     */
    async getContent(catalogItemVersionId: string) {
        return db.query.catalogItemContent.findMany({
            where: eq(schema.catalogItemContent.catalogItemVersionId, catalogItemVersionId),
            orderBy: [desc(schema.catalogItemContent.createdAt)],
        });
    }
}

export const catalogItemService = new CatalogItemService();
