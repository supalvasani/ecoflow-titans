import type { ItemStatus } from './product';
import type { ProductVersion } from './product';

export interface BOMOperation {
    id: string;
    bomVersionId: string;
    name: string;
    timeMinutes: number;
    workCenter: string;
}

export interface BOMComponent {
    id: string;
    bomVersionId: string;
    componentVersionId: string;
    quantity: number;
    componentVersion: ProductVersion; // Nested for tree view
}

export interface BOMVersion {
    id: string;
    bomId: string;
    productVersionId: string;
    version: number;
    status: ItemStatus;
    isCurrent: boolean;
    createdAt: string;
    components?: BOMComponent[];
    operations?: BOMOperation[];
}

export interface BOM {
    id: string;
    productId: string;
    createdAt: string;
    versions?: BOMVersion[];
}
