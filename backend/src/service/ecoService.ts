import { db } from '../libs/prisma.js';
import { ItemStatus, ECOType } from '@prisma/client';
import { validateECOEdit, validateApproval, validateApply, validateActiveVersion, validateComponentIsActive, canViewECOs } from '../libs/ecoValidation.js';
import { cloneProductVersion, cloneBOMVersion, updateCurrentProductVersion, updateCurrentBOMVersion } from '../libs/versionCloner.js';
import { stageService } from './stageService.js';

export class ECOService {
    /**
     * Create a new ECO for a product
     */
    /**
     * Unified ECO Creation
     */
    async createECO(data: {
        title: string;
        type: ECOType;
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

        // Initial Stage
        const newStage = await stageService.getInitialStage();
        const changes = initialChanges || {};

        let ecoData: any = {
            title,
            type,
            createdById,
            assigneeId,
            stageId: newStage.id,
            effectiveDate,
            versionUpdate: versionUpdate !== undefined ? versionUpdate : true,
        };

        if (type === ECOType.PRODUCT) {
            if (!productId) throw new Error('Product ID is required for Product ECO');

            // Verify product exists and get active version
            const product = await db.product.findUnique({
                where: { id: productId },
                include: {
                    versions: { where: { status: ItemStatus.ACTIVE, isCurrent: true } },
                },
            });

            if (!product) throw new Error('Product not found');
            if (product.versions.length === 0) throw new Error('Product has no active version');

            const activeVersion = product.versions[0]!;
            await validateActiveVersion(activeVersion.id, 'product');

            ecoData.productVersionId = activeVersion.id;
            ecoData.draftProductId = productId;
            ecoData.draftName = changes.name ?? null;
            ecoData.draftSalePrice = changes.salePrice ?? null;
            ecoData.draftCostPrice = changes.costPrice ?? null;
        }
        else if (type === ECOType.BOM || type === ECOType.BOM_CHANGE) {
            // Treat BOM and BOM_CHANGE similarly for creation, but BOM_CHANGE might imply specific intent
            if (!bomId) throw new Error('BOM ID is required for BOM ECO');

            const bom = await db.bOM.findUnique({
                where: { id: bomId },
                include: {
                    versions: { where: { status: ItemStatus.ACTIVE, isCurrent: true } },
                },
            });

            if (!bom) throw new Error('BOM not found');
            if (bom.versions.length === 0) throw new Error('BOM has no active version');

            const activeVersion = bom.versions[0]!;
            await validateActiveVersion(activeVersion.id, 'bom');

            // Check if linked product version is ACTIVE
            const productVersion = await db.productVersion.findUnique({ where: { id: activeVersion.productVersionId } });
            if (!productVersion || productVersion.status !== ItemStatus.ACTIVE) {
                throw new Error('Cannot modify BOM. Linked product version is archived.');
            }

            ecoData.bomVersionId = activeVersion.id;
            ecoData.draftBomId = bomId;
            ecoData.draftNotes = changes.notes ?? null;
            ecoData.draftComponents = (changes.components as any) || [];
            ecoData.draftOperations = [];
        }

        const eco = await db.eCO.create({
            data: ecoData,
            include: { stage: true },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: eco.id,
                ecoId: eco.id,
                userId: createdById,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: JSON.stringify({
                    title,
                    type,
                    stage: newStage.name,
                    assigneeId,
                    effectiveDate,
                    versionUpdate
                }),
            },
        });

        return eco;
    }

    /**
     * Create a new ECO for a product (Legacy Wrapper)
     */
    async createProductECO(productId: string, title: string, userId: string, initialChanges?: { name?: string; salePrice?: number; costPrice?: number }) {
        return this.createECO({
            title,
            type: ECOType.PRODUCT,
            createdById: userId,
            productId,
            initialChanges
        });
    }

    /**
     * Create a new ECO for a BOM (Legacy Wrapper)
     */
    async createBOMECO(bomId: string, title: string, userId: string, initialChanges?: { notes?: string, components?: any[] }) {
        return this.createECO({
            title,
            type: ECOType.BOM,
            createdById: userId,
            bomId,
            initialChanges
        });
    }

