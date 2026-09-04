import { db, schema } from '../db/index.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'node:crypto';
import {
    validateCCREdit,
    validateApproval,
    validateApply,
    validateActiveVersion,
    validateVariantVersionIsActive,
    canViewCCRs,
} from '../libs/ccrValidation.js';
import {
    cloneCatalogItemVersion,
    cloneVariantSetVersion,
    updateCurrentCatalogItemVersion,
    updateCurrentVariantSetVersion,
} from '../libs/versionCloner.js';
import { stageService } from './stageService.js';
import { CCRType } from '../db/schema.js';

export class CCRService {
    // ────────────────────────────────────────────────────────────────────────
    // CREATE CCR
    // ────────────────────────────────────────────────────────────────────────
    async createCCR(data: {
        title: string;
        type: CCRType;
        createdById: string;
        assigneeId?: string;
        effectiveDate?: Date;
        versionUpdate?: boolean;
        catalogItemId?: string;
        variantSetId?: string;
        rollbackTargetVersionId?: string;
        initialChanges?: any;
    }) {
        const { title, type, createdById, assigneeId, effectiveDate, versionUpdate,
            catalogItemId, variantSetId, rollbackTargetVersionId, initialChanges } = data;

        if (!title) throw new Error('Title is required');

        const newStage = await stageService.getInitialStage();
        const changes = initialChanges || {};
        const ccrId = crypto.randomUUID();
        const auditId = crypto.randomUUID();

        // Normalize VARIANT_SET_CHANGE → VARIANT_SET
        const normalizedType: CCRType = type === 'VARIANT_SET_CHANGE' ? 'VARIANT_SET' : type;

        let ccrData: any = {
            id: ccrId,
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

        // ── ROLLBACK CCR ───────────────────────────────────────────────────
        if (normalizedType === 'ROLLBACK') {
            if (!rollbackTargetVersionId) throw new Error('rollbackTargetVersionId is required for ROLLBACK CCR');

            const targetVersion = await db.query.catalogItemVersions.findFirst({
                where: eq(schema.catalogItemVersions.id, rollbackTargetVersionId),
            });

            if (!targetVersion) throw new Error('Rollback target version not found');
            if (targetVersion.status !== 'ARCHIVED') {
                throw new Error('Rollback target must be an ARCHIVED CatalogItemVersion');
            }

            ccrData.rollbackTargetVersionId = rollbackTargetVersionId;
            ccrData.draftCatalogItemId = targetVersion.catalogItemId;

        // ── CATALOG_ITEM CCR ───────────────────────────────────────────────
        } else if (normalizedType === 'CATALOG_ITEM') {
            if (!catalogItemId) throw new Error('catalogItemId is required for CATALOG_ITEM CCR');

            const activeVersion = await db.query.catalogItemVersions.findFirst({
                where: and(
                    eq(schema.catalogItemVersions.catalogItemId, catalogItemId),
                    eq(schema.catalogItemVersions.status, 'ACTIVE'),
                    eq(schema.catalogItemVersions.isCurrent, true)
                ),
            });

            if (!activeVersion) throw new Error('CatalogItem not found or has no active version');
            await validateActiveVersion(activeVersion.id, 'catalogItem');

            ccrData.catalogItemVersionId = activeVersion.id;
            ccrData.draftCatalogItemId = catalogItemId;
            ccrData.draftName = changes.name ?? null;
            ccrData.draftSalePrice = changes.salePrice ? changes.salePrice.toString() : null;
            ccrData.draftCostPrice = changes.costPrice ? changes.costPrice.toString() : null;
            ccrData.draftCurrency = changes.currency ?? null;

        // ── VARIANT_SET CCR ────────────────────────────────────────────────
        } else if (normalizedType === 'VARIANT_SET') {
            if (!variantSetId) throw new Error('variantSetId is required for VARIANT_SET CCR');

            const activeVersion = await db.query.variantSetVersions.findFirst({
                where: and(
                    eq(schema.variantSetVersions.variantSetId, variantSetId),
                    eq(schema.variantSetVersions.status, 'ACTIVE'),
                    eq(schema.variantSetVersions.isCurrent, true)
                ),
            });

            if (!activeVersion) throw new Error('VariantSet not found or has no active version');
            await validateActiveVersion(activeVersion.id, 'variantSet');

            // Validate parent CatalogItemVersion is still ACTIVE
            const catalogItemVersion = await db.query.catalogItemVersions.findFirst({
                where: eq(schema.catalogItemVersions.id, activeVersion.catalogItemVersionId),
            });
            if (!catalogItemVersion || catalogItemVersion.status !== 'ACTIVE') {
                throw new Error('Cannot modify VariantSet. Linked CatalogItemVersion is archived.');
            }

            ccrData.variantSetVersionId = activeVersion.id;
            ccrData.draftVariantSetId = variantSetId;
            ccrData.draftNotes = changes.notes ?? null;
            ccrData.draftVariants = changes.variants || [];
            ccrData.draftChannelRules = changes.channelRules || [];
        }

        return await db.transaction(async (tx) => {
            await tx.insert(schema.catalogChangeRequests).values(ccrData);

            await tx.insert(schema.auditLogs).values({
                id: auditId,
                entity: 'CatalogChangeRequest',
                entityId: ccrId,
                ccrId,
                userId: createdById,
                action: 'CCR_CREATED',
                oldValue: null,
                newValue: JSON.stringify({ title, type, stage: newStage.name, assigneeId, effectiveDate, versionUpdate }),
            });

            const ccr = await tx.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.id, ccrId),
                with: { stage: true },
            });

            return this.hydrateCCR(ccr);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // UPDATE DRAFT
    // ────────────────────────────────────────────────────────────────────────
    async updateDraft(ccrId: string, changes: any, userId: string) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId),
            with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');
        await validateCCREdit(ccr.stageId);

