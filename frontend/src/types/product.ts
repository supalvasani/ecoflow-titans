export const ItemStatus = {
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
} as const;

export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

export interface ProductAttachment {
    id: string;
    productVersionId: string;
    filename: string;
    url: string;
    createdAt: string;
}

export interface ProductVersion {
    id: string;
    productId: string;
    version: number;
    salePrice: number; // Decimal in backend, number in frontend
    costPrice: number;
    status: ItemStatus;
    isCurrent: boolean;
    createdAt: string;
    attachments?: ProductAttachment[];
}

export interface Product {
    id: string;
    name: string;
    createdAt: string;
    versions?: ProductVersion[];
}

export interface CreateProductDTO {
    name: string;
    salePrice: number;
    costPrice: number;
}
