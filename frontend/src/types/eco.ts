import type { User } from './auth';
import type { Product } from './product';

export const ECOType = {
    PRODUCT: 'PRODUCT',
    BOM: 'BOM'
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

export interface ECO {
    id: string;
    title: string;
    type: ECOType;
    createdById: string;
    stageId: string;
    effectiveDate: string | null;
    versionUpdate: boolean;
    productVersionId: string | null;
    bomVersionId: string | null;
    createdAt: string;
    updatedAt: string;
    stage: ECOStage;
    createdBy: Pick<User, 'id' | 'name' | 'email'>;
    productDraft?: ECOProductDraft;
    // bomDraft type to be added when BOM module is implemented
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
