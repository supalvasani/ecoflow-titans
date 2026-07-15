import { db, schema } from '../db/index.js';
import { eq, and, desc, gte, lte } from 'drizzle-orm';

export const getECOHistory = async (filters?: {
    type?: string;
    stageId?: string;
    startDate?: Date;
    endDate?: Date;
}) => {
    const conditions = [];

    if (filters?.type) conditions.push(eq(schema.ecos.type, filters.type as any));
    if (filters?.stageId) conditions.push(eq(schema.ecos.stageId, filters.stageId));
    if (filters?.startDate) conditions.push(gte(schema.ecos.createdAt, filters.startDate));
    if (filters?.endDate) conditions.push(lte(schema.ecos.createdAt, filters.endDate));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.ecos.findMany({
        where: whereClause,
        with: {
            createdBy: {
                columns: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            stage: true,
            draftProduct: {
                columns: {
                    id: true,
                    name: true,
                },
            },
            draftBom: {
                columns: {
                    id: true,
                },
            },
        },
        orderBy: [desc(schema.ecos.createdAt)],
    });
};

export const getProductVersions = async (productId?: string) => {
    const whereClause = productId ? eq(schema.productVersions.productId, productId) : undefined;

    return db.query.productVersions.findMany({
        where: whereClause,
        with: {
            product: {
                columns: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [desc(schema.productVersions.version)],
    });
};

export const getBOMHistory = async (bomId?: string) => {
    const whereClause = bomId ? eq(schema.bomVersions.bomId, bomId) : undefined;

    return db.query.bomVersions.findMany({
        where: whereClause,
        with: {
            bom: {
                columns: {
                    id: true,
                },
            },
            components: {
                with: {
                    componentVersion: {
                        columns: {
                            id: true,
                            version: true,
                            productId: true,
                        },
                    },
                },
            },
            operations: true,
        },
        orderBy: [desc(schema.bomVersions.version)],
    });
};

export const getActiveMatrix = async () => {
    const products = await db.query.products.findMany({
        with: {
            versions: {
                where: and(
                    eq(schema.productVersions.isCurrent, true),
                    eq(schema.productVersions.status, 'ACTIVE')
                ),
                with: {
                    attachments: true,
                },
            },
        },
    });

    const boms = await db.query.boms.findMany({
        with: {
            versions: {
                where: and(
                    eq(schema.bomVersions.isCurrent, true),
                    eq(schema.bomVersions.status, 'ACTIVE')
                ),
                with: {
                    components: {
                        with: {
                            componentVersion: {
                                columns: {
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

export const getArchivedProducts = async () => {
    return db.query.productVersions.findMany({
        where: eq(schema.productVersions.status, 'ARCHIVED'),
        with: {
            product: {
                columns: {
                    id: true,
                    name: true,
                },
            },
        },
        orderBy: [desc(schema.productVersions.createdAt)],
    });
};

export const reportService = {
    getECOHistory,
    getProductVersions,
    getBOMHistory,
    getArchivedProducts,
    getActiveMatrix,
};
