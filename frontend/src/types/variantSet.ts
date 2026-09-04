import type { CatalogItem, CatalogItemVersion, ItemStatus } from './catalogItem';

export type ChannelType = 'WEB' | 'MOBILE_APP' | 'MARKETPLACE';

export interface ChannelPublishRule {
    id: string;
    variantSetVersionId: string;
    channel: ChannelType;
    region: string;
    isLive: boolean;
    goLiveAt?: string | null;
    publishLeadMinutes: number;
}

export interface Variant {
    id: string;
    variantSetVersionId: string;
    variantVersionId: string;
    attributeName: string;
    attributeValue: string;
    stockQty: number;
    variantVersion?: CatalogItemVersion;
    // Legacy alias
    componentVersion?: CatalogItemVersion;
    quantity?: number;
}

export interface VariantSetVersion {
    id: string;
    variantSetId: string;
    catalogItemVersionId: string;
    version: number;
    versionString?: string;
    status: ItemStatus;
    isCurrent: boolean;
    createdAt: string;
    variants?: Variant[];
    channelPublishRules?: ChannelPublishRule[];
    // Legacy aliases
    components?: Variant[];
    operations?: ChannelPublishRule[];
}

export interface VariantSet {
    id: string;
    name?: string;
    catalogItemId: string;
    createdAt: string;
    catalogItem?: CatalogItem;
    versions?: VariantSetVersion[];
    activeVersion?: VariantSetVersion;
    // Legacy alias
    productId?: string;
    product?: CatalogItem;
}

export interface CreateVariantSetDTO {
    catalogItemId: string;
}


