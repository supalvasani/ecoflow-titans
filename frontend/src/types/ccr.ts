import type { User } from './auth';

export type CCRType = 'CATALOG_ITEM' | 'VARIANT_SET' | 'VARIANT_SET_CHANGE' | 'ROLLBACK';
export const CCRType = {
    CATALOG_ITEM: 'CATALOG_ITEM' as const,
    VARIANT_SET: 'VARIANT_SET' as const,
    VARIANT_SET_CHANGE: 'VARIANT_SET_CHANGE' as const,
    ROLLBACK: 'ROLLBACK' as const,
};

export interface CCRStage {
    id: string;
    name: string;
    sequence: number;
    requiresApproval: boolean;
    isFinal: boolean;
    minApprovals: number;
}

export interface CCRApproval {
    id: string;
    ccrId: string;
    approverId: string;
    decision: 'APPROVED' | 'REJECTED';
    comment?: string | null;
    decidedAt: string;
    approver?: User;
}

export interface AuditLog {
    id: string;
    entity: string;
    entityId: string;
    action: string;
    userId: string;
    oldValue?: string | null;
    newValue?: string | null;
    timestamp: string;
    user?: User;
}

export interface CatalogChangeRequest {
    id: string;
    title: string;
    type: CCRType;
    createdById: string;
    assigneeId?: string | null;
    stageId: string;
    effectiveDate?: string | null;
    versionUpdate: boolean;
    mandatoryApproval: boolean;
    promotionConflictFlag: boolean;
    rollbackTargetVersionId?: string | null;

    catalogItemVersionId?: string | null;
    variantSetVersionId?: string | null;

    draftCatalogItemId?: string | null;
    draftName?: string | null;
    draftSalePrice?: string | number | null;
    draftCostPrice?: string | number | null;
    draftCurrency?: string | null;

    draftVariantSetId?: string | null;
    draftNotes?: string | null;
    draftVariants?: any[];
    draftChannelRules?: any[];
    draftContent?: any[];

    stage?: CCRStage;
    createdBy?: User;
    assignedTo?: User;
    approvals?: CCRApproval[];
    auditLogs?: any[];

    approvalProgress?: {
        approvedCount: number;
        minApprovals: number;
    };

    catalogItemDraft?: any;
    variantSetDraft?: any;

    createdAt: string;
    updatedAt: string;
}

export interface CreateCCRDTO {
    title: string;
    type: CCRType;
    catalogItemId?: string;
    variantSetId?: string;
    rollbackTargetVersionId?: string;
    effectiveDate?: string;
    versionUpdate?: boolean;
    initialChanges?: any;
}


