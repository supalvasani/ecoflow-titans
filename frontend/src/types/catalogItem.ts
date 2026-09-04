export const ItemStatus = {
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
} as const;

export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

export type ContentType = 'IMAGE' | 'DESCRIPTION' | 'SPEC_SHEET';

export interface CatalogItemContent {
    id: string;
    catalogItemVersionId: string;
    locale: string;
    contentType: ContentType;
    filename: string;
    url: string;
    approved: boolean;
    createdAt: string;
}

export interface CatalogItemVersion {
    id: string;
    catalogItemId: string;
    version: number;
    salePrice: number;
    costPrice: number;
    currency: string;
    status: ItemStatus;
    isCurrent: boolean;
    effectiveFrom?: string | null;
    createdAt: string;
    catalogItem?: CatalogItem;
    content?: CatalogItemContent[];
    attachments?: CatalogItemContent[]; // backward compat alias
}

export interface CatalogItem {
    id: string;
    name: string;
    sku: string;
    brand?: string | null;
    category?: string | null;
    createdAt: string;
    versions?: CatalogItemVersion[];
}

export interface CreateCatalogItemDTO {
    name: string;
    sku: string;
    salePrice: number;
    costPrice: number;
    currency?: string;
    brand?: string;
    category?: string;
}

// Backward compatibility types
export type Product = CatalogItem;
export type ProductVersion = CatalogItemVersion;
export type ProductAttachment = CatalogItemContent;
export type CreateProductDTO = CreateCatalogItemDTO;
