import type { CatalogChangeRequest, CreateCCRDTO } from '../types/ccr';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class CCRService {
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
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || error.message || 'API request failed');
        }

        return response.json();
    }

    async getCCRs(token: string, filters?: { type?: string; stageId?: string }): Promise<{ ccrs: CatalogChangeRequest[] }> {
        const params = new URLSearchParams();
        if (filters?.type) params.append('type', filters.type);
        if (filters?.stageId) params.append('stageId', filters.stageId);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/api/ccrs${query}`, token);
    }

    async getCCRById(token: string, id: string): Promise<{ ccr: CatalogChangeRequest }> {
        return this.request(`/api/ccrs/${id}`, token);
    }

    async createCCR(token: string, data: CreateCCRDTO): Promise<{ ccr: CatalogChangeRequest }> {
        return this.request('/api/ccrs/create', token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async updateDraft(token: string, id: string, changes: any): Promise<{ ccr: CatalogChangeRequest }> {
        return this.request(`/api/ccrs/${id}/draft`, token, {
            method: 'PATCH',
            body: JSON.stringify(changes),
        });
    }

    async addDraftContent(
        token: string,
        id: string,
        data: { filename: string; url: string; action: string; locale?: string; contentType?: string; approved?: boolean }
    ): Promise<{ content: any }> {
        return this.request(`/api/ccrs/${id}/draft/content`, token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async submitForReview(token: string, id: string): Promise<{ ccr: CatalogChangeRequest }> {
        return this.request(`/api/ccrs/${id}/submit`, token, {
            method: 'POST',
        });
    }

    async validateCCR(token: string, id: string): Promise<{
        valid: boolean;
        promotionConflictFlag: boolean;
        promotionConflictDetail: string | null;
        warnings: string[];
    }> {
        return this.request(`/api/ccrs/${id}/validate`, token, {
            method: 'POST',
        });
    }

    async approveCCR(token: string, id: string, comment?: string): Promise<{ ccr: CatalogChangeRequest }> {
        return this.request(`/api/ccrs/${id}/approve`, token, {
            method: 'POST',
            body: JSON.stringify({ comment }),
        });
    }

    async rejectCCR(token: string, id: string, reason: string): Promise<{ ccr: CatalogChangeRequest }> {
        return this.request(`/api/ccrs/${id}/reject`, token, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    async applyCCR(token: string, id: string): Promise<{ ccr: CatalogChangeRequest; newVersion: any }> {
        return this.request(`/api/ccrs/${id}/apply`, token, {
            method: 'POST',
        });
    }

    async previewDiff(token: string, id: string): Promise<{ diff: any }> {
        return this.request(`/api/ccrs/${id}/diff`, token);
    }

    async getCCRStatistics(token: string): Promise<{ statistics: any }> {
        return this.request('/api/ccrs/statistics', token);
    }

    async setMandatoryApproval(token: string, id: string, mandatoryApproval: boolean): Promise<{ ccr: CatalogChangeRequest }> {
        return this.request(`/api/ccrs/${id}/mandatory-approval`, token, {
            method: 'PATCH',
            body: JSON.stringify({ mandatoryApproval }),
        });
    }
}

export const ccrService = new CCRService(API_BASE_URL);
