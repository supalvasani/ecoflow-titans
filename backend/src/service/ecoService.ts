import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import { validateECOEdit, validateApproval, validateApply, validateActiveVersion, validateComponentIsActive, canViewECOs } from '../libs/ecoValidation.js';
import { cloneProductVersion, cloneBOMVersion, updateCurrentProductVersion, updateCurrentBOMVersion } from '../libs/versionCloner.js';
import { stageService } from './stageService.js';

export class ECOService {
    async createECO(data: {
        title: string;
        type: 'PRODUCT' | 'BOM' | 'BOM_CHANGE';
        createdById: string;
        assigneeId?: string;
        effectiveDate?: Date;
        versionUpdate?: boolean;
        productId?: string;
        bomId?: string;
        initialChanges?: any;
    }) {
        const { title, type, createdById, assigneeId, effectiveDate, versionUpdate, productId, bomId, initialChanges } = data;

        if (!title) throw new Error('Title is required');

        const newStage = await stageService.getInitialStage();
        const changes = initialChanges || {};
        const ecoId = crypto.randomUUID();
        const auditId = crypto.randomUUID();

        // Normalize BOM_CHANGE to BOM
        const normalizedType = type === 'BOM_CHANGE' ? 'BOM' : type;

        let ecoData: any = {
            id: ecoId,
            title,
            type: normalizedType,
            createdById,
            assigneeId: assigneeId || null,
            stageId: newStage.id,
            effectiveDate: effectiveDate || null,
            versionUpdate: versionUpdate !== undefined ? versionUpdate : true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (normalizedType === 'PRODUCT') {
            if (!productId) throw new Error('Product ID is required for Product ECO');

            const activeVersion = await db.query.productVersions.findFirst({
                where: and(
                    eq(schema.productVersions.productId, productId),
                    eq(schema.productVersions.status, 'ACTIVE'),
                    eq(schema.productVersions.isCurrent, true)
                ),
            });

            if (!activeVersion) throw new Error('Product not found or has no active version');
            await validateActiveVersion(activeVersion.id, 'product');

            ecoData.productVersionId = activeVersion.id;
            ecoData.draftProductId = productId;
            ecoData.draftName = changes.name ?? null;
            ecoData.draftSalePrice = changes.salePrice ? changes.salePrice.toString() : null;
            ecoData.draftCostPrice = changes.costPrice ? changes.costPrice.toString() : null;
        } else if (normalizedType === 'BOM' || normalizedType === 'BOM_CHANGE') {
            if (!bomId) throw new Error('BOM ID is required for BOM ECO');

            const activeVersion = await db.query.bomVersions.findFirst({
                where: and(
                    eq(schema.bomVersions.bomId, bomId),
                    eq(schema.bomVersions.status, 'ACTIVE'),
                    eq(schema.bomVersions.isCurrent, true)
                ),
            });

            if (!activeVersion) throw new Error('BOM not found or has no active version');
            await validateActiveVersion(activeVersion.id, 'bom');

            const productVersion = await db.query.productVersions.findFirst({
                where: eq(schema.productVersions.id, activeVersion.productVersionId),
            });
            if (!productVersion || productVersion.status !== 'ACTIVE') {
                throw new Error('Cannot modify BOM. Linked product version is archived.');
            }

            ecoData.bomVersionId = activeVersion.id;
            ecoData.draftBomId = bomId;
            ecoData.draftNotes = changes.notes ?? null;
            ecoData.draftComponents = changes.components || [];
            ecoData.draftOperations = changes.operations || [];
        }

        return await db.transaction(async (tx) => {
            await tx.insert(schema.ecos).values(ecoData);

            await tx.insert(schema.auditLogs).values({
                id: auditId,
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId: createdById,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: JSON.stringify({
                    title,
                    type,
                    stage: newStage.name,
                    assigneeId,
                    effectiveDate,
                    versionUpdate,
                }),
            });

            const eco = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            return this.hydrateECO(eco);
        });
    }

    /**
     * Legacy wrappers
     */
    async createProductECO(productId: string, title: string, userId: string, initialChanges?: any) {
        return this.createECO({
            title,
            type: 'PRODUCT',
            createdById: userId,
            productId,
            initialChanges,
        });
    }

    async createBOMECO(bomId: string, title: string, userId: string, initialChanges?: any) {
        return this.createECO({
            title,
            type: 'BOM',
            createdById: userId,
            bomId,
            initialChanges,
        });
    }

    /**
     * Update ECO Draft (Unified)
     */
    async updateDraft(ecoId: string, changes: any, userId: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');
        await validateECOEdit(eco.stageId);

        const type = eco.type === 'BOM_CHANGE' ? 'BOM' : eco.type;

        return await db.transaction(async (tx) => {
            if (type === 'PRODUCT') {
                await tx.update(schema.ecos)
                    .set({
                        draftName: changes.name !== undefined ? changes.name : eco.draftName,
                        draftSalePrice: changes.salePrice !== undefined ? (changes.salePrice !== null ? changes.salePrice.toString() : null) : eco.draftSalePrice,
                        draftCostPrice: changes.costPrice !== undefined ? (changes.costPrice !== null ? changes.costPrice.toString() : null) : eco.draftCostPrice,
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.ecos.id, ecoId));

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'ECOProductDraft',
                    entityId: ecoId,
                    ecoId: eco.id,
                    userId,
                    action: 'DRAFT_UPDATED',
                    oldValue: JSON.stringify({ name: eco.draftName, price: eco.draftSalePrice }),
                    newValue: JSON.stringify(changes),
                });
            } else if (type === 'BOM') {
                const components = changes.components !== undefined ? changes.components : (eco.draftComponents || []);
                const operations = changes.operations !== undefined ? changes.operations : (eco.draftOperations || []);
                const notes = changes.notes !== undefined ? changes.notes : eco.draftNotes;

                for (const comp of components) {
                    if (comp.action === 'ADD' || comp.action === 'UPDATE') {
                        await validateComponentIsActive(comp.componentVersionId);
                    }
                }

                await tx.update(schema.ecos)
                    .set({
                        draftComponents: components,
                        draftOperations: operations,
                        draftNotes: notes,
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.ecos.id, ecoId));

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'ECOBOMDraft',
                    entityId: ecoId,
                    ecoId: eco.id,
                    userId,
                    action: 'DRAFT_UPDATED',
                    oldValue: null,
                    newValue: JSON.stringify({ components: components.length, operations: operations.length }),
                });
            }

