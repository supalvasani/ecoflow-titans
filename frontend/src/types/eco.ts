import type { User } from './auth';
import type { Product } from './product';

export const ECOType = {
    PRODUCT: 'PRODUCT',
    BOM: 'BOM',
    BOM_CHANGE: 'BOM_CHANGE'
} as const;
export type ECOType = (typeof ECOType)[keyof typeof ECOType];

export interface ECOStage {
    id: string;
    name: string;
    sequence: number;
    requiresApproval: boolean;
    isFinal: boolean;
}

export interface ECOProductDraft {
    id: string;
    ecoId: string;
    productId: string;
    name: string | null;
    salePrice: number | null;
    costPrice: number | null;
    product?: Product;
}

export interface ECODraftComponent {
    id: string;
    bomDraftId: string;
    componentVersionId: string;
    quantity: number;
    action: 'ADD' | 'UPDATE' | 'DELETE';
    componentVersion?: any;
}

export interface ECODraftOperation {
    id: string;
    bomDraftId: string;
    name: string;
    timeMinutes: number;
    workCenter: string;
    action: 'ADD' | 'UPDATE' | 'DELETE';
}

export interface ECOBOMDraft {
    id: string;
    ecoId: string;
    bomId: string;
    notes: string | null;
    draftComponents: ECODraftComponent[];
    draftOperations: ECODraftOperation[];
    bom?: any;
}

export interface ECODraftAttachment {
    id: string;
    ecoId: string;
    filename: string;
    url: string;
    action: 'ADD' | 'DELETE';
}

export interface ECO {
    id: string;
    title: string;
    type: ECOType;
    createdById: string;
    assigneeId: string | null;
    stageId: string;
    effectiveDate: string | null;
    versionUpdate: boolean;
    mandatoryApproval: boolean;
    productVersionId: string | null;
    bomVersionId: string | null;
    createdAt: string;
    updatedAt: string;
    stage: ECOStage;
    createdBy: Pick<User, 'id' | 'name' | 'email'>;
    productDraft?: ECOProductDraft | null;
    bomDraft?: ECOBOMDraft | null;
    draftAttachments?: ECODraftAttachment[];
}

export interface AuditLog {
    id: string;
    ecoId: string | null;
    entity: string;
    entityId: string;
    userId: string;
    action: string;
    oldValue: string | null;
    newValue: string | null;
    timestamp: string;
    user: Pick<User, 'name' | 'email'>;
}