        const type = ccr.type === 'VARIANT_SET_CHANGE' ? 'VARIANT_SET' : ccr.type;

        return await db.transaction(async (tx) => {
            if (type === 'CATALOG_ITEM') {
                await tx.update(schema.catalogChangeRequests)
                    .set({
                        draftName:      changes.name      !== undefined ? changes.name      : ccr.draftName,
                        draftSalePrice: changes.salePrice !== undefined ? (changes.salePrice !== null ? changes.salePrice.toString() : null) : ccr.draftSalePrice,
                        draftCostPrice: changes.costPrice !== undefined ? (changes.costPrice !== null ? changes.costPrice.toString() : null) : ccr.draftCostPrice,
                        draftCurrency:  changes.currency  !== undefined ? changes.currency  : ccr.draftCurrency,
                        updatedAt: new Date(),
                    })
                    .where(eq(schema.catalogChangeRequests.id, ccrId));

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'CCRCatalogItemDraft',
                    entityId: ccrId,
                    ccrId: ccr.id,
                    userId,
                    action: 'DRAFT_UPDATED',
                    oldValue: JSON.stringify({ name: ccr.draftName, salePrice: ccr.draftSalePrice }),
                    newValue: JSON.stringify(changes),
                });

            } else if (type === 'VARIANT_SET') {
                const variants      = changes.variants      !== undefined ? changes.variants      : (ccr.draftVariants      || []);
                const channelRules  = changes.channelRules  !== undefined ? changes.channelRules  : (ccr.draftChannelRules  || []);
                const notes         = changes.notes         !== undefined ? changes.notes         : ccr.draftNotes;

                // Validate: cannot reference an archived CatalogItemVersion as a Variant
                for (const v of variants) {
                    if (v.action === 'ADD' || v.action === 'UPDATE') {
                        await validateVariantVersionIsActive(v.variantVersionId);
                    }
                }

                await tx.update(schema.catalogChangeRequests)
                    .set({ draftVariants: variants, draftChannelRules: channelRules, draftNotes: notes, updatedAt: new Date() })
                    .where(eq(schema.catalogChangeRequests.id, ccrId));

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(),
                    entity: 'CCRVariantSetDraft',
                    entityId: ccrId,
                    ccrId: ccr.id,
                    userId,
                    action: 'DRAFT_UPDATED',
                    oldValue: null,
                    newValue: JSON.stringify({ variants: variants.length, channelRules: channelRules.length }),
                });
            }

            const updated = await tx.query.catalogChangeRequests.findFirst({ where: eq(schema.catalogChangeRequests.id, ccrId) });
            return this.hydrateCCR(updated);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ADD DRAFT CONTENT (was addDraftAttachment)
    // ────────────────────────────────────────────────────────────────────────
    async addDraftContent(
        ccrId: string,
        filename: string,
        url: string,
        action: string,
        userId: string,
        opts?: { locale?: string; contentType?: 'IMAGE' | 'DESCRIPTION' | 'SPEC_SHEET'; approved?: boolean }
    ) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId),
            with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');
        await validateCCREdit(ccr.stageId);

        const currentContent = (ccr.draftContent as any[]) || [];
        const newContent = {
            id: crypto.randomUUID(),
            ccrId,
            filename,
            url,
            action,
            locale: opts?.locale || 'en-US',
            contentType: opts?.contentType || 'IMAGE',
            approved: opts?.approved ?? false,
        };
        currentContent.push(newContent);

        return await db.transaction(async (tx) => {
            await tx.update(schema.catalogChangeRequests)
                .set({ draftContent: currentContent, updatedAt: new Date() })
                .where(eq(schema.catalogChangeRequests.id, ccrId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(),
                entity: 'CCRDraftContent',
                entityId: newContent.id,
                ccrId,
                userId,
                action: 'DRAFT_CONTENT_ADDED',
                oldValue: null,
                newValue: JSON.stringify({ filename, action }),
            });

            return newContent;
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // VALIDATE (promotion conflict detection + readiness checks)
    // ────────────────────────────────────────────────────────────────────────
    async validateCCR(ccrId: string) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId),
            with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');

        let promotionConflictFlag = false;
        let promotionConflictDetail: string | null = null;

        // Promotion conflict detection: only relevant for CATALOG_ITEM CCRs with a price change
        if (ccr.type === 'CATALOG_ITEM' && ccr.draftSalePrice && ccr.draftCatalogItemId) {
            // Get baseline price
            const baselineVersion = ccr.catalogItemVersionId
                ? await db.query.catalogItemVersions.findFirst({ where: eq(schema.catalogItemVersions.id, ccr.catalogItemVersionId) })
                : null;

            const priceChanged = !baselineVersion || baselineVersion.salePrice !== ccr.draftSalePrice;

            if (priceChanged) {
                const effectiveDate = ccr.effectiveDate || new Date();

                // Find ACTIVE promotions for this CatalogItem whose date range overlaps CCR effectiveDate
                const activePromotions = await db.query.promotions.findMany({
                    where: and(
                        eq(schema.promotions.catalogItemId, ccr.draftCatalogItemId),
                        eq(schema.promotions.status, 'ACTIVE')
                    ),
                });

                const conflicting = activePromotions.filter(p =>
                    p.startDate <= effectiveDate && p.endDate >= effectiveDate
                );

                if (conflicting.length > 0) {
                    promotionConflictFlag = true;
                    promotionConflictDetail = `CCR effectiveDate (${effectiveDate.toISOString().split('T')[0]}) overlaps active promotions: ${conflicting.map(p => p.name).join(', ')}. Approver should review.`;
                }
            }
        }

        // Persist the flag on the CCR row
        await db.update(schema.catalogChangeRequests)
            .set({ promotionConflictFlag, updatedAt: new Date() })
            .where(eq(schema.catalogChangeRequests.id, ccrId));

        return {
            valid: true,
            promotionConflictFlag,
            promotionConflictDetail,
            warnings: promotionConflictFlag ? [promotionConflictDetail] : [],
        };
    }

    // ────────────────────────────────────────────────────────────────────────
    // SUBMIT FOR REVIEW
    // ────────────────────────────────────────────────────────────────────────
    async submitForReview(ccrId: string, userId: string) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId),
            with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');

        const nextStage = await stageService.getNextStage(ccr.stageId);
        if (!nextStage) throw new Error('No next stage found.');

        const isValid = await stageService.validateTransition(ccr.stageId, nextStage.id);
        if (!isValid) throw new Error(`Cannot transition from ${ccr.stage.name} to ${nextStage.name}`);

        return await db.transaction(async (tx) => {
            await tx.update(schema.catalogChangeRequests)
                .set({ stageId: nextStage.id, updatedAt: new Date() })
                .where(eq(schema.catalogChangeRequests.id, ccrId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'CatalogChangeRequest', entityId: ccrId, ccrId, userId,
                action: 'STAGE_TRANSITION', oldValue: ccr.stage.name, newValue: nextStage.name,
            });

            const updatedCCR = await tx.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
            });
            return this.hydrateCCR(updatedCCR);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // ADVANCE STAGE (non-approval stages)
    // ────────────────────────────────────────────────────────────────────────
    async advanceStage(ccrId: string, userId: string) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');

        if (ccr.mandatoryApproval || ccr.stage.requiresApproval) {
            throw new Error('Current stage requires formal approval. Use the approve endpoint.');
        }

        const nextStage = await stageService.getNextStage(ccr.stageId);
        if (!nextStage) throw new Error('No next stage found.');

        const isValid = await stageService.validateTransition(ccr.stageId, nextStage.id);
        if (!isValid) throw new Error(`Cannot transition from ${ccr.stage.name} to ${nextStage.name}`);

        return await db.transaction(async (tx) => {
            await tx.update(schema.catalogChangeRequests)
                .set({ stageId: nextStage.id, updatedAt: new Date() })
                .where(eq(schema.catalogChangeRequests.id, ccrId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'CatalogChangeRequest', entityId: ccrId, ccrId, userId,
                action: 'STAGE_ADVANCED', oldValue: ccr.stage.name, newValue: nextStage.name,
            });

            const updatedCCR = await tx.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
            });
            return this.hydrateCCR(updatedCCR);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // APPROVE CCR (N-of-M enforced)
    // ────────────────────────────────────────────────────────────────────────
    async approveCCR(ccrId: string, approverId: string, userRole: string, comment?: string) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');
        await validateApproval(ccr.stageId, userRole);

        // Record this individual approval decision
        await db.insert(schema.ccrApprovals).values({
            id: crypto.randomUUID(),
            ccrId,
            approverId,
            decision: 'APPROVED',
            comment: comment ?? null,
            decidedAt: new Date(),
        });

        await db.insert(schema.auditLogs).values({
            id: crypto.randomUUID(), entity: 'CCRApproval', entityId: ccrId, ccrId, userId: approverId,
            action: 'CCR_APPROVAL_RECORDED', oldValue: null, newValue: JSON.stringify({ decision: 'APPROVED', comment }),
        });

        // N-of-M check: only advance if approved count >= stage.minApprovals
        const approvedCount = await stageService.countApprovedDecisions(ccrId);
        const minApprovals = ccr.stage.minApprovals ?? 1;

        if (approvedCount < minApprovals) {
            // Not enough approvals yet — return current state with progress info
            const currentCCR = await db.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
            });
            return {
                ccr: await this.hydrateCCR(currentCCR),
                approvalProgress: { approvedCount, minApprovals, remaining: minApprovals - approvedCount },
                advanced: false,
            };
        }

        // Enough approvals — advance to next stage
        const nextStage = await stageService.getNextStage(ccr.stageId);
        if (!nextStage) throw new Error('No next stage found');

        const isValid = await stageService.validateTransition(ccr.stageId, nextStage.id);
        if (!isValid) throw new Error(`Cannot transition from ${ccr.stage.name} to ${nextStage.name}`);

        return await db.transaction(async (tx) => {
            await tx.update(schema.catalogChangeRequests)
                .set({ stageId: nextStage.id, updatedAt: new Date() })
                .where(eq(schema.catalogChangeRequests.id, ccrId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'CatalogChangeRequest', entityId: ccrId, ccrId, userId: approverId,
                action: 'CCR_APPROVED', oldValue: ccr.stage.name, newValue: nextStage.name,
            });

            // If next stage is final — trigger apply within same transaction
            if (nextStage.isFinal) {
                await validateApply(ccr.stageId);
                const hydratedCCR = await this.hydrateCCR(ccr);
                const result = await this._performApplyInTx(tx, ccr, hydratedCCR, nextStage, approverId);
                return { ...result, approvalProgress: { approvedCount, minApprovals, remaining: 0 }, advanced: true };
            }

            const updatedCCR = await tx.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
            });
            return {
                ccr: await this.hydrateCCR(updatedCCR),
                approvalProgress: { approvedCount, minApprovals, remaining: 0 },
                advanced: true,
            };
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // REJECT CCR
    // ────────────────────────────────────────────────────────────────────────
    async rejectCCR(ccrId: string, approverId: string, reason: string, userRole: string) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');

        if (!['CATEGORY_APPROVER', 'ADMIN'].includes(userRole)) {
            throw new Error('Only Category Approvers can reject Catalog Change Requests');
        }

        // Record rejection decision
        await db.insert(schema.ccrApprovals).values({
            id: crypto.randomUUID(),
            ccrId,
            approverId,
            decision: 'REJECTED',
            comment: reason,
            decidedAt: new Date(),
        });

        const targetStage = await stageService.getRejectionTargetStage();
        const isValid = await stageService.validateTransition(ccr.stageId, targetStage.id);
        if (!isValid) throw new Error(`Cannot transition from ${ccr.stage.name} to ${targetStage.name}`);

        return await db.transaction(async (tx) => {
            await tx.update(schema.catalogChangeRequests)
                .set({ stageId: targetStage.id, updatedAt: new Date() })
                .where(eq(schema.catalogChangeRequests.id, ccrId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'CatalogChangeRequest', entityId: ccrId, ccrId, userId: approverId,
                action: 'CCR_REJECTED', oldValue: ccr.stage.name, newValue: `${targetStage.name} (Reason: ${reason})`,
            });

            const updatedCCR = await tx.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
            });
            return this.hydrateCCR(updatedCCR);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // APPLY CCR — public entry point
    // ────────────────────────────────────────────────────────────────────────
    async applyCCR(ccrId: string, userId: string) {
        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
        });

        if (!ccr) throw new Error('CCR not found');
        await validateApply(ccr.stageId);

        if (ccr.effectiveDate && new Date(ccr.effectiveDate) > new Date()) {
            throw new Error(`Cannot apply CCR before effective date: ${ccr.effectiveDate.toISOString().split('T')[0]}`);
        }

        const nextStage = await stageService.getNextStage(ccr.stageId);
        const appliedStage = nextStage || ccr.stage;
        const hydratedCCR = await this.hydrateCCR(ccr);

        return await db.transaction(async (tx) => {
            return this._performApplyInTx(tx, ccr, hydratedCCR, appliedStage, userId);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // _performApplyInTx — private, shared by applyCCR and approveCCR (auto-apply on final stage)
    // Handles CATALOG_ITEM, VARIANT_SET, and ROLLBACK types.
    // ────────────────────────────────────────────────────────────────────────
    private async _performApplyInTx(tx: any, ccr: any, hydratedCCR: any, appliedStage: any, userId: string) {
        let newVersion: any;

        // ── ROLLBACK type: restore archived version by cloning it forward ──
        if (ccr.type === 'ROLLBACK' && ccr.rollbackTargetVersionId) {
            const archivedVersion = await tx.query.catalogItemVersions.findFirst({
                where: eq(schema.catalogItemVersions.id, ccr.rollbackTargetVersionId),
                with: { content: true },
            });

            if (!archivedVersion) throw new Error('Rollback target version not found');

            // Archive current active version
            const currentActive = await tx.query.catalogItemVersions.findFirst({
                where: and(
                    eq(schema.catalogItemVersions.catalogItemId, archivedVersion.catalogItemId),
                    eq(schema.catalogItemVersions.status, 'ACTIVE'),
                    eq(schema.catalogItemVersions.isCurrent, true)
                ),
            });

            // Clone the archived version forward as a new ACTIVE version (reuses same archive/clone pattern)
            newVersion = await cloneCatalogItemVersion(
                tx,
                currentActive || archivedVersion,
                {
                    salePrice: parseFloat(archivedVersion.salePrice),
                    costPrice: parseFloat(archivedVersion.costPrice),
                    currency: archivedVersion.currency,
                },
                archivedVersion.content || []
            );

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'CatalogItemVersion', entityId: newVersion.id, ccrId: ccr.id, userId,
                action: 'VERSION_ROLLED_BACK',
                oldValue: JSON.stringify({ version: currentActive?.version, fromArchived: archivedVersion.version }),
                newValue: JSON.stringify({ version: newVersion.version }),
            });

        // ── CATALOG_ITEM type ──────────────────────────────────────────────
        } else if (ccr.type === 'CATALOG_ITEM' && ccr.catalogItemVersionId) {
            const activeVersion = await tx.query.catalogItemVersions.findFirst({
                where: eq(schema.catalogItemVersions.id, ccr.catalogItemVersionId),
            });

            if (!activeVersion) throw new Error('Active CatalogItemVersion not found');

            if (ccr.versionUpdate) {
                newVersion = await cloneCatalogItemVersion(
                    tx, activeVersion, hydratedCCR.catalogItemDraft, hydratedCCR.draftContent || []
                );

                await tx.insert(schema.auditLogs).values([
                    {
                        id: crypto.randomUUID(), entity: 'CatalogItemVersion', entityId: newVersion.id, ccrId: ccr.id, userId,
                        action: 'VERSION_CREATED',
                        oldValue: JSON.stringify({ version: activeVersion.version }),
                        newValue: JSON.stringify({ version: newVersion.version, changes: hydratedCCR.catalogItemDraft }),
                    },
                    {
                        id: crypto.randomUUID(), entity: 'CatalogItemVersion', entityId: activeVersion.id, ccrId: ccr.id, userId,
                        action: 'VERSION_ARCHIVED', oldValue: 'ACTIVE', newValue: 'ARCHIVED',
                    },
                ]);
            } else {
                newVersion = await updateCurrentCatalogItemVersion(
                    tx, activeVersion, hydratedCCR.catalogItemDraft, hydratedCCR.draftContent || []
                );

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(), entity: 'CatalogItemVersion', entityId: activeVersion.id, ccrId: ccr.id, userId,
                    action: 'VERSION_UPDATED', oldValue: 'Previous State',
                    newValue: JSON.stringify({ version: activeVersion.version, changes: hydratedCCR.catalogItemDraft }),
                });
            }

            // Update CatalogItem name if changed
            if (hydratedCCR.catalogItemDraft?.name) {
                await tx.update(schema.catalogItems)
                    .set({ name: hydratedCCR.catalogItemDraft.name })
                    .where(eq(schema.catalogItems.id, ccr.draftCatalogItemId!));
            }

        // ── VARIANT_SET type ───────────────────────────────────────────────
        } else if (ccr.type === 'VARIANT_SET' && ccr.variantSetVersionId) {
            const activeVersion = await tx.query.variantSetVersions.findFirst({
                where: eq(schema.variantSetVersions.id, ccr.variantSetVersionId),
            });

            if (!activeVersion) throw new Error('Active VariantSetVersion not found');

            if (ccr.versionUpdate) {
                newVersion = await cloneVariantSetVersion(
                    tx, activeVersion, hydratedCCR.variantSetDraft,
                    hydratedCCR.variantSetDraft?.draftVariants || [],
                    hydratedCCR.variantSetDraft?.draftChannelRules || []
                );

                await tx.insert(schema.auditLogs).values([
                    {
                        id: crypto.randomUUID(), entity: 'VariantSetVersion', entityId: newVersion.id, ccrId: ccr.id, userId,
                        action: 'VERSION_CREATED',
                        oldValue: JSON.stringify({ version: activeVersion.version }),
                        newValue: JSON.stringify({ version: newVersion.version }),
                    },
                    {
                        id: crypto.randomUUID(), entity: 'VariantSetVersion', entityId: activeVersion.id, ccrId: ccr.id, userId,
                        action: 'VERSION_ARCHIVED', oldValue: 'ACTIVE', newValue: 'ARCHIVED',
                    },
                ]);
            } else {
                newVersion = await updateCurrentVariantSetVersion(
                    tx, activeVersion,
                    hydratedCCR.variantSetDraft?.draftVariants || [],
                    hydratedCCR.variantSetDraft?.draftChannelRules || []
                );

                await tx.insert(schema.auditLogs).values({
                    id: crypto.randomUUID(), entity: 'VariantSetVersion', entityId: activeVersion.id, ccrId: ccr.id, userId,
                    action: 'VERSION_UPDATED', oldValue: 'Previous State',
                    newValue: JSON.stringify({ version: activeVersion.version }),
                });
            }
        }

        // Mark CCR as applied/final
        await tx.update(schema.catalogChangeRequests)
            .set({ stageId: appliedStage.id, updatedAt: new Date() })
            .where(eq(schema.catalogChangeRequests.id, ccr.id));

        await tx.insert(schema.auditLogs).values({
            id: crypto.randomUUID(), entity: 'CatalogChangeRequest', entityId: ccr.id, ccrId: ccr.id, userId,
            action: 'CCR_APPLIED', oldValue: ccr.stage.name, newValue: appliedStage.name,
        });

        // Dispatch PublishTask for storefront team
        await tx.insert(schema.publishTasks).values({
            id: crypto.randomUUID(),
            ccrId: ccr.id,
            title: `Publish catalog changes for CCR: ${ccr.title}`,
            description: `CCR "${ccr.title}" has been applied. Please verify storefront reflects updated catalog data.`,
            status: 'PENDING',
        });

        const finalCCR = await tx.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccr.id), with: { stage: true },
        });

        return { ccr: await this.hydrateCCR(finalCCR), newVersion };
    }

    // ────────────────────────────────────────────────────────────────────────
    // SET MANDATORY APPROVAL (Admin only)
    // ────────────────────────────────────────────────────────────────────────
    async setMandatoryApproval(ccrId: string, mandatoryApproval: boolean, userId: string, userRole: string) {
        if (userRole !== 'ADMIN') throw new Error('Only admins can update mandatory approval flag');

        const ccr = await db.query.catalogChangeRequests.findFirst({ where: eq(schema.catalogChangeRequests.id, ccrId) });
        if (!ccr) throw new Error('CCR not found');

        return await db.transaction(async (tx) => {
            await tx.update(schema.catalogChangeRequests)
                .set({ mandatoryApproval, updatedAt: new Date() })
                .where(eq(schema.catalogChangeRequests.id, ccrId));

            await tx.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'CatalogChangeRequest', entityId: ccrId, ccrId, userId,
                action: 'MANDATORY_APPROVAL_TOGGLED',
                oldValue: ccr.mandatoryApproval ? 'true' : 'false',
                newValue: mandatoryApproval ? 'true' : 'false',
            });

            const updatedCCR = await tx.query.catalogChangeRequests.findFirst({
                where: eq(schema.catalogChangeRequests.id, ccrId), with: { stage: true },
            });
            return this.hydrateCCR(updatedCCR);
        });
    }

    // ────────────────────────────────────────────────────────────────────────
    // GET CCRs
    // ────────────────────────────────────────────────────────────────────────
    async getCCRs(userRole: string, filters?: { type?: CCRType; stageId?: string }) {
        if (!canViewCCRs(userRole)) {
            const error: any = new Error('Access denied. Storefront viewers cannot view CCRs.');
            error.statusCode = 403;
            throw error;
        }

        const ccrs = await db.query.catalogChangeRequests.findMany({
            where: (e, { and: andFn, eq: eqFn }) => {
                const conds: any[] = [];
                if (filters?.type) conds.push(eqFn(e.type, filters.type));
                if (filters?.stageId) conds.push(eqFn(e.stageId, filters.stageId));
                return conds.length ? andFn(...conds) : undefined;
            },
            with: {
                stage: true, createdBy: true, assignedTo: true,
                draftCatalogItem: true,
                catalogItemVersion: { with: { content: true } },
                draftVariantSet: true,
                variantSetVersion: true,
                approvals: true,
            },
            orderBy: [desc(schema.catalogChangeRequests.createdAt)],
        });

        return Promise.all(ccrs.map(c => this.hydrateCCR(c)));
    }

    async getCCRById(ccrId: string, userRole: string) {
        if (!canViewCCRs(userRole)) {
            const error: any = new Error('Access denied. Storefront viewers cannot view CCRs.');
            error.statusCode = 403;
            throw error;
        }

        const ccr = await db.query.catalogChangeRequests.findFirst({
            where: eq(schema.catalogChangeRequests.id, ccrId),
            with: {
                stage: true, createdBy: true,
                auditLogs: { with: { user: true }, orderBy: [desc(schema.auditLogs.timestamp)] },
                approvals: { with: { approver: true } },
            },
        });

        if (!ccr) throw new Error('CCR not found');
        return this.hydrateCCR(ccr);
    }

    async getCCRStatistics(userRole: string) {
        if (!canViewCCRs(userRole)) return [];

        const allCCRs = await db.query.catalogChangeRequests.findMany({ with: { stage: true } });

        const stageCounts = new Map<string, number>();
        for (const c of allCCRs) {
            const name = c.stage?.name || 'Unknown';
            stageCounts.set(name, (stageCounts.get(name) || 0) + 1);
        }

        return Array.from(stageCounts.entries()).map(([stageName, count]) => ({ stageName, count }));
    }

    // ────────────────────────────────────────────────────────────────────────
    // PUBLISH NOW — manual stub for scheduled activation
    // TODO: Replace with a real cron job that calls these functions periodically.
    //       e.g. schedule.scheduleJob('*/5 * * * *', () => publishNowService.activateAll());
    // ────────────────────────────────────────────────────────────────────────
    async activatePendingVersions(userId: string) {
        const now = new Date();
        const pendingVersions = await db.query.catalogItemVersions.findMany({
            where: and(
                eq(schema.catalogItemVersions.status, 'ARCHIVED'), // Not yet active
                eq(schema.catalogItemVersions.isCurrent, false),
            ),
        });

        // Filter to those whose effectiveFrom has passed
        const toActivate = pendingVersions.filter(
            v => v.effectiveFrom && new Date(v.effectiveFrom) <= now
        );

        const activated = [];
        for (const version of toActivate) {
            // Archive current active
            await db.update(schema.catalogItemVersions)
                .set({ status: 'ARCHIVED', isCurrent: false })
                .where(and(
                    eq(schema.catalogItemVersions.catalogItemId, version.catalogItemId),
                    eq(schema.catalogItemVersions.status, 'ACTIVE'),
                    eq(schema.catalogItemVersions.isCurrent, true)
                ));

            // Flip this version to active
            await db.update(schema.catalogItemVersions)
                .set({ status: 'ACTIVE', isCurrent: true })
                .where(eq(schema.catalogItemVersions.id, version.id));

            await db.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'CatalogItemVersion', entityId: version.id, userId,
                action: 'VERSION_ACTIVATED',
                oldValue: 'ARCHIVED', newValue: 'ACTIVE',
            });

            activated.push(version.id);
        }

        return { activated, count: activated.length };
    }

    async activatePendingChannelRules(userId: string) {
        const now = new Date();
        const pendingRules = await db.query.channelPublishRules.findMany({
            where: eq(schema.channelPublishRules.isLive, false),
        });

        const toActivate = pendingRules.filter(r => r.goLiveAt && new Date(r.goLiveAt) <= now);

        const activated = [];
        for (const rule of toActivate) {
            await db.update(schema.channelPublishRules)
                .set({ isLive: true })
                .where(eq(schema.channelPublishRules.id, rule.id));

            await db.insert(schema.auditLogs).values({
                id: crypto.randomUUID(), entity: 'ChannelPublishRule', entityId: rule.id, userId,
                action: 'CHANNEL_PUBLISHED',
                oldValue: 'false', newValue: 'true',
            });

            activated.push(rule.id);
        }

        return { activated, count: activated.length };
    }

    // ────────────────────────────────────────────────────────────────────────
    // PREVIEW CCR DIFF — compares draft changes against active baseline
    // ────────────────────────────────────────────────────────────────────────
    async previewCCRDiff(ccrId: string, userRole?: string) {
        const ccr = await this.getCCRById(ccrId, userRole || 'ADMIN');
        if (!ccr) throw new Error('CCR not found');

        let baseline: any = null;
        let draft: any = null;

        if (ccr.type === 'CATALOG_ITEM' || ccr.type === 'ROLLBACK') {
            baseline = (ccr as any).catalogItemDraft?.baselineVersion || null;
            draft = {
                name: (ccr as any).catalogItemDraft?.name,
                salePrice: (ccr as any).catalogItemDraft?.salePrice,
                costPrice: (ccr as any).catalogItemDraft?.costPrice,
                currency: (ccr as any).catalogItemDraft?.currency,
                rollbackTargetVersionId: (ccr as any).catalogItemDraft?.rollbackTargetVersionId,
            };
        } else if (ccr.type === 'VARIANT_SET') {
            draft = (ccr as any).variantSetDraft || null;
        }

        return {
            ccrId: ccr.id,
            title: ccr.title,
            type: ccr.type,
            stage: ccr.stage,
            baseline,
            draft,
            draftContent: (ccr as any).draftContent || [],
            promotionConflictFlag: (ccr as any).promotionConflictFlag,
        };
    }

    // ────────────────────────────────────────────────────────────────────────
    // HYDRATE CCR — builds virtual draft structures for frontend consumption
    // ────────────────────────────────────────────────────────────────────────
    private async hydrateCCR(ccr: any) {
        if (!ccr) return null;

        const type = ccr.type === 'VARIANT_SET_CHANGE' ? 'VARIANT_SET' : ccr.type;

        let catalogItemDraft = null;
        if (type === 'CATALOG_ITEM' || type === 'ROLLBACK') {
            const catalogItemId = ccr.draftCatalogItemId;

            let catalogItem: any = ('draftCatalogItem' in ccr) ? ccr.draftCatalogItem : null;
            let activeVersion: any = ('catalogItemVersion' in ccr) ? ccr.catalogItemVersion : null;

            if (!catalogItem && catalogItemId) {
                catalogItem = await db.query.catalogItems.findFirst({ where: eq(schema.catalogItems.id, catalogItemId) });
            }
            if (!activeVersion && ccr.catalogItemVersionId) {
                activeVersion = await db.query.catalogItemVersions.findFirst({
                    where: eq(schema.catalogItemVersions.id, ccr.catalogItemVersionId),
                    with: { content: true },
                });
            }

            catalogItemDraft = {
                id: catalogItemId,
                name: ccr.draftName ?? catalogItem?.name,
                sku: catalogItem?.sku,
                brand: catalogItem?.brand,
                category: catalogItem?.category,
                salePrice: ccr.draftSalePrice !== null ? parseFloat(ccr.draftSalePrice) : (activeVersion ? parseFloat(activeVersion.salePrice) : null),
                costPrice: ccr.draftCostPrice !== null ? parseFloat(ccr.draftCostPrice) : (activeVersion ? parseFloat(activeVersion.costPrice) : null),
                currency: ccr.draftCurrency ?? activeVersion?.currency ?? 'USD',
                baselineVersion: activeVersion ? { id: activeVersion.id, version: activeVersion.version, salePrice: parseFloat(activeVersion.salePrice), costPrice: parseFloat(activeVersion.costPrice) } : null,
                rollbackTargetVersionId: ccr.rollbackTargetVersionId ?? null,
            };
        }

        let variantSetDraft = null;
        if (type === 'VARIANT_SET') {
            variantSetDraft = {
                id: ccr.draftVariantSetId,
                notes: ccr.draftNotes,
                draftVariants: ccr.draftVariants || [],
                draftChannelRules: ccr.draftChannelRules || [],
            };
        }

        return {
            ...ccr,
            catalogItemDraft,
            variantSetDraft,
            draftContent: ccr.draftContent || [],
            approvalProgress: {
                approvedCount: (ccr.approvals || []).filter((a: any) => a.decision === 'APPROVED').length,
                minApprovals: ccr.stage?.minApprovals ?? 1,
            },
        };
    }
}

export const ccrService = new CCRService();
