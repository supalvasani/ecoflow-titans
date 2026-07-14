import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export class BOMService {
    /**
     * Create a new BOM for a product with initial version (v1)
     */
    async createBOM(productId: string, userId: string) {
        if (!productId) {
            throw new Error('Product ID is required');
        }

        // Check if product exists and get active version
        const activeProductVersion = await db.query.productVersions.findFirst({
            where: and(
                eq(schema.productVersions.productId, productId),
                eq(schema.productVersions.status, 'ACTIVE'),
                eq(schema.productVersions.isCurrent, true)
            ),
        });

        if (!activeProductVersion) {
            throw new Error('Product not found or has no active version');
        }

        const bomId = crypto.randomUUID();
        const bomVersionId = crypto.randomUUID();
        const auditId = crypto.randomUUID();

        return await db.transaction(async (tx) => {
            await tx.insert(schema.boms).values({
                id: bomId,
                productId,
            });

            await tx.insert(schema.bomVersions).values({
                id: bomVersionId,
                bomId,
                productVersionId: activeProductVersion.id,
                version: 1,
                status: 'ACTIVE',
                isCurrent: true,
            });

            await tx.insert(schema.auditLogs).values({
                id: auditId,
                entity: 'BOM',
                entityId: bomId,
                userId,
                action: 'CREATED',
                oldValue: null,
                newValue: `BOM created for product ${productId} with version 1`,
            });

            const bom = await tx.query.boms.findFirst({
                where: eq(schema.boms.id, bomId),
                with: {
                    versions: {
                        with: {
                            components: true,
                            operations: true,
                        },
                    },
                },
            });

            return bom;
        });
    }

    /**
     * Get all BOMs (Operations user gets ACTIVE versions only)
     */
    async getBOMs(userRole: string, includeArchived: boolean = false) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const boms = await db.query.boms.findMany({
            with: {
                product: true,
                versions: {
                    where: isOperationsUser || !includeArchived
                        ? and(eq(schema.bomVersions.status, 'ACTIVE'), eq(schema.bomVersions.isCurrent, true))
                        : undefined,
                    orderBy: [desc(schema.bomVersions.version)],
                    with: {
                        components: {
                            with: {
                                componentVersion: {
                                    with: {
                                        product: true,
                                    },
                                },
                            },
                        },
                        operations: true,
                    },
                },
            },
            orderBy: [desc(schema.boms.createdAt)],
        });

        // Resolve active component product version pointers dynamically for Operations / display
        const resolved = await Promise.all(boms.map(b => this.resolveBOMComponentVersions(b, isOperationsUser)));

        if (isOperationsUser) {
            return resolved.filter(b => b.versions && b.versions.length > 0);
        }

        return resolved;
    }

    /**
     * Get BOM by ID
     */
    async getBOMById(bomId: string, userRole: string, includeVersions: boolean = true) {
        const isOperationsUser = userRole === 'OPERATIONS_USER';

        const bom = await db.query.boms.findFirst({
            where: eq(schema.boms.id, bomId),
            with: {
                product: true,
                ...(includeVersions
                    ? {
                        versions: {
                            where: isOperationsUser
                                ? and(eq(schema.bomVersions.status, 'ACTIVE'), eq(schema.bomVersions.isCurrent, true))
                                : undefined,
                            orderBy: [desc(schema.bomVersions.version)],
                            with: {
                                components: {
                                    with: {
                                        componentVersion: {
                                            with: {
                                                product: true,
                                            },
                                        },
                                    },
                                },
                                operations: true,
                            },
                        },
                    }
                    : {}),
            },
        });

        if (!bom) {
            throw new Error('BOM not found');
        }

        const versions = (bom as any).versions;
        if (isOperationsUser && (!versions || versions.length === 0)) {
            throw new Error('BOM not found or no active version available');
        }

        return this.resolveBOMComponentVersions(bom, isOperationsUser);
    }

    /**
     * Get active version of a BOM with fully resolved components and operations
     */
    async getActiveBOMVersion(bomId: string) {
        const version = await db.query.bomVersions.findFirst({
            where: and(
                eq(schema.bomVersions.bomId, bomId),
                eq(schema.bomVersions.status, 'ACTIVE'),
                eq(schema.bomVersions.isCurrent, true)
            ),
            with: {
                components: {
                    with: {
                        componentVersion: {
                            with: {
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

        return this.resolveBOMVersionComponents(version);
    }

    /**
     * Get specific version by ID
     */
    async getBOMVersionById(versionId: string, userRole?: string) {
        if (userRole === 'OPERATIONS_USER') {
            // Confirm the requested version is current active
            const ver = await db.query.bomVersions.findFirst({
                where: and(
                    eq(schema.bomVersions.id, versionId),
                    eq(schema.bomVersions.status, 'ACTIVE'),
                    eq(schema.bomVersions.isCurrent, true)
                ),
                with: {
                    components: {
                        with: {
                            componentVersion: {
                                with: {
                                    product: true,
                                },
                            },
                        },
                    },
                    operations: true,
                },
            });

            if (!ver) {
                const error: any = new Error('Forbidden: Operations users cannot view non-active or archived versions');
                error.statusCode = 403;
                throw error;
            }

            return this.resolveBOMVersionComponents(ver);
        }

        const version = await db.query.bomVersions.findFirst({
            where: eq(schema.bomVersions.id, versionId),
            with: {
                components: {
                    with: {
                        componentVersion: {
                            with: {
                                product: true,
                            },
                        },
                    },
                },
                operations: true,
            },
        });

        if (!version) {
            throw new Error('BOM version not found');
        }

        return this.resolveBOMVersionComponents(version);
    }

    /**
     * Get versions list for a BOM
     */
    async getBOMVersions(bomId: string, userRole?: string) {
        if (userRole === 'OPERATIONS_USER') {
            const error: any = new Error('Forbidden: Operations users cannot view version history');
            error.statusCode = 403;
            throw error;
        }

        const versions = await db.query.bomVersions.findMany({
            where: eq(schema.bomVersions.bomId, bomId),
            orderBy: [desc(schema.bomVersions.version)],
            with: {
                components: true,
                operations: true,
            },
        });

        return versions;
    }

    /**
     * Dynamically resolve component product versions so active BOM view always references
     * the current active version of component products if they've been updated
     */
    private async resolveBOMComponentVersions(bom: any, isOperationsUser: boolean) {
        if (!bom || !bom.versions) return bom;
        bom.versions = await Promise.all(
            bom.versions.map((v: any) => this.resolveBOMVersionComponents(v))
        );
        return bom;
    }

    private async resolveBOMVersionComponents(version: any) {
        if (!version || !version.components) return version;

        const resolvedComponents = await Promise.all(
            version.components.map(async (comp: any) => {
                if (comp.componentVersion && comp.componentVersion.status === 'ARCHIVED') {
                    // Find active current version for the same component product
                    const activeCompVersion = await db.query.productVersions.findFirst({
                        where: and(
                            eq(schema.productVersions.productId, comp.componentVersion.productId),
                            eq(schema.productVersions.status, 'ACTIVE'),
                            eq(schema.productVersions.isCurrent, true)
                        ),
                        with: {
                            product: true,
                        },
                    });

                    if (activeCompVersion) {
                        return {
                            ...comp,
                            componentVersionId: activeCompVersion.id,
                            componentVersion: activeCompVersion,
                        };
                    }
                }
                return comp;
            })
        );

        return {
            ...version,
            components: resolvedComponents,
        };
    }
}

export const bomService = new BOMService();
