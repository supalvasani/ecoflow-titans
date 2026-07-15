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
            let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
            try {
                const error = await response.json();
                errorMessage = error.error || error.message || errorMessage;
            } catch {
                try {
                    const text = await response.text();
                    if (text) errorMessage = text;
                } catch {
                    // Fallback to initial HTTP status error message
                }
            }
            throw new Error(errorMessage);
        }

        return response.json();
    }

    /**
     * Create Product ECO
     */
    /**
     * Create Unified ECO
     */
    async createECO(token: string, data: any): Promise<{ eco: ECO }> {
        return this.request<{ eco: ECO }>('/api/ecos', token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Create Product ECO (Legacy)
     */
    async createProductECO(token: string, productId: string, title: string): Promise<string> {
        return (await this.createECO(token, { title, type: 'PRODUCT', productId })).eco.id;
    }

    /**
     * Create BOM ECO (Legacy)
     */
    async createBOMECO(token: string, bomId: string, title: string): Promise<string> {
        return (await this.createECO(token, { title, type: 'BOM', bomId })).eco.id;
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
     * Update ECO Draft (Unified)
     */
    async updateDraft(token: string, ecoId: string, changes: any): Promise<any> {
        return this.request(`/api/ecos/${ecoId}/draft`, token, {
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
     * Set mandatory approval flag (Admin only)
     */
    async setMandatoryApproval(token: string, ecoId: string, mandatoryApproval: boolean): Promise<{ eco: ECO }> {
        return this.request(`/api/ecos/${ecoId}/mandatory-approval`, token, {
            method: 'PATCH',
            body: JSON.stringify({ mandatoryApproval }),
        });
    }

    /**
     * Add Draft Attachment
     */
    async addDraftAttachment(token: string, ecoId: string, filename: string, url: string, action: string): Promise<any> {
        return this.request(`/api/ecos/${ecoId}/draft/attachments`, token, {
            method: 'POST',
            body: JSON.stringify({ filename, url, action }),
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
