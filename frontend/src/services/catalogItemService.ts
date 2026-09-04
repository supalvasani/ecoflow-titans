import type { CatalogItem, CatalogItemVersion, CatalogItemContent, CreateCatalogItemDTO } from '../types/catalogItem';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class CatalogItemService {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private async request<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return response.json();
    }

    async getCatalogItems(token: string, includeArchived: boolean = false): Promise<{ catalogItems: CatalogItem[]; products?: CatalogItem[] }> {
        return this.request(`/api/catalog-items?includeArchived=${includeArchived}`, token);
    }

    async getCatalogItemById(token: string, id: string): Promise<{ catalogItem: CatalogItem; product?: CatalogItem }> {
        return this.request(`/api/catalog-items/${id}`, token);
    }

    async createCatalogItem(token: string, data: CreateCatalogItemDTO): Promise<{ catalogItem: CatalogItem; product?: CatalogItem }> {
        return this.request('/api/catalog-items', token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getCatalogItemVersions(token: string, id: string): Promise<{ versions: CatalogItemVersion[] }> {
        return this.request(`/api/catalog-items/${id}/versions`, token);
    }

    async getActiveVersion(token: string, id: string): Promise<{ version: CatalogItemVersion }> {
        return this.request(`/api/catalog-items/${id}/active`, token);
    }

    async getContent(token: string, versionId: string): Promise<{ content: CatalogItemContent[]; attachments?: CatalogItemContent[] }> {
        return this.request<{ content: CatalogItemContent[]; attachments?: CatalogItemContent[] }>(
            `/api/catalog-items/item/versions/${versionId}/content`,
            token
        ).catch(() =>
            this.request<{ content: CatalogItemContent[]; attachments?: CatalogItemContent[] }>(
                `/api/catalog-items/${versionId}/versions/${versionId}/content`,
                token
            )
        );
    }

}

export const catalogItemService = new CatalogItemService(API_BASE_URL);