            const updated = await tx.query.ecos.findFirst({ where: eq(schema.ecos.id, ecoId) });
            return this.hydrateECO(updated);
        });
    }

    /**
     * Add draft attachment
     */
    async addDraftAttachment(ecoId: string, filename: string, url: string, action: string, userId: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');
        await validateECOEdit(eco.stageId);

        const currentAttachments = (eco.draftAttachments as any[]) || [];
        const newAttachment = {
            id: crypto.randomUUID(),
            ecoId,
            filename,
            url,
            action,
        };
        currentAttachments.push(newAttachment);

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({
                    draftAttachments: currentAttachments,
                    updatedAt: new Date(),
                })
                .where(eq(schema.ecos.id, ecoId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'ECODraftAttachment',
                entityId: newAttachment.id,
                ecoId,
                userId,
                action: 'DRAFT_ATTACHMENT_ADDED',
                oldValue: null,
                newValue: JSON.stringify({ filename, action }),
            });

            return newAttachment;
        });
    }

    /**
     * Submit ECO for review
     */
    async submitForReview(ecoId: string, userId: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        const nextStage = await stageService.getNextStage(eco.stageId);
        if (!nextStage) {
            throw new Error('No next stage found.');
        }

        const isValid = await stageService.validateTransition(eco.stageId, nextStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${nextStage.name}`);
        }

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({ stageId: nextStage.id, updatedAt: new Date() })
                .where(eq(schema.ecos.id, ecoId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId,
                action: 'STAGE_TRANSITION',
                oldValue: eco.stage.name,
                newValue: nextStage.name,
            });

            const updatedECO = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            return this.hydrateECO(updatedECO);
        });
    }

    /**
     * Advance ECO stage (Handles non-approval stages or general progression)
     */
    async advanceStage(ecoId: string, userId: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        if (eco.mandatoryApproval || eco.stage.requiresApproval) {
            throw new Error('Current stage requires formal approval. Please use the approve endpoint.');
        }

        const nextStage = await stageService.getNextStage(eco.stageId);
        if (!nextStage) {
            throw new Error('No next stage found.');
        }

        const isValid = await stageService.validateTransition(eco.stageId, nextStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${nextStage.name}`);
        }

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({ stageId: nextStage.id, updatedAt: new Date() })
                .where(eq(schema.ecos.id, ecoId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId,
                action: 'STAGE_ADVANCED',
                oldValue: eco.stage.name,
                newValue: nextStage.name,
            });

            const updatedECO = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            return this.hydrateECO(updatedECO);
        });
    }

    /**
     * Approve ECO
     */
    async approveECO(ecoId: string, approverId: string, userRole: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        await validateApproval(eco.stageId, userRole);

        const nextStage = await stageService.getNextStage(eco.stageId);
        if (!nextStage) {
            throw new Error('No next stage found');
        }

        const isValid = await stageService.validateTransition(eco.stageId, nextStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${nextStage.name}`);
        }

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({ stageId: nextStage.id, updatedAt: new Date() })
                .where(eq(schema.ecos.id, ecoId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId: approverId,
                action: 'ECO_APPROVED',
                oldValue: eco.stage.name,
                newValue: nextStage.name,
            });

            // If next stage is final, apply the ECO changes within the SAME transaction
            // (avoids a nested db.transaction() call which can cause data inconsistency)
            if (nextStage.isFinal) {
                await validateApply(eco.stageId);
                const hydratedEco = await this.hydrateECO(eco);
                return await this._performApplyInTx(tx, eco, hydratedEco, nextStage, approverId);
            }

            const updatedECO = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            return this.hydrateECO(updatedECO);
        });
    }

    /**
     * Reject ECO
     */
    async rejectECO(ecoId: string, approverId: string, reason: string, userRole: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        if (!['APPROVER', 'ADMIN'].includes(userRole)) {
            throw new Error('Only approvers can reject ECOs');
        }

        const targetStage = await stageService.getRejectionTargetStage();
        const isValid = await stageService.validateTransition(eco.stageId, targetStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${targetStage.name}`);
        }

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({ stageId: targetStage.id, updatedAt: new Date() })
                .where(eq(schema.ecos.id, ecoId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId: approverId,
                action: 'ECO_REJECTED',
                oldValue: eco.stage.name,
                newValue: `${targetStage.name} (Reason: ${reason})`,
            });

            const updatedECO = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            return this.hydrateECO(updatedECO);
        });
    }

    /**
     * Apply ECO — public entry point.
     * Opens its own transaction and delegates to _performApplyInTx.
     */
    async applyECO(ecoId: string, userId: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        await validateApply(eco.stageId);

        if (eco.effectiveDate && new Date(eco.effectiveDate) > new Date()) {
            throw new Error(`Cannot apply ECO before effective date: ${eco.effectiveDate.toISOString().split('T')[0]}`);
        }

        const nextStage = await stageService.getNextStage(eco.stageId);
        const appliedStage = nextStage || eco.stage;
        const hydratedEco = await this.hydrateECO(eco);

        return await db.transaction(async (tx) => {
            return this._performApplyInTx(tx, eco, hydratedEco, appliedStage, userId);
        });
    }

    /**
     * _performApplyInTx — private method that executes the apply logic
     * inside a caller-provided transaction handle.
     * This allows approveECO to reuse this logic without opening a nested transaction.
     */
    private async _performApplyInTx(
        tx: any,
        eco: any,
        hydratedEco: any,
        appliedStage: any,
        userId: string
    ) {
        let newVersion: any;

        if (eco.type === 'PRODUCT' && eco.productVersionId) {
            const activeVersion = await tx.query.productVersions.findFirst({
                where: eq(schema.productVersions.id, eco.productVersionId),
            });

            if (!activeVersion) throw new Error('Active product version not found');

            if (eco.versionUpdate) {
                newVersion = await cloneProductVersion(
                    tx,
                    activeVersion,
                    hydratedEco.productDraft,
                    hydratedEco.draftAttachments
                );

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'ProductVersion',
                    entityId: newVersion.id,
                    ecoId: eco.id,
                    userId,
                    action: 'VERSION_CREATED',
                    oldValue: JSON.stringify({ version: activeVersion.version }),
                    newValue: JSON.stringify({ version: newVersion.version, changes: hydratedEco.productDraft }),
                });

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'ProductVersion',
                    entityId: activeVersion.id,
                    ecoId: eco.id,
                    userId,
                    action: 'VERSION_ARCHIVED',
                    oldValue: 'ACTIVE',
                    newValue: 'ARCHIVED',
                });
            } else {
                newVersion = await updateCurrentProductVersion(
                    tx,
                    activeVersion,
                    hydratedEco.productDraft,
                    hydratedEco.draftAttachments
                );

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'ProductVersion',
                    entityId: activeVersion.id,
                    ecoId: eco.id,
                    userId,
                    action: 'VERSION_UPDATED',
                    oldValue: 'Previous State',
                    newValue: JSON.stringify({ version: activeVersion.version, changes: hydratedEco.productDraft }),
                });
            }

            if (hydratedEco.productDraft?.name) {
                await tx.update(schema.products)
                    .set({ name: hydratedEco.productDraft.name })
                    .where(eq(schema.products.id, eco.draftProductId!));
            }
        } else if ((eco.type === 'BOM' || eco.type === 'BOM_CHANGE') && eco.bomVersionId) {
            const activeVersion = await tx.query.bomVersions.findFirst({
                where: eq(schema.bomVersions.id, eco.bomVersionId),
            });

            if (!activeVersion) throw new Error('Active BOM version not found');

            if (eco.versionUpdate) {
                newVersion = await cloneBOMVersion(
                    tx,
                    activeVersion,
                    hydratedEco.bomDraft,
                    hydratedEco.bomDraft?.draftComponents || [],
                    hydratedEco.bomDraft?.draftOperations || []
                );

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'BOMVersion',
                    entityId: newVersion.id,
                    ecoId: eco.id,
                    userId,
                    action: 'VERSION_CREATED',
                    oldValue: JSON.stringify({ version: activeVersion.version }),
                    newValue: JSON.stringify({ version: newVersion.version }),
                });

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'BOMVersion',
                    entityId: activeVersion.id,
                    ecoId: eco.id,
                    userId,
                    action: 'VERSION_ARCHIVED',
                    oldValue: 'ACTIVE',
                    newValue: 'ARCHIVED',
                });
            } else {
                newVersion = await updateCurrentBOMVersion(
                    tx,
                    activeVersion,
                    hydratedEco.bomDraft,
                    hydratedEco.bomDraft?.draftComponents || [],
                    hydratedEco.bomDraft?.draftOperations || []
                );

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'BOMVersion',
                    entityId: activeVersion.id,
                    ecoId: eco.id,
                    userId,
                    action: 'VERSION_UPDATED',
                    oldValue: 'Previous State',
                    newValue: JSON.stringify({ version: activeVersion.version }),
                });
            }
        }

        // Update ECO stage to applied/final
        await tx.update(schema.ecos)
            .set({ stageId: appliedStage.id, updatedAt: new Date() })
            .where(eq(schema.ecos.id, eco.id));

        // Log ECO applied
        await tx.insert(schema.auditLogs).values({
            id: crypto.randomUUID(),
            entity: 'ECO',
            entityId: eco.id,
            ecoId: eco.id,
            userId,
            action: 'ECO_APPLIED',
            oldValue: eco.stage.name,
            newValue: appliedStage.name,
        });

        // Create Operations task
        await tx.insert(schema.operationsTasks).values({
            id: crypto.randomUUID(),
            ecoId: eco.id,
            title: `Implement changes for ECO: ${eco.title}`,
            description: `ECO ${eco.title} has been applied. Please implement the physical changes.`,
            status: 'PENDING',
        });

        const finalECO = await tx.query.ecos.findFirst({
            where: eq(schema.ecos.id, eco.id),
            with: { stage: true },
        });

        const finalHydrated = await this.hydrateECO(finalECO);
        return { eco: finalHydrated, newVersion };
    }

    /**
     * Set mandatory approval flag (Admin only)
     */
    async setMandatoryApproval(ecoId: string, mandatoryApproval: boolean, userId: string, userRole: string) {
        if (userRole !== 'ADMIN') {
            throw new Error('Only admins can update mandatory approval flag');
        }

        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
        });

        if (!eco) throw new Error('ECO not found');

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({ mandatoryApproval, updatedAt: new Date() })
                .where(eq(schema.ecos.id, ecoId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId,
                action: 'MANDATORY_APPROVAL_TOGGLED',
                oldValue: eco.mandatoryApproval ? 'true' : 'false',
                newValue: mandatoryApproval ? 'true' : 'false',
            });

            const updatedECO = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            return this.hydrateECO(updatedECO);
        });
    }

    /**
     * Get ECOs — eagerly loads product/bom relations to avoid N+1 queries in hydrateECO
     */
    async getECOs(userRole: string, filters?: { type?: any; stageId?: string }) {
        if (!canViewECOs(userRole)) {
            return [];
        }

        const ecosystem = await db.query.ecos.findMany({
            where: (e, { and: andFn, eq: eqFn }) => {
                const conds = [];
                if (filters?.type) conds.push(eqFn(e.type, filters.type));
                if (filters?.stageId) conds.push(eqFn(e.stageId, filters.stageId));
                return conds.length ? andFn(...conds) : undefined;
            },
            with: {
                stage: true,
                createdBy: true,
                assignedTo: true,
                // Pre-load product/version relations to eliminate N+1 in hydrateECO
                draftProduct: true,
                productVersion: {
                    with: { attachments: true },
                },
                draftBom: true,
                bomVersion: true,
            },
            orderBy: [desc(schema.ecos.createdAt)],
        });

        return Promise.all(ecosystem.map(e => this.hydrateECO(e)));
    }

    /**
     * Get ECO by ID
     */
    async getECOById(ecoId: string, userRole: string) {
        if (!canViewECOs(userRole)) {
            const error: any = new Error('Access denied. Operations users cannot view ECOs.');
            error.statusCode = 403;
            throw error;
        }

        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: {
                stage: true,
                createdBy: true,
                auditLogs: {
                    with: { user: true },
                    orderBy: [desc(schema.auditLogs.timestamp)],
                },
            },
        });

        if (!eco) {
            throw new Error('ECO not found');
        }

        return this.hydrateECO(eco);
    }

    /**
     * Get ECO statistics
     */
    async getECOStatistics(userRole: string) {
        if (!canViewECOs(userRole)) {
            return [];
        }

        const allEcos = await db.query.ecos.findMany({
            with: { stage: true },
        });

        const stageCounts = new Map<string, number>();
        for (const e of allEcos) {
            const name = e.stage?.name || 'Unknown';
            stageCounts.set(name, (stageCounts.get(name) || 0) + 1);
        }

        return Array.from(stageCounts.entries()).map(([stageName, count]) => ({
            stageName,
            count,
        }));
    }

    /**
     * Hydrate virtual draft structures for frontend output compatibility.
     * Uses pre-loaded relations (from getECOs eager loading) when available
     * to avoid extra DB queries (N+1 fix).
     */
    private async hydrateECO(eco: any) {
        if (!eco) return null;

        const type = eco.type === 'BOM_CHANGE' ? 'BOM' : eco.type;

        let productDraft = null;
        if (type === 'PRODUCT') {
            const productId = eco.draftProductId;

            // Use pre-loaded relation if available (key present in object), else query
            let product: any = ('draftProduct' in eco) ? eco.draftProduct : null;
            let activeVersion: any = ('productVersion' in eco) ? eco.productVersion : null;

            if (product === null && productId) {
                product = await db.query.products.findFirst({
                    where: eq(schema.products.id, productId),
                });
            }

            if (activeVersion === null) {
                if (eco.productVersionId) {
                    activeVersion = await db.query.productVersions.findFirst({
                        where: eq(schema.productVersions.id, eco.productVersionId),
                    });
                } else if (productId) {
                    activeVersion = await db.query.productVersions.findFirst({
                        where: and(
                            eq(schema.productVersions.productId, productId),
                            eq(schema.productVersions.status, 'ACTIVE')
                        ),
                    });
                }
            }

            const currentName = product?.name || '';
            const currentSalePrice = activeVersion?.salePrice ? parseFloat(activeVersion.salePrice) : 0;
            const currentCostPrice = activeVersion?.costPrice ? parseFloat(activeVersion.costPrice) : 0;

            const name = eco.draftName ?? currentName;
            const salePrice = eco.draftSalePrice !== null && eco.draftSalePrice !== undefined ? parseFloat(eco.draftSalePrice) : currentSalePrice;
            const costPrice = eco.draftCostPrice !== null && eco.draftCostPrice !== undefined ? parseFloat(eco.draftCostPrice) : currentCostPrice;

            productDraft = {
                productId: productId || activeVersion?.productId,
                name,
                salePrice,
                costPrice,
                product: (product || activeVersion) ? {
                    id: product?.id || activeVersion?.productId,
                    name: currentName,
                    versions: activeVersion ? [{
                        id: activeVersion.id,
                        version: activeVersion.version,
                        salePrice: activeVersion.salePrice,
                        costPrice: activeVersion.costPrice,
                        status: activeVersion.status,
                        isCurrent: activeVersion.isCurrent,
                    }] : [],
                } : null,
            };
        }

        const bomDraft = (type === 'BOM' || type === 'BOM_CHANGE')
            ? {
                bomId: eco.draftBomId,
                notes: eco.draftNotes,
                draftComponents: (eco.draftComponents as any[]) || [],
                draftOperations: (eco.draftOperations as any[]) || [],
            }
            : null;

        return {
            ...eco,
            type, // Override with normalized type
            productDraft,
            bomDraft,
            draftAttachments: (eco.draftAttachments as any[]) || [],
        };
    }
}

export const ecoService = new ECOService();