    /**
     * Update product draft changes
     */
    async updateProductDraft(ecoId: string, changes: { name?: string; salePrice?: number; costPrice?: number }, userId: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');
        if (eco.type !== ECOType.PRODUCT) throw new Error('This ECO is not for a product');

        await validateECOEdit(eco.stageId);

        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: {
                draftName: changes.name !== undefined ? changes.name : eco.draftName,
                draftSalePrice: changes.salePrice !== undefined ? changes.salePrice : eco.draftSalePrice,
                draftCostPrice: changes.costPrice !== undefined ? changes.costPrice : eco.draftCostPrice,
            },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECOProductDraft', // Keeping legacy entity name for continuity
                entityId: ecoId,
                ecoId: eco.id,
                userId,
                action: 'DRAFT_UPDATED',
                oldValue: JSON.stringify({ name: eco.draftName, price: eco.draftSalePrice }),
                newValue: JSON.stringify(changes),
            },
        });

        const hydrated = await this.hydrateECO(updatedECO);
        return hydrated.productDraft;
    }

    /**
     * Update BOM draft (components and operations)
     */
    async updateBOMDraft(ecoId: string, components: Array<{ action: string; componentVersionId: string; quantity?: number }>, operations: Array<{ action: string; name: string; timeMinutes?: number; workCenter?: string }>, userId: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');
        if (eco.type !== ECOType.BOM) throw new Error('This ECO is not for a BOM');

        await validateECOEdit(eco.stageId);

        // Validate components
        for (const comp of components) {
            if (comp.action === 'ADD' || comp.action === 'UPDATE') {
                await validateComponentIsActive(comp.componentVersionId);
            }
        }

        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: {
                draftComponents: components as any,
                draftOperations: operations as any,
            },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECOBOMDraft',
                entityId: ecoId,
                ecoId: eco.id,
                userId,
                action: 'DRAFT_UPDATED',
                oldValue: null,
                newValue: JSON.stringify({ components: components.length, operations: operations.length }),
            },
        });

        const hydrated = await this.hydrateECO(updatedECO);
        return hydrated.bomDraft;
    }

    /**
     * Add draft attachment to ECO
     */
    async addDraftAttachment(ecoId: string, filename: string, url: string, action: string, userId: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');
        await validateECOEdit(eco.stageId);

        const currentAttachments = (eco.draftAttachments as any[]) || [];
        const newAttachment = {
            id: Date.now().toString(), // Virtual ID
            ecoId,
            filename,
            url,
            action,
        };

        currentAttachments.push(newAttachment);

        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: {
                draftAttachments: currentAttachments as any,
            },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECODraftAttachment',
                entityId: newAttachment.id,
                ecoId,
                userId,
                action: 'DRAFT_ATTACHMENT_ADDED',
                oldValue: null,
                newValue: JSON.stringify({ filename, action }),
            },
        });

        return newAttachment;
    }

    /**
     * Submit ECO for review (NEW → REVIEW)
     */
    async submitForReview(ecoId: string, userId: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        // Get Next Stage (Dynamic)
        const nextStage = await stageService.getNextStage(eco.stageId);

        if (!nextStage) {
            throw new Error('No next stage found. This might be the final stage.');
        }

        // Validate transition
        const isValid = await stageService.validateTransition(eco.stageId, nextStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${nextStage.name}`);
        }

        // Update ECO stage
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: nextStage.id },
            include: { stage: true },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId,
                action: 'STAGE_TRANSITION',
                oldValue: eco.stage.name,
                newValue: nextStage.name,
            },
        });

        return this.hydrateECO(updatedECO);
    }

    /**
     * Advance ECO to next stage (For stages that DO NOT require approval)
     * e.g. "Validate" button behavior
     */
    async advanceStage(ecoId: string, userId: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        // Check internal mandatory flag OR stage configuration
        // Prioritize ECO-specific flag if set to TRUE
        if (eco.mandatoryApproval || eco.stage.requiresApproval) {
            throw new Error('Current stage requires formal approval. Please use the approve endpoint.');
        }

        // Get Next Stage (Dynamic)
        const nextStage = await stageService.getNextStage(eco.stageId);

        if (!nextStage) {
            throw new Error('No next stage found. This might be the final stage.');
        }

        // Validate transition
        const isValid = await stageService.validateTransition(eco.stageId, nextStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${nextStage.name}`);
        }

        // Update ECO stage
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: nextStage.id },
            include: { stage: true },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId,
                action: 'STAGE_ADVANCED',
                oldValue: eco.stage.name,
                newValue: nextStage.name,
            },
        });

        return this.hydrateECO(updatedECO);
    }

    /**
     * Approve ECO (REVIEW → APPROVED)
     */
    async approveECO(ecoId: string, approverId: string, userRole: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        // Validate approval
        await validateApproval(eco.stageId, userRole);

        // Get Next Stage (Dynamic)
        const nextStage = await stageService.getNextStage(eco.stageId);

        if (!nextStage) {
            throw new Error('No next stage found');
        }

        // Validate transition
        const isValid = await stageService.validateTransition(eco.stageId, nextStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${nextStage.name}`);
        }

        // Update ECO stage
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: nextStage.id },
            include: { stage: true },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId: approverId,
                action: 'ECO_APPROVED',
                oldValue: eco.stage.name,
                newValue: nextStage.name,
            },
        });

        return this.hydrateECO(updatedECO);
    }

    /**
     * Reject ECO (REVIEW → NEW)
     */
    async rejectECO(ecoId: string, approverId: string, reason: string, userRole: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        // Validate user is approver
        if (!['APPROVER', 'ADMIN'].includes(userRole)) {
            throw new Error('Only approvers can reject ECOs');
        }

        // Get Rejection Target (Dynamic - usually Draft)
        const targetStage = await stageService.getRejectionTargetStage();

        // Validate transition
        const isValid = await stageService.validateTransition(eco.stageId, targetStage.id);
        if (!isValid) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${targetStage.name}`);
        }

        // Update ECO stage
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: targetStage.id },
            include: { stage: true },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId: approverId,
                action: 'ECO_REJECTED',
                oldValue: eco.stage.name,
                newValue: `${targetStage.name} (Reason: ${reason})`,
            },
        });

        return this.hydrateECO(updatedECO);
    }

    /**
     * Apply ECO - Creates new version with draft changes (APPROVED → APPLIED)
     * This is the critical method that enforces version cloning
     */
    async applyECO(ecoId: string, userId: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: {
                stage: true,
            },
        });

        if (!eco) throw new Error('ECO not found');

        // Validate ECO is approved
        await validateApply(eco.stageId);

        // Validate Effective Date
        if (eco.effectiveDate && new Date(eco.effectiveDate) > new Date()) {
            throw new Error(`Cannot apply ECO before effective date: ${eco.effectiveDate.toISOString().split('T')[0]}`);
        }

        // Get Next Stage (Should be the Final/Applied stage)
        const nextStage = await stageService.getNextStage(eco.stageId);

        // Assuming Implemented is the next stage after Approved
        const appliedStage = nextStage;
        if (!appliedStage) {
            throw new Error('No next stage found (Implemented stage missing?)');
        }

        let newVersion: any;

        const hydratedEco = await this.hydrateECO(eco);

        // Apply Product ECO
        if (eco.type === ECOType.PRODUCT && eco.productVersionId) {
            const activeVersion = await db.productVersion.findUnique({
                where: { id: eco.productVersionId },
            });

            if (!activeVersion) {
                throw new Error('Active product version not found');
            }

            // Check Version Update Toggle
            if (eco.versionUpdate) {
                // TRUE: Create NEW Version (Standard Flow)
                newVersion = await cloneProductVersion(
                    activeVersion,
                    hydratedEco.productDraft,
                    hydratedEco.draftAttachments
                );

                // Log version creation
                await db.auditLog.create({
                    data: {
                        entity: 'ProductVersion',
                        entityId: newVersion.id,
                        ecoId,
                        userId,
                        action: 'VERSION_CREATED',
                        oldValue: JSON.stringify({ version: activeVersion.version }),
                        newValue: JSON.stringify({ version: newVersion.version, changes: hydratedEco.productDraft }),
                    },
                });

                // Log archival
                await db.auditLog.create({
                    data: {
                        entity: 'ProductVersion',
                        entityId: activeVersion.id,
                        ecoId,
                        userId,
                        action: 'VERSION_ARCHIVED',
                        oldValue: 'ACTIVE',
                        newValue: 'ARCHIVED',
                    },
                });
            } else {
                // FALSE: Update EXISTING Version (Hotfix Flow)
                newVersion = await updateCurrentProductVersion(
                    activeVersion,
                    hydratedEco.productDraft,
                    hydratedEco.draftAttachments
                );

                // Log version update
                await db.auditLog.create({
                    data: {
                        entity: 'ProductVersion',
                        entityId: activeVersion.id, // ID remains same
                        ecoId,
                        userId,
                        action: 'VERSION_UPDATED', // Distinct action
                        oldValue: 'Previous State',
                        newValue: JSON.stringify({ version: activeVersion.version, changes: hydratedEco.productDraft }),
                    },
                });
            }
        }
        // Apply BOM ECO
        else if (eco.type === ECOType.BOM && eco.bomVersionId) {
            const activeVersion = await db.bOMVersion.findUnique({
                where: { id: eco.bomVersionId },
            });

            if (!activeVersion) {
                throw new Error('Active BOM version not found');
            }

            // Check Version Update Toggle
            if (eco.versionUpdate) {
                // TRUE: Create NEW Version
                newVersion = await cloneBOMVersion(
                    activeVersion,
                    hydratedEco.bomDraft,
                    hydratedEco.bomDraft?.draftComponents || [],
                    hydratedEco.bomDraft?.draftOperations || []
                );

                // Log version creation
                await db.auditLog.create({
                    data: {
                        entity: 'BOMVersion',
                        entityId: newVersion.id,
                        ecoId,
                        userId,
                        action: 'VERSION_CREATED',
                        oldValue: JSON.stringify({ version: activeVersion.version }),
                        newValue: JSON.stringify({ version: newVersion.version }),
                    },
                });

                // Log archival
                await db.auditLog.create({
                    data: {
                        entity: 'BOMVersion',
                        entityId: activeVersion.id,
                        ecoId,
                        userId,
                        action: 'VERSION_ARCHIVED',
                        oldValue: 'ACTIVE',
                        newValue: 'ARCHIVED',
                    },
                });
            } else {
                // FALSE: Update EXISTING Version
                newVersion = await updateCurrentBOMVersion(
                    activeVersion,
                    hydratedEco.bomDraft,
                    hydratedEco.bomDraft?.draftComponents || [],
                    hydratedEco.bomDraft?.draftOperations || []
                );

                // Log version update
                await db.auditLog.create({
                    data: {
                        entity: 'BOMVersion',
                        entityId: activeVersion.id,
                        ecoId,
                        userId,
                        action: 'VERSION_UPDATED',
                        oldValue: 'Previous State',
                        newValue: JSON.stringify({ version: activeVersion.version }),
                    },
                });
            }
        }

        // Mark ECO as APPLIED
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: appliedStage.id },
            include: { stage: true },
        });

        // Log ECO applied
        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId,
                action: 'ECO_APPLIED',
                oldValue: eco.stage.name,
                newValue: appliedStage.name,
            },
        });

        const finalHydrated = await this.hydrateECO(updatedECO);
        return { eco: finalHydrated, newVersion };
    }

    /**
     * Get all ECOs (filtered by user role)
     */
    async getECOs(userRole: string, filters?: { type?: ECOType; stageId?: string }) {
        // Operations users cannot see ECOs
        if (!canViewECOs(userRole)) {
            return [];
        }

        const whereClause = {
            ...(filters?.type && { type: filters.type }),
            ...(filters?.stageId && { stageId: filters.stageId }),
        };

        const ecos = await db.eCO.findMany({
            where: whereClause,
            include: {
                stage: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                assignedTo: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Hydrate all results
        return Promise.all(ecos.map(eco => this.hydrateECO(eco)));
    }

    /**
     * Get ECO by ID with full details
     */
    async getECOById(ecoId: string, userRole: string) {
        // Operations users cannot see ECOs
        if (!canViewECOs(userRole)) {
            throw new Error('Access denied. Operations users cannot view ECOs.');
        }

        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: {
                stage: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                logs: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { timestamp: 'desc' },
                },
            },
        });

        if (!eco) {
            throw new Error('ECO not found');
        }

        // Hydrate
        return this.hydrateECO(eco);
    }

    /**
     * Get ECO statistics (count by stage)
     */
    async getECOStatistics(userRole: string) {
        if (!canViewECOs(userRole)) {
            return [];
        }

        const stats = await db.eCO.groupBy({
            by: ['stageId'],
            _count: {
                id: true,
            },
        });

        const statisticsWithStageNames = await Promise.all(
            stats.map(async (stat) => {
                const stage = await db.eCOStage.findUnique({
                    where: { id: stat.stageId },
                    select: { name: true },
                });
                return {
                    stageName: stage?.name || 'Unknown',
                    count: stat._count.id,
                };
            })
        );

        return statisticsWithStageNames;
    }

    /**
     * Hydrate ECO entity to include virtual draft objects
     * allowing frontend to work without changes
     */
    private async hydrateECO(eco: any) {
        // Helper to parse JSON safely
        const parse = (val: any) => typeof val === 'string' ? JSON.parse(val) : (val || []);

        const hydrated = { ...eco };

        // Hydrate Product Draft
        if (eco.type === ECOType.PRODUCT && eco.draftProductId) {
            const product = await db.product.findUnique({
                where: { id: eco.draftProductId },
                include: {
                    versions: { where: { status: ItemStatus.ACTIVE } }
                }
            });

            hydrated.productDraft = {
                id: `virtual-${eco.id}`,
                ecoId: eco.id,
                productId: eco.draftProductId,
                name: eco.draftName,
                salePrice: eco.draftSalePrice,
                costPrice: eco.draftCostPrice,
                product: product
            };
        } else {
            hydrated.productDraft = null;
        }

        // Hydrate BOM Draft
        if (eco.type === ECOType.BOM && eco.draftBomId) {
            const bom = await db.bOM.findUnique({
                where: { id: eco.draftBomId },
                include: {
                    versions: { where: { status: ItemStatus.ACTIVE } }
                }
            });

            const draftComponents = parse(eco.draftComponents);
            const draftOperations = parse(eco.draftOperations);

            // Fetch component details for draftComponents logic (to show product names)
            // This is "expensive" N+1 but safe for single ECO view.
            const expandedComponents = await Promise.all(draftComponents.map(async (dc: any) => {
                const version = await db.productVersion.findUnique({
                    where: { id: dc.componentVersionId },
                    include: { product: true }
                });
                return { ...dc, componentVersion: version };
            }));

            hydrated.bomDraft = {
                id: `virtual-${eco.id}`,
                ecoId: eco.id,
                bomId: eco.draftBomId,
                notes: eco.draftNotes,
                draftComponents: expandedComponents,
                draftOperations: draftOperations,
                bom: bom
            };
        } else {
            hydrated.bomDraft = null;
        }

        // Hydrate Attachments
        hydrated.draftAttachments = parse(eco.draftAttachments);

        return hydrated;
    }

    /**
     * Update ECO mandatory approval flag (Admin only)
     */
    async setMandatoryApproval(ecoId: string, mandatoryApproval: boolean, userId: string, userRole: string) {
        if (userRole !== 'ADMIN') {
            throw new Error('Only admins can set mandatory approval flag');
        }

        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        });

        if (!eco) throw new Error('ECO not found');

        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { mandatoryApproval },
            include: { stage: true },
        });

        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId,
                action: 'MANDATORY_APPROVAL_UPDATED',
                oldValue: String(eco.mandatoryApproval),
                newValue: String(mandatoryApproval),
            },
        });

        return this.hydrateECO(updatedECO);
    }
}

export const ecoService = new ECOService();
