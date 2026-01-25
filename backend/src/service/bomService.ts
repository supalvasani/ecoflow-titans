import { db } from '../libs/prisma.js';
import { ItemStatus } from '@prisma/client';

export class BOMService {
    /**
     * Create a new BOM with initial version (v1)
     */
    async createBOM(productId: string, userId: string) {
        if (!productId) {
            throw new Error('Product ID is required');
        }

        // Verify product exists and get active version
        const product = await db.product.findUnique({
            where: { id: productId },
            include: {
                versions: {
                    where: { status: ItemStatus.ACTIVE, isCurrent: true },
                },
            },
        });

        if (!product) {
            throw new Error('Product not found');
        }

        if (product.versions.length === 0) {
            throw new Error('Product has no active version');
        }

        const activeVersion = product.versions[0]!;

        // Create BOM with initial version
        const bom = await db.bOM.create({
            data: {
                productId,
                versions: {
                    create: {
                        version: 1,
                        productVersionId: activeVersion.id,
                        status: ItemStatus.ACTIVE,
                        isCurrent: true,
                    },
                },
            },
            include: {
                product: true,
                versions: {
                    include: {
                        productVersion: true,
                    },
                },
            },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'BOM',
                entityId: bom.id,
                userId,
                action: 'CREATED',
                oldValue: null,
                newValue: `BOM created for product "${product.name}" with version 1`,
            },
        });

        return bom;
    }

    /**
     * Get all BOMs with their active versions
     */
    async getBOMs(userRole: string, includeArchived: boolean = false) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const boms = await db.bOM.findMany({
            include: {
                product: true,
                versions: {
                    where: isOperationsUser
                        ? { status: ItemStatus.ACTIVE }
                        : includeArchived
                            ? {}
                            : { status: ItemStatus.ACTIVE },
                    orderBy: { version: 'desc' },
                    include: {
                        productVersion: true,
                        components: true,
                        operations: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return boms;
    }

    /**
     * Get BOM by ID with version history
     */
    async getBOMById(bomId: string, userRole: string, includeVersions: boolean = true) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const bom = await db.bOM.findUnique({
            where: { id: bomId },
            include: {
                product: true,
                versions: includeVersions
                    ? {
                        where: isOperationsUser ? { status: ItemStatus.ACTIVE } : {},
                        orderBy: { version: 'desc' },
                        include: {
                            productVersion: true,
                            components: {
                                include: {
                                    componentVersion: {
                                        include: {
                                            product: true,
                                        },
                                    },
                                },
                            },
                            operations: true,
                        },
                    }
                    : false,
            },
        });

        if (!bom) {
            throw new Error('BOM not found');
        }

        return bom;
    }

    /**
     * Get all versions of a BOM
     */
    async getBOMVersions(bomId: string) {
        const versions = await db.bOMVersion.findMany({
            where: { bomId },
            orderBy: { version: 'desc' },
            include: {
                productVersion: true,
                components: {
                    include: {
                        componentVersion: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                operations: true,
            },
        });

        return versions;
    }

    /**
     * Get active version of a BOM
     */
    async getActiveBOMVersion(bomId: string) {
        const version = await db.bOMVersion.findFirst({
            where: {
                bomId,
                status: ItemStatus.ACTIVE,
                isCurrent: true,
            },
            include: {
                productVersion: true,
                components: {
                    include: {
                        componentVersion: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                operations: true,
            },
        });

        if (!version) {
            throw new Error('No active version found for this BOM');
        }

        return version;
    }

    /**
     * Get components for a BOM version
     */
    async getBOMComponents(bomVersionId: string) {
        const components = await db.bOMComponent.findMany({
            where: { bomVersionId },
            include: {
                componentVersion: {
                    include: {
                        product: true,
                    },
                },
            },
        });

        return components;
    }

    /**
     * Get operations for a BOM version
     */
    async getBOMOperations(bomVersionId: string) {
        const operations = await db.bOMOperation.findMany({
            where: { bomVersionId },
        });

        return operations;
    }
}

export const bomService = new BOMService();
