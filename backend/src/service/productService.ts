import { db } from '../libs/prisma.js';
import { ItemStatus } from '@prisma/client';

export class ProductService {
    /**
     * Create a new product with initial version (v1)
     */
    async createProduct(name: string, salePrice: number, costPrice: number, userId: string) {
        if (!name || salePrice === undefined || costPrice === undefined || salePrice === null || costPrice === null) {
            throw new Error('Name, sale price, and cost price are required');
        }

        // Create product with initial version
        const product = await db.product.create({
            data: {
                name,
                versions: {
                    create: {
                        version: 1,
                        salePrice,
                        costPrice,
                        status: ItemStatus.ACTIVE,
                        isCurrent: true,
                    },
                },
            },
            include: {
                versions: true,
            },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'Product',
                entityId: product.id,
                userId,
                action: 'CREATED',
                oldValue: null,
                newValue: `Product "${name}" created with version 1`,
            },
        });

        return product;
    }

    /**
     * Get all products with their active versions
     * Operations users only see ACTIVE versions
     */
    async getProducts(userRole: string, includeArchived: boolean = false) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const products = await db.product.findMany({
            include: {
                versions: {
                    where: isOperationsUser
                        ? { status: ItemStatus.ACTIVE }
                        : includeArchived
                            ? {}
                            : { status: ItemStatus.ACTIVE },
                    orderBy: { version: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return products;
    }

    /**
     * Get product by ID with version history
     */
    async getProductById(productId: string, userRole: string, includeVersions: boolean = true) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const product = await db.product.findUnique({
            where: { id: productId },
            include: {
                versions: includeVersions
                    ? {
                        where: isOperationsUser ? { status: ItemStatus.ACTIVE } : {},
                        orderBy: { version: 'desc' },
                        include: {
                            attachments: true,
                        },
                    }
                    : false,
            },
        });

        if (!product) {
            throw new Error('Product not found');
        }

        return product;
    }

    /**
     * Get all versions of a product
     */
    async getProductVersions(productId: string) {
        const versions = await db.productVersion.findMany({
            where: { productId },
            orderBy: { version: 'desc' },
            include: {
                attachments: true,
            },
        });

        return versions;
    }

    /**
     * Get active version of a product
     */
    async getActiveProductVersion(productId: string) {
        const version = await db.productVersion.findFirst({
            where: {
                productId,
                status: ItemStatus.ACTIVE,
                isCurrent: true,
            },
            include: {
                attachments: true,
            },
        });

        if (!version) {
            throw new Error('No active version found for this product');
        }

        return version;
    }

    /**
     * Get attachments for a product version (READ-ONLY)
     */
    async getAttachments(productVersionId: string) {
        const attachments = await db.productAttachment.findMany({
            where: { productVersionId },
            orderBy: { createdAt: 'desc' },
        });

        return attachments;
    }
}

export const productService = new ProductService();
