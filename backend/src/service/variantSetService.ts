import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';

export class VariantSetService {
    /**
     * Create a new VariantSet for a CatalogItem with initial version (v1).
     */
    async createVariantSet(catalogItemId: string, userId: string) {
        if (!catalogItemId) throw new Error('CatalogItem ID is required');

        const activeCatalogItemVersion = await db.query.catalogItemVersions.findFirst({
            where: and(
                eq(schema.catalogItemVersions.catalogItemId, catalogItemId),
                eq(schema.catalogItemVersions.status, 'ACTIVE'),
                eq(schema.catalogItemVersions.isCurrent, true)
            ),
        });

        if (!activeCatalogItemVersion) {
            throw new Error('CatalogItem not found or has no active version');
        }

        const variantSetId = crypto.randomUUID();
        const variantSetVersionId = crypto.randomUUID();
        const auditId = crypto.randomUUID();

        return await db.transaction(async (tx) => {
            await tx.insert(schema.variantSets).values({ id: variantSetId, catalogItemId });

            await tx.insert(schema.variantSetVersions).values({
                id: variantSetVersionId,
                variantSetId,
                catalogItemVersionId: activeCatalogItemVersion.id,
                version: 1,
                status: 'ACTIVE',
                isCurrent: true,
            });

            await tx.insert(schema.auditLogs).values({
                id: auditId,
                entity: 'VariantSet',
                entityId: variantSetId,
                userId,
                action: 'CREATED',
                oldValue: null,
                newValue: `VariantSet created for CatalogItem ${catalogItemId} with version 1`,
            });

            return tx.query.variantSets.findFirst({
                where: eq(schema.variantSets.id, variantSetId),
                with: {
                    versions: {
                        with: { variants: true, channelPublishRules: true },
                    },
                },
            });
        });
    }

    /**
     * Get all VariantSets. STOREFRONT_VIEWER sees ACTIVE+live-channel versions only.
     */
    async getVariantSets(userRole: string, includeArchived: boolean | { channel?: string; region?: string; includeArchived?: boolean } = false, channel?: string, region?: string) {
        const isStorefront = userRole === 'STOREFRONT_VIEWER';
        let withArchived = false;
        let chan = channel;
        let reg = region;

        if (typeof includeArchived === 'object' && includeArchived !== null) {
            withArchived = includeArchived.includeArchived ?? false;
            chan = includeArchived.channel ?? chan;
            reg = includeArchived.region ?? reg;
        } else {
            withArchived = Boolean(includeArchived);
        }

        const sets = await db.query.variantSets.findMany({
            with: {
                catalogItem: true,
                versions: {
                    where: isStorefront || !withArchived
                        ? and(eq(schema.variantSetVersions.status, 'ACTIVE'), eq(schema.variantSetVersions.isCurrent, true))
                        : undefined,
                    orderBy: [desc(schema.variantSetVersions.version)],
                    with: {
                        variants: {
                            with: {
                                variantVersion: {
                                    with: { catalogItem: true },
                                },
                            },
                        },
                        channelPublishRules: true,
                    },
                },
            },
            orderBy: [desc(schema.variantSets.createdAt)],
        });

        const resolved = await Promise.all(sets.map(s => this.resolveVariantVersions(s, isStorefront)));

        // STOREFRONT_VIEWER: additionally filter by channel+region+isLive
        if (isStorefront && chan && reg) {
            return resolved
                .filter(s => s.versions && s.versions.length > 0)
                .map(s => ({
                    ...s,
                    versions: (s.versions || []).map((v: any) => ({
                        ...v,
                        channelPublishRules: (v.channelPublishRules || []).filter(
                            (r: any) => r.channel === chan && r.region === reg && r.isLive === true
                        ),
                    })).filter((v: any) => v.channelPublishRules.length > 0),
                }))
                .filter(s => s.versions.length > 0);
        }

        if (isStorefront) return resolved.filter(s => s.versions && s.versions.length > 0);
        return resolved;
    }

    /**
     * Get a VariantSet by ID with full deep hierarchy.
     */
    async getVariantSetById(variantSetId: string, userRole: string, includeVersions: boolean = true) {
        const isStorefront = userRole === 'STOREFRONT_VIEWER';

        const set = await db.query.variantSets.findFirst({
            where: eq(schema.variantSets.id, variantSetId),
            with: {
                catalogItem: true,
                ...(includeVersions ? {
                    versions: {
                        where: isStorefront
                            ? and(eq(schema.variantSetVersions.status, 'ACTIVE'), eq(schema.variantSetVersions.isCurrent, true))
                            : undefined,
                        orderBy: [desc(schema.variantSetVersions.version)],
                        with: {
                            variants: {
                                with: {
                                    variantVersion: { with: { catalogItem: true } },
                                },
                            },
                            channelPublishRules: true,
                        },
                    },
                } : {}),
            },
        });

        if (!set) throw new Error('VariantSet not found');

        const versions = (set as any).versions;
        if (isStorefront && (!versions || versions.length === 0)) {
            throw new Error('VariantSet not found or no active version available');
        }

        return this.resolveVariantVersions(set, isStorefront);
    }

    /**
     * Get a VariantSet by CatalogItem ID
     */
    async getVariantSetByCatalogItemId(catalogItemId: string, userRole: string) {
        const isStorefront = userRole === 'STOREFRONT_VIEWER';

        const set = await db.query.variantSets.findFirst({
            where: eq(schema.variantSets.catalogItemId, catalogItemId),
            with: {
                catalogItem: true,
                versions: {
                    where: isStorefront
                        ? and(eq(schema.variantSetVersions.status, 'ACTIVE'), eq(schema.variantSetVersions.isCurrent, true))
                        : undefined,
                    orderBy: [desc(schema.variantSetVersions.version)],
                    with: {
                        variants: {
                            with: {
                                variantVersion: { with: { catalogItem: true } },
                            },
                        },
                        channelPublishRules: true,
                    },
                },
            },
        });

        if (!set) throw new Error('No VariantSet found for this CatalogItem');
        return this.resolveVariantVersions(set, isStorefront);
    }

