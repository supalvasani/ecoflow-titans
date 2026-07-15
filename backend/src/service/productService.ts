import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export class ProductService {
    /**
     * Create a new product with initial version (v1)
     */
    async createProduct(name: string, salePrice: number, costPrice: number, userId: string) {
        if (!name || salePrice === undefined || costPrice === undefined || salePrice === null || costPrice === null) {
            throw new Error('Name, sale price, and cost price are required');
        }
        if (salePrice < 0 || costPrice < 0) {
            throw new Error('Prices cannot be negative');
        }

        const productId = crypto.randomUUID();
        const versionId = crypto.randomUUID();
        const auditId = crypto.randomUUID();

        return await db.transaction(async (tx) => {
            await tx.insert(schema.products).values({
                id: productId,
                name,
            });

            await tx.insert(schema.productVersions).values({
                id: versionId,
                productId,
                version: 1,
                salePrice: salePrice.toString(),
                costPrice: costPrice.toString(),
                status: 'ACTIVE',
                isCurrent: true,
            });

            await tx.insert(schema.auditLogs).values({
                id: auditId,
                entity: 'Product',
                entityId: productId,
                userId,
                action: 'CREATED',
                oldValue: null,
                newValue: `Product "${name}" created with version 1`,
            });

            const product = await tx.query.products.findFirst({
                where: eq(schema.products.id, productId),
                with: {
                    versions: true,
                },
            });

            return product;
        });
    }

    /**
     * Get all products with their active/specified versions
     * Operations users see strictly ACTIVE versions
     */
    async getProducts(userRole: string, includeArchived: boolean = false) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const products = await db.query.products.findMany({
            with: {
                versions: {
                    where: isOperationsUser || !includeArchived
                        ? and(eq(schema.productVersions.status, 'ACTIVE'), eq(schema.productVersions.isCurrent, true))
                        : undefined,
                    orderBy: [desc(schema.productVersions.version)],
                    with: {
                        attachments: true,
                    },
                },
            },
            orderBy: [desc(schema.products.createdAt)],
        });

        // Filter out products with no active versions for Operations user
        if (isOperationsUser) {
            return products.filter(p => p.versions && p.versions.length > 0);
        }

        return products;
    }

    /**
     * Get product by ID with version details
     */
    async getProductById(productId: string, userRole: string, includeVersions: boolean = true) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const product = await db.query.products.findFirst({
            where: eq(schema.products.id, productId),
            with: {
                ...(includeVersions
                    ? {
                        versions: {
                            where: isOperationsUser
                                ? and(eq(schema.productVersions.status, 'ACTIVE'), eq(schema.productVersions.isCurrent, true))
                                : undefined,
                            orderBy: [desc(schema.productVersions.version)],
                            with: {
                                attachments: true,
                            },
                        },
                    }
                    : {}),
            },
        });

        if (!product) {
            throw new Error('Product not found');
        }

        const versions = (product as any).versions;
        if (isOperationsUser && (!versions || versions.length === 0)) {
            throw new Error('Product not found or no active version available');
        }

        return product;
    }

    /**
     * Get all versions of a product (Forbidden for OPERATIONS_USER)
     */
    async getProductVersions(productId: string, userRole?: string) {
        if (userRole === 'OPERATIONS_USER') {
            const error: any = new Error('Forbidden: Operations users cannot view version history');
            error.statusCode = 403;
            throw error;
        }

        const versions = await db.query.productVersions.findMany({
            where: eq(schema.productVersions.productId, productId),
            orderBy: [desc(schema.productVersions.version)],
            with: {
                attachments: true,
            },
        });

        return versions;
    }

    /**
     * Get active version of a product
     */
    async getActiveProductVersion(productId: string) {
        const version = await db.query.productVersions.findFirst({
            where: and(
                eq(schema.productVersions.productId, productId),
                eq(schema.productVersions.status, 'ACTIVE'),
                eq(schema.productVersions.isCurrent, true)
            ),
            with: {
                attachments: true,
            },
        });

        if (!version) {
            throw new Error('No active version found for this product');
        }

        return version;
    }

    /**
     * Get attachments for a product version
     */
    async getAttachments(productVersionId: string) {
        const attachments = await db.query.productAttachments.findMany({
            where: eq(schema.productAttachments.productVersionId, productVersionId),
            orderBy: [desc(schema.productAttachments.createdAt)],
        });

        return attachments;
    }
}

export const productService = new ProductService();
