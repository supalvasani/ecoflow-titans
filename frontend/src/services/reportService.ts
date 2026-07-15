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
            } catch (e) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }
        }

        return response.json();
    }

    async getECOHistory(token: string): Promise<{ history: any[] }> {
        return this.request('/api/reports/eco-history', token);
    }

    async getProductVersions(token: string, productId?: string): Promise<{ versions: any[] }> {
        const query = productId ? `?productId=${productId}` : '';
        return this.request(`/api/reports/product-versions${query}`, token);
    }

    async getBOMHistory(token: string, bomId?: string): Promise<{ history: any[] }> {
        const query = bomId ? `?bomId=${bomId}` : '';
        return this.request(`/api/reports/bom-history${query}`, token);
    }

    async getArchivedProducts(token: string): Promise<{ archived: any[] }> {
        return this.request('/api/reports/archived-products', token);
    }

    async getActiveMatrix(token: string): Promise<{ products: any[]; boms: any[]; timestamp: string }> {
        return this.request('/api/reports/active-matrix', token);
    }
}

export const reportService = new ReportService(API_BASE_URL);
