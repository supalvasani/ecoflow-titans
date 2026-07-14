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

        let ecoData: any = {
            id: ecoId,
            title,
            type,
            createdById,
            assigneeId: assigneeId || null,
            stageId: newStage.id,
            effectiveDate: effectiveDate || null,
            versionUpdate: versionUpdate !== undefined ? versionUpdate : true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        if (type === 'PRODUCT') {
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
        } else if (type === 'BOM' || type === 'BOM_CHANGE') {
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
     * Update product draft
     */
    async updateProductDraft(ecoId: string, changes: { name?: string; salePrice?: number; costPrice?: number }, userId: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');
        if (eco.type !== 'PRODUCT') throw new Error('This ECO is not for a product');

        await validateECOEdit(eco.stageId);

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({
                    draftName: changes.name !== undefined ? changes.name : eco.draftName,
                    draftSalePrice: changes.salePrice !== undefined ? changes.salePrice.toString() : eco.draftSalePrice,
                    draftCostPrice: changes.costPrice !== undefined ? changes.costPrice.toString() : eco.draftCostPrice,
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

            const updated = await tx.query.ecos.findFirst({ where: eq(schema.ecos.id, ecoId) });
            const hydrated = await this.hydrateECO(updated);
            return hydrated.productDraft;
        });
    }

    /**
     * Update BOM draft
     */
    async updateBOMDraft(ecoId: string, components: Array<{ action: string; componentVersionId: string; quantity?: number }>, operations: Array<{ action: string; name: string; timeMinutes?: number; workCenter?: string }>, userId: string) {
        const eco = await db.query.ecos.findFirst({
            where: eq(schema.ecos.id, ecoId),
            with: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');
        if (eco.type !== 'BOM' && eco.type !== 'BOM_CHANGE') throw new Error('This ECO is not for a BOM');

        await validateECOEdit(eco.stageId);

        for (const comp of components) {
            if (comp.action === 'ADD' || comp.action === 'UPDATE') {
                await validateComponentIsActive(comp.componentVersionId);
            }
        }

        return await db.transaction(async (tx) => {
            await tx.update(schema.ecos)
                .set({
                    draftComponents: components,
                    draftOperations: operations,
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

            const updated = await tx.query.ecos.findFirst({ where: eq(schema.ecos.id, ecoId) });
            const hydrated = await this.hydrateECO(updated);
            return hydrated.bomDraft;
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
            id: Date.now().toString(),
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

            const updatedECO = await tx.query.ecos.findFirst({
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            // If next stage is final, trigger apply automatically
            if (nextStage.isFinal) {
                return await this.applyECO(ecoId, approverId);
            }

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
     * Apply ECO - Fully transactional execution
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
                        ecoId,
                        userId,
                        action: 'VERSION_CREATED',
                        oldValue: JSON.stringify({ version: activeVersion.version }),
                        newValue: JSON.stringify({ version: newVersion.version, changes: hydratedEco.productDraft }),
                    });

                    await tx.insert(schema.auditLogs).values({
                        id: crypto.randomUUID(),
                        entity: 'ProductVersion',
                        entityId: activeVersion.id,
                        ecoId,
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
                        ecoId,
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
                        ecoId,
                        userId,
                        action: 'VERSION_CREATED',
                        oldValue: JSON.stringify({ version: activeVersion.version }),
                        newValue: JSON.stringify({ version: newVersion.version }),
                    });

                    await tx.insert(schema.auditLogs).values({
                        id: crypto.randomUUID(),
                        entity: 'BOMVersion',
                        entityId: activeVersion.id,
                        ecoId,
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
                        ecoId,
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
                .where(eq(schema.ecos.id, ecoId));

            // Log ECO applied
            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
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
                where: eq(schema.ecos.id, ecoId),
                with: { stage: true },
            });

            const finalHydrated = await this.hydrateECO(finalECO);
            return { eco: finalHydrated, newVersion };
        });
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
     * Get ECOs
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
     * Hydrate virtual draft structures for frontend output compatibility
     */
    private async hydrateECO(eco: any) {
        if (!eco) return null;

        const productDraft = eco.type === 'PRODUCT'
            ? {
                productId: eco.draftProductId,
                name: eco.draftName,
                salePrice: eco.draftSalePrice ? parseFloat(eco.draftSalePrice) : undefined,
                costPrice: eco.draftCostPrice ? parseFloat(eco.draftCostPrice) : undefined,
            }
            : null;

        const bomDraft = (eco.type === 'BOM' || eco.type === 'BOM_CHANGE')
            ? {
                bomId: eco.draftBomId,
                notes: eco.draftNotes,
                draftComponents: (eco.draftComponents as any[]) || [],
                draftOperations: (eco.draftOperations as any[]) || [],
            }
            : null;

        return {
            ...eco,
            productDraft,
            bomDraft,
            draftAttachments: (eco.draftAttachments as any[]) || [],
        };
    }
}

export const ecoService = new ECOService();