    /**
     * Get active VariantSetVersion with fully resolved variants and channel rules.
     * STOREFRONT_VIEWER: channel+region+isLive filters applied.
     */
    async getActiveVariantSetVersion(variantSetId: string, channel?: string, region?: string) {
        const version = await db.query.variantSetVersions.findFirst({
            where: and(
                eq(schema.variantSetVersions.variantSetId, variantSetId),
                eq(schema.variantSetVersions.status, 'ACTIVE'),
                eq(schema.variantSetVersions.isCurrent, true)
            ),
            with: {
                variants: {
                    with: {
                        variantVersion: { with: { catalogItem: true } },
                    },
                },
                channelPublishRules: true,
            },
        });

        if (!version) throw new Error('No active version found for this VariantSet');

        let channelRules = (version as any).channelPublishRules || [];

        // If channel+region provided (storefront query), filter to live rules only
        if (channel && region) {
            channelRules = channelRules.filter(
                (r: any) => r.channel === channel && r.region === region && r.isLive === true
            );
        }

        return { ...this.resolveVariantSetVersionComponents(version), channelPublishRules: channelRules };
    }

    /**
     * Get a specific VariantSetVersion by ID.
     */
    async getVariantSetVersionById(versionId: string, userRole?: string) {
        if (userRole === 'STOREFRONT_VIEWER') {
            const ver = await db.query.variantSetVersions.findFirst({
                where: and(
                    eq(schema.variantSetVersions.id, versionId),
                    eq(schema.variantSetVersions.status, 'ACTIVE'),
                    eq(schema.variantSetVersions.isCurrent, true)
                ),
                with: {
                    variants: { with: { variantVersion: { with: { catalogItem: true } } } },
                    channelPublishRules: true,
                },
            });

            if (!ver) {
                const error: any = new Error('Forbidden: Storefront viewers cannot view non-active or archived versions');
                error.statusCode = 403;
                throw error;
            }
            return this.resolveVariantSetVersionComponents(ver);
        }

        const version = await db.query.variantSetVersions.findFirst({
            where: eq(schema.variantSetVersions.id, versionId),
            with: {
                variants: { with: { variantVersion: { with: { catalogItem: true } } } },
                channelPublishRules: true,
            },
        });

        if (!version) throw new Error('VariantSet version not found');
        return this.resolveVariantSetVersionComponents(version);
    }

    /**
     * Get all versions for a VariantSet (Forbidden for STOREFRONT_VIEWER).
     */
    async getVariantSetVersions(variantSetId: string, userRole?: string) {
        if (userRole === 'STOREFRONT_VIEWER') {
            const error: any = new Error('Forbidden: Storefront viewers cannot view version history');
            error.statusCode = 403;
            throw error;
        }

        return db.query.variantSetVersions.findMany({
            where: eq(schema.variantSetVersions.variantSetId, variantSetId),
            orderBy: [desc(schema.variantSetVersions.version)],
            with: { variants: true, channelPublishRules: true },
        });
    }

    /**
     * Toggle isLive on a single ChannelPublishRule (staggered multi-channel publish).
     * New feature: independent per-channel/region live control.
     * Validates locale content approval gate before allowing isLive=true.
     */
    async toggleChannelPublishRule(ruleId: string, isLive: boolean, userId: string) {
        const rule = await db.query.channelPublishRules.findFirst({
            where: eq(schema.channelPublishRules.id, ruleId),
            with: {
                variantSetVersion: {
                    with: {
                        catalogItemVersion: {
                            with: { content: true },
                        },
                    },
                },
            },
        });

        if (!rule) throw new Error('ChannelPublishRule not found');

        // Locale content approval gate: block isLive=true if any content for this
        // region's locale is not approved. Region→locale mapping: EU→fr-FR, APAC→ja-JP, US→en-US.
        if (isLive) {
            const regionLocaleMap: Record<string, string> = { US: 'en-US', EU: 'fr-FR', APAC: 'ja-JP' };
            const locale = regionLocaleMap[rule.region];
            if (locale) {
                const content = ((rule as any).variantSetVersion?.catalogItemVersion?.content || []) as any[];
                const unapproved = content.filter((c: any) => c.locale === locale && c.approved === false);
                if (unapproved.length > 0) {
                    throw new Error(
                        `Cannot set isLive=true for region "${rule.region}": locale "${locale}" has ${unapproved.length} unapproved content item(s). Approve all content before going live.`
                    );
                }
            }
        }

        await db.update(schema.channelPublishRules)
            .set({ isLive })
            .where(eq(schema.channelPublishRules.id, ruleId));

        await db.insert(schema.auditLogs).values({
            id: crypto.randomUUID(),
            entity: 'ChannelPublishRule',
            entityId: ruleId,
            userId,
            action: isLive ? 'CHANNEL_SET_LIVE' : 'CHANNEL_SET_OFFLINE',
            oldValue: String(!isLive),
            newValue: String(isLive),
        });

        return db.query.channelPublishRules.findFirst({ where: eq(schema.channelPublishRules.id, ruleId) });
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private async resolveVariantVersions(set: any, _isStorefront: boolean) {
        if (!set || !set.versions) return set;
        set.versions = await Promise.all(
            set.versions.map((v: any) => this.resolveVariantSetVersionComponents(v))
        );
        return set;
    }

    private resolveVariantSetVersionComponents(version: any) {
        return version;
    }
}

export const variantSetService = new VariantSetService();
