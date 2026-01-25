import type { ECO, ECOType } from '../types/eco';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ECOService {
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

    /**
     * Create Product ECO
     */
    async createProductECO(token: string, productId: string, title: string): Promise<string> {
        const response = await this.request<{ eco: ECO }>('/api/ecos/product', token, {
            method: 'POST',
            body: JSON.stringify({ productId, title }),
        });
        return response.eco.id;
    }

    /**
     * Create BOM ECO
     */
    async createBOMECO(token: string, bomId: string, title: string): Promise<string> {
        const response = await this.request<{ eco: ECO }>('/api/ecos/bom', token, {
            method: 'POST',
            body: JSON.stringify({ bomId, title }),
        });
        return response.eco.id;
    }

    /**
     * Get All ECOs
     */
    async getECOs(token: string, filters?: { type?: ECOType, stageId?: string }): Promise<{ ecos: ECO[] }> {
        const query = new URLSearchParams();
        if (filters?.type) query.append('type', filters.type);
        if (filters?.stageId) query.append('stageId', filters.stageId);

        return this.request(`/api/ecos?${query.toString()}`, token);
    }

    /**
     * Get ECO by ID
     */
    async getECOById(token: string, id: string): Promise<{ eco: ECO }> {
        return this.request(`/api/ecos/${id}`, token);
    }

    /**
     * Update Product Draft
     */
    async updateProductDraft(token: string, ecoId: string, changes: { name?: string; salePrice?: number; costPrice?: number }): Promise<any> {
        return this.request(`/api/ecos/${ecoId}/draft/product`, token, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
    }

    /**
     * Update BOM Draft
     */
    async updateBOMDraft(token: string, ecoId: string, changes: { components?: any[]; operations?: any[] }): Promise<any> {
        return this.request(`/api/ecos/${ecoId}/draft/bom`, token, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
    }

    /**
     * Submit for Review
     */
    async submitForReview(token: string, ecoId: string): Promise<{ eco: ECO }> {
        return this.request(`/api/ecos/${ecoId}/submit`, token, {
            method: 'POST',
        });
    }

    /**
     * Approve ECO
     */
    async approveECO(token: string, ecoId: string): Promise<{ eco: ECO }> {
        return this.request(`/api/ecos/${ecoId}/approve`, token, {
            method: 'POST',
        });
    }

    /**
     * Reject ECO
     */
    async rejectECO(token: string, ecoId: string, reason: string): Promise<{ eco: ECO }> {
        return this.request(`/api/ecos/${ecoId}/reject`, token, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    /**
     * Validate ECO (advance to next stage without approval)
     */
    async validateECO(token: string, ecoId: string): Promise<{ eco: ECO }> {
        return this.request(`/api/ecos/${ecoId}/validate`, token, {
            method: 'POST',
        });
    }

    /**
     * Apply ECO
     */
    async applyECO(token: string, ecoId: string): Promise<any> {
        return this.request(`/api/ecos/${ecoId}/apply`, token, {
            method: 'POST',
        });
    }

    /**
     * Get ECO Statistics (count by stage)
     */
    async getECOStatistics(token: string): Promise<{ statistics: { stageName: string; count: number }[] }> {
        return this.request('/api/ecos/statistics', token);
    }
}

export const ecoService = new ECOService(API_BASE_URL);
