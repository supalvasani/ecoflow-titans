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
            // Try to parse error as JSON, but handle cases where it's not
            try {
                const error = await response.json();
                throw new Error(error.error || `API request failed with status ${response.status}`);
            } catch (e) {
                // If response is not JSON, throw a generic error
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }
        }

        return response.json();
    }

    /**
     * Get all BOMs
     */
    async getBOMs(token: string, includeArchived: boolean = false): Promise<{ boms: BOM[] }> {
        return this.request(`/api/boms?includeArchived=${includeArchived}`, token);
    }

    /**
     * Get BOM by ID
     */
    async getBOMById(token: string, bomId: string): Promise<{ bom: BOM }> {
        console.log('getBOMById called with bomId:', bomId);
        console.log('API endpoint:', `/api/boms/${bomId}`);
        return this.request(`/api/boms/${bomId}`, token);
    }

    /**
     * Get BOM by Product ID
     */
    async getBOMByProductId(token: string, productId: string): Promise<{ bom: BOM }> {
        // Backend doesn't support filtering by productId, so fetch all and filter
        const { boms } = await this.getBOMs(token, true);
        const bom = boms.find(b => b.productId === productId);

        if (!bom) {
            throw new Error('BOM not found for this product');
        }

        return { bom };
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
        // First get the BOM for this product
        const { bom } = await this.getBOMByProductId(token, productId);

        // Then get the active version
        return this.request(`/api/boms/${bom.id}/active`, token);
    }
}

export const bomService = new BOMService(API_BASE_URL);
