const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ReportService {
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
            try {
                const error = await response.json();
                throw new Error(error.error || `API request failed with status ${response.status}`);
            } catch (_e) {
                throw new Error(`API request failed with status ${response.status}: ${(response as any).statusText}`);
            }
        }

        return response.json();
    }

    async getCCRHistory(token: string): Promise<{ history: any[] }> {
        return this.request('/api/reports/ccr-history', token);
    }

    async getCatalogItemVersions(token: string, catalogItemId?: string): Promise<{ versions: any[] }> {
        const query = catalogItemId ? `?catalogItemId=${catalogItemId}` : '';
        return this.request(`/api/reports/catalog-item-versions${query}`, token);
    }

    async getVariantSetHistory(token: string, variantSetId?: string): Promise<{ history: any[] }> {
        const query = variantSetId ? `?variantSetId=${variantSetId}` : '';
        return this.request(`/api/reports/variant-set-history${query}`, token);
    }

    async getArchivedCatalogItems(token: string): Promise<{ archived: any[] }> {
        return this.request('/api/reports/archived-catalog-items', token);
    }

    async getActiveMatrix(token: string): Promise<{ catalogItems: any[]; variantSets: any[]; timestamp: string }> {
        return this.request('/api/reports/active-matrix', token);
    }
}

export const reportService = new ReportService(API_BASE_URL);
