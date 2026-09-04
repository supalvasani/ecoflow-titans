import type { VariantSet, VariantSetVersion, ChannelPublishRule, CreateVariantSetDTO } from '../types/variantSet';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class VariantSetService {
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

    async getVariantSets(token: string, includeArchived: boolean = false): Promise<{ variantSets: VariantSet[] }> {
        return this.request(`/api/variant-sets?includeArchived=${includeArchived}`, token);
    }

    async getVariantSetById(token: string, id: string): Promise<{ variantSet: VariantSet }> {
        return this.request(`/api/variant-sets/${id}`, token);
    }

    async getVariantSetByCatalogItemId(token: string, catalogItemId: string): Promise<{ variantSet: VariantSet }> {
        return this.request(`/api/variant-sets/item/${catalogItemId}`, token);
    }

    async createVariantSet(token: string, data: CreateVariantSetDTO): Promise<{ variantSet: VariantSet }> {
        return this.request('/api/variant-sets', token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getActiveVariantSetVersion(token: string, id: string): Promise<{ version: VariantSetVersion }> {
        return this.request(`/api/variant-sets/${id}/active`, token);
    }

    async getVariantSetVersions(token: string, id: string): Promise<{ versions: VariantSetVersion[] }> {
        return this.request(`/api/variant-sets/${id}/versions`, token);
    }

    /**
     * Staggered multi-channel/region publish rule toggle
     * Sends PATCH request scoped strictly to single ChannelPublishRule ID
     */
    async toggleChannelPublishRule(token: string, ruleId: string, isLive: boolean): Promise<{ message: string; rule: ChannelPublishRule }> {
        return this.request(`/api/variant-sets/channel-rules/${ruleId}/toggle`, token, {
            method: 'PATCH',
            body: JSON.stringify({ isLive }),
        });
    }

}

export const variantSetService = new VariantSetService(API_BASE_URL);

