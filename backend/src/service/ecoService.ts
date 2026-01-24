import { db } from '../libs/prisma.js';
import { ItemStatus, ECOType } from '@prisma/client';
import { ECO_STAGES, canTransition, isEditableStage } from '../libs/ecoStages.js';
import { validateECOEdit, validateApproval, validateApply, validateActiveVersion, validateComponentIsActive, canViewECOs } from '../libs/ecoValidation.js';
import { cloneProductVersion, cloneBOMVersion } from '../libs/versionCloner.js';

export class ECOService {
    /**
     * Create a new ECO for a product
     */
    async createProductECO(productId: string, title: string, userId: string) {
        if (!productId || !title) {
            throw new Error('Product ID and title are required');
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

        // Validate version is ACTIVE
        await validateActiveVersion(activeVersion.id, 'product');

        // Get NEW stage
        const newStage = await db.eCOStage.findFirst({
            where: { name: 'Draft' },
        });

        if (!newStage) {
            throw new Error('ECO stage "Draft" not found. Please run seed script.');
        }

        // Create ECO with product draft
        const eco = await db.eCO.create({
            data: {
                title,
                type: ECOType.PRODUCT,
                createdById: userId,
                stageId: newStage.id,
                productVersionId: activeVersion.id,
                productDraft: {
                    create: {
                        productId,
                        // Initially null - user will update via updateProductDraft
                        name: null,
                        salePrice: null,
                        costPrice: null,
                    },
                },
            },
            include: {
                productDraft: true,
                stage: true,
            },
        }) as any;

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: eco.id,
                ecoId: eco.id,
                userId,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: JSON.stringify({ title, type: 'PRODUCT', stage: newStage.name }),
            },
        });

        return eco;
    }

    /**
     * Create a new ECO for a BOM
     */
    async createBOMECO(bomId: string, title: string, userId: string) {
        if (!bomId || !title) {
            throw new Error('BOM ID and title are required');
        }

        // Verify BOM exists and get active version
        const bom = await db.bOM.findUnique({
            where: { id: bomId },
            include: {
                versions: {
                    where: { status: ItemStatus.ACTIVE, isCurrent: true },
                },
            },
        });

        if (!bom) {
            throw new Error('BOM not found');
        }

        if (bom.versions.length === 0) {
            throw new Error('BOM has no active version');
        }

        const activeVersion = bom.versions[0]!;

        // Validate version is ACTIVE
        await validateActiveVersion(activeVersion.id, 'bom');

        // Also check if linked product version is ACTIVE
        const productVersion = await db.productVersion.findUnique({
            where: { id: activeVersion.productVersionId },
        });

        if (!productVersion || productVersion.status !== ItemStatus.ACTIVE) {
            throw new Error('Cannot modify BOM. Linked product version is archived.');
        }

        // Get NEW stage
        const newStage = await db.eCOStage.findFirst({
            where: { name: 'Draft' },
        });

        if (!newStage) {
            throw new Error('ECO stage "Draft" not found. Please run seed script.');
        }

        // Create ECO with BOM draft
        const eco = await db.eCO.create({
            data: {
                title,
                type: ECOType.BOM,
                createdById: userId,
                stageId: newStage.id,
                bomVersionId: activeVersion.id,
                bomDraft: {
                    create: {
                        bomId,
                        notes: null,
                    },
                },
            },
            include: {
                bomDraft: {
                    include: {
                        draftComponents: true,
                        draftOperations: true,
                    },
                },
                stage: true,
            },
        }) as any;

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: eco.id,
                ecoId: eco.id,
                userId,
                action: 'ECO_CREATED',
                oldValue: null,
                newValue: JSON.stringify({ title, type: 'BOM', stage: newStage.name }),
            },
        });

        return eco;
    }

    /**
     * Update product draft changes
     */
    async updateProductDraft(
        ecoId: string,
        changes: { name?: string; salePrice?: number; costPrice?: number },
        userId: string
    ) {
        // Get ECO
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: {
                productDraft: true,
                stage: true,
            },
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        if (eco.type !== ECOType.PRODUCT) {
            throw new Error('This ECO is not for a product');
        }

        // Validate ECO is editable
        validateECOEdit(eco.stageId);

        if (!eco.productDraft) {
            throw new Error('Product draft not found');
        }

        // Update draft
        const updatedDraft = await (db as any).eCOProductDraft.update({
            where: { id: eco.productDraft.id },
            data: {
                name: changes.name !== undefined ? changes.name : eco.productDraft.name,
                salePrice: changes.salePrice !== undefined ? changes.salePrice : eco.productDraft.salePrice,
                costPrice: changes.costPrice !== undefined ? changes.costPrice : eco.productDraft.costPrice,
            },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECOProductDraft',
                entityId: updatedDraft.id,
                ecoId: eco.id,
                userId,
                action: 'DRAFT_UPDATED',
                oldValue: JSON.stringify(eco.productDraft),
                newValue: JSON.stringify(changes),
            },
        });

        return updatedDraft;
    }

    /**
     * Update BOM draft (components and operations)
     */
    async updateBOMDraft(
        ecoId: string,
        components: Array<{ action: string; componentVersionId: string; quantity?: number }>,
        operations: Array<{ action: string; name: string; timeMinutes?: number; workCenter?: string }>,
        userId: string
    ) {
        // Get ECO
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: {
                bomDraft: {
                    include: {
                        draftComponents: true,
                        draftOperations: true,
                    },
                },
                stage: true,
            },
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        if (eco.type !== ECOType.BOM) {
            throw new Error('This ECO is not for a BOM');
        }

        // Validate ECO is editable
        validateECOEdit(eco.stageId);

        if (!eco.bomDraft) {
            throw new Error('BOM draft not found');
        }

        // Validate all components are ACTIVE
        for (const comp of components) {
            if (comp.action === 'ADD' || comp.action === 'UPDATE') {
                await validateComponentIsActive(comp.componentVersionId);
            }
        }

        // Clear existing draft components and operations
        await (db as any).eCODraftComponent.deleteMany({
            where: { bomDraftId: eco.bomDraft.id },
        });

        await (db as any).eCODraftOperation.deleteMany({
            where: { bomDraftId: eco.bomDraft.id },
        });

        // Create new draft components
        for (const comp of components) {
            await (db as any).eCODraftComponent.create({
                data: {
                    bomDraftId: eco.bomDraft.id,
                    componentVersionId: comp.componentVersionId,
                    quantity: comp.quantity || 1,
                    action: comp.action,
                },
            });
        }

        // Create new draft operations
        for (const op of operations) {
            await (db as any).eCODraftOperation.create({
                data: {
                    bomDraftId: eco.bomDraft.id,
                    name: op.name,
                    timeMinutes: op.timeMinutes || 0,
                    workCenter: op.workCenter || '',
                    action: op.action,
                },
            });
        }

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECOBOMDraft',
                entityId: eco.bomDraft.id,
                ecoId: eco.id,
                userId,
                action: 'DRAFT_UPDATED',
                oldValue: null,
                newValue: JSON.stringify({ components: components.length, operations: operations.length }),
            },
        });

        // Return updated draft
        const updatedDraft = await (db as any).eCOBOMDraft.findUnique({
            where: { id: eco.bomDraft.id },
            include: {
                draftComponents: {
                    include: {
                        componentVersion: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                draftOperations: true,
            },
        }) as any;

        return updatedDraft;
    }

    /**
     * Add draft attachment to ECO
     */
    async addDraftAttachment(ecoId: string, filename: string, url: string, action: string, userId: string) {
        // Get ECO
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        // Validate ECO is editable
        validateECOEdit(eco.stageId);

        // Create draft attachment
        const attachment = await (db as any).eCODraftAttachment.create({
            data: {
                ecoId,
                filename,
                url,
                action,
            },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECODraftAttachment',
                entityId: attachment.id,
                ecoId,
                userId,
                action: 'DRAFT_ATTACHMENT_ADDED',
                oldValue: null,
                newValue: JSON.stringify({ filename, action }),
            },
        });

        return attachment;
    }

    /**
     * Submit ECO for review (NEW → REVIEW)
     */
    async submitForReview(ecoId: string, userId: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        // Get REVIEW stage
        const reviewStage = await db.eCOStage.findFirst({
            where: { name: 'Under Review' },
        });

        if (!reviewStage) {
            throw new Error('Review stage not found');
        }

        // Validate transition
        if (!canTransition(eco.stageId, reviewStage.id)) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${reviewStage.name}`);
        }

        // Update ECO stage
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: reviewStage.id },
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
                newValue: reviewStage.name,
            },
        });

        return updatedECO;
    }

    /**
     * Approve ECO (REVIEW → APPROVED)
     */
    async approveECO(ecoId: string, approverId: string, userRole: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        // Validate approval
        validateApproval(eco.stageId, userRole);

        // Get APPROVED stage
        const approvedStage = await db.eCOStage.findFirst({
            where: { name: 'Approved' },
        });

        if (!approvedStage) {
            throw new Error('Approved stage not found');
        }

        // Validate transition
        if (!canTransition(eco.stageId, approvedStage.id)) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${approvedStage.name}`);
        }

        // Update ECO stage
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: approvedStage.id },
            include: { stage: true },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId: approverId,
                action: 'ECO_APPROVED',
                oldValue: eco.stage.name,
                newValue: approvedStage.name,
            },
        });

        return updatedECO;
    }

    /**
     * Reject ECO (REVIEW → NEW)
     */
    async rejectECO(ecoId: string, approverId: string, reason: string, userRole: string) {
        const eco = await db.eCO.findUnique({
            where: { id: ecoId },
            include: { stage: true },
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        // Validate user is approver
        if (!['APPROVER', 'ADMIN'].includes(userRole)) {
            throw new Error('Only approvers can reject ECOs');
        }

        // Get NEW stage
        const newStage = await db.eCOStage.findFirst({
            where: { name: 'Draft' },
        });

        if (!newStage) {
            throw new Error('Draft stage not found');
        }

        // Validate transition
        if (!canTransition(eco.stageId, newStage.id)) {
            throw new Error(`Cannot transition from ${eco.stage.name} to ${newStage.name}`);
        }

        // Update ECO stage
        const updatedECO = await db.eCO.update({
            where: { id: ecoId },
            data: { stageId: newStage.id },
            include: { stage: true },
        });

        // Create audit log
        await db.auditLog.create({
            data: {
                entity: 'ECO',
                entityId: ecoId,
                ecoId,
                userId: approverId,
                action: 'ECO_REJECTED',
                oldValue: eco.stage.name,
                newValue: `${newStage.name} (Reason: ${reason})`,
            },
        });

        return updatedECO;
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
                productDraft: true,
                bomDraft: {
                    include: {
                        draftComponents: true,
                        draftOperations: true,
                    },
                },
                draftAttachments: true,
            },
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        // Validate ECO is approved
        validateApply(eco.stageId);

        // Get APPLIED stage
        const appliedStage = await db.eCOStage.findFirst({
            where: { name: 'Implemented' },
        });

        if (!appliedStage) {
            throw new Error('Implemented stage not found');
        }

        let newVersion: any;

        // Apply Product ECO
        if (eco.type === ECOType.PRODUCT && eco.productVersionId) {
            const activeVersion = await db.productVersion.findUnique({
                where: { id: eco.productVersionId },
            });

            if (!activeVersion) {
                throw new Error('Active product version not found');
            }

            // Clone version with draft changes
            newVersion = await cloneProductVersion(
                activeVersion,
                eco.productDraft,
                eco.draftAttachments
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
                    newValue: JSON.stringify({ version: newVersion.version, changes: eco.productDraft }),
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
        }
        // Apply BOM ECO
        else if (eco.type === ECOType.BOM && eco.bomVersionId) {
            const activeVersion = await db.bOMVersion.findUnique({
                where: { id: eco.bomVersionId },
            });

            if (!activeVersion) {
                throw new Error('Active BOM version not found');
            }

            // Clone version with draft changes
            newVersion = await cloneBOMVersion(
                activeVersion,
                eco.bomDraft,
                eco.bomDraft?.draftComponents || [],
                eco.bomDraft?.draftOperations || []
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

        return { eco: updatedECO, newVersion };
    }

    /**
     * Get all ECOs (filtered by user role)
     */
    async getECOs(userRole: string, filters?: { type?: ECOType; stageId?: string }) {
        // Operations users cannot see ECOs
        if (!canViewECOs(userRole)) {
            return [];
        }

        const ecos = await db.eCO.findMany({
            where: {
                ...(filters?.type && { type: filters.type }),
                ...(filters?.stageId && { stageId: filters.stageId }),
            },
            include: {
                stage: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                productDraft: true,
                bomDraft: {
                    include: {
                        draftComponents: {
                            include: {
                                componentVersion: {
                                    include: {
                                        product: true,
                                    },
                                },
                            },
                        },
                        draftOperations: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        }) as any;

        return ecos;
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
                productDraft: {
                    include: {
                        product: {
                            include: {
                                versions: {
                                    where: { status: ItemStatus.ACTIVE },
                                },
                            },
                        },
                    },
                },
                bomDraft: {
                    include: {
                        bom: {
                            include: {
                                versions: {
                                    where: { status: ItemStatus.ACTIVE },
                                },
                            },
                        },
                        draftComponents: {
                            include: {
                                componentVersion: {
                                    include: {
                                        product: true,
                                    },
                                },
                            },
                        },
                        draftOperations: true,
                    },
                },
                draftAttachments: true,
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
        }) as any;

        if (!eco) {
            throw new Error('ECO not found');
        }

        return eco;
    }
}

export const ecoService = new ECOService();
