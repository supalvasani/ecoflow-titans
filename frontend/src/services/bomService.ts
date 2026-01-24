import type { BOM, BOMVersion } from '../types/bom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class BOMService {
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
     * Get BOM by Product ID
     */
    async getBOMByProductId(token: string, productId: string): Promise<{ bom: BOM }> {
        return this.request(`/api/boms?productId=${productId}`, token);
    }

    /**
     * Get BOM Version structure (components and operations)
     */
    async getBOMStructure(token: string, bomVersionId: string): Promise<{ version: BOMVersion }> {
        return this.request(`/api/boms/versions/${bomVersionId}`, token);
    }

    /**
     * Get Active BOM Version for a Product
     */
    async getActiveBOM(token: string, productId: string): Promise<{ version: BOMVersion }> {
        // We first get the BOM container, then we find the active version manually or via backend helper
        // Assuming backend has a helper or we filter on frontend.
        // Let's assume we query the BOM by product ID and backend allows expanding active version
        // Actually, let's implement a specific endpoint if needed, but for now reuse getBOMByProductId logic or structure endpoint.
        // Let's assume /api/boms?productId=XYZ&active=true returns the active structure.
        return this.request(`/api/boms/active?productId=${productId}`, token);
    }
}

export const bomService = new BOMService(API_BASE_URL);
