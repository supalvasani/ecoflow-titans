import { db } from '../libs/prisma.js';

/**
 * Get ECO history with optional filters
 */
export const getECOHistory = async (filters?: {
    type?: string;
    stageId?: string;
    startDate?: Date;
    endDate?: Date;
}) => {
    const where: any = {};

    if (filters?.type) {
        where.type = filters.type;
    }
    if (filters?.stageId) {
        where.stageId = filters.stageId;
    }
    if (filters?.startDate || filters?.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
            where.createdAt.gte = filters.startDate;
        }
        if (filters.endDate) {
            where.createdAt.lte = filters.endDate;
        }
    }

    const ecos = await db.eCO.findMany({
        where,
        include: {
            createdBy: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            stage: true,
            productDraft: {
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
            bomDraft: {
                include: {
                    bom: {
                        select: {
                            id: true,
                        },
                    },
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return ecos;
};

/**
 * Get all product versions across all products
 */
export const getProductVersions = async (productId?: string) => {
    const where: any = {};
    if (productId) {
        where.productId = productId;
    }

    const versions = await db.productVersion.findMany({
        where,
        include: {
            product: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [
            { productId: 'asc' },
            { version: 'desc' },
        ],
    });

    return versions;
};

/**
 * Get BOM change history
 */
export const getBOMHistory = async (bomId?: string) => {
    const where: any = {};
    if (bomId) {
        where.bomId = bomId;
    }

    const versions = await db.bOMVersion.findMany({
        where,
        include: {
            bom: {
                select: {
                    id: true,
                },
            },
            components: {
                include: {
                    componentVersion: {
                        select: {
                            id: true,
                            version: true,
                            productId: true,
                        },
                    },
                },
            },
            operations: true,
        },
        orderBy: [
            { bomId: 'asc' },
            { version: 'desc' },
        ],
    });

    return versions;
};

/**
 * Get active matrix showing current active versions of all products and BOMs
 */
export const getActiveMatrix = async () => {
    // Get all products with their current versions
    const products = await db.product.findMany({
        include: {
            versions: {
                where: {
                    isCurrent: true,
                },
                include: {
                    attachments: true,
                },
            },
        },
    });

    // Get all BOMs with their current versions
    const boms = await db.bOM.findMany({
        include: {
            versions: {
                where: {
                    isCurrent: true,
                },
                include: {
                    components: {
                        include: {
                            componentVersion: {
                                select: {
                                    id: true,
                                    version: true,
                                    productId: true,
                                },
                            },
                        },
                    },
                    operations: true,
                },
            },
        },
    });

    return {
        products,
        boms,
        timestamp: new Date(),
    };
};

export const reportService = {
    getECOHistory,
    getProductVersions,
    getBOMHistory,
    getActiveMatrix,
};
