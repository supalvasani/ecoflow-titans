import type { Product, ProductVersion, ProductAttachment, CreateProductDTO } from '../types/product';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ProductService {
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
     * Get all products (with optional archived filter)
     */
    async getProducts(token: string, includeArchived: boolean = false): Promise<{ products: Product[] }> {
        return this.request(`/api/products?includeArchived=${includeArchived}`, token);
    }

    /**
     * Get product by ID
     */
    async getProductById(token: string, id: string): Promise<{ product: Product }> {
        return this.request(`/api/products/${id}`, token);
    }

    /**
     * Create a new product
     */
    async createProduct(token: string, data: CreateProductDTO): Promise<{ product: Product }> {
        return this.request('/api/products', token, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Get product versions
     */
    async getProductVersions(token: string, id: string): Promise<{ versions: ProductVersion[] }> {
        return this.request(`/api/products/${id}/versions`, token);
    }

    /**
     * Get active version
     */
    async getActiveVersion(token: string, id: string): Promise<{ version: ProductVersion }> {
        return this.request(`/api/products/${id}/active`, token);
    }

    /**
     * Get attachments for a version
     */
    async getAttachments(token: string, productId: string, versionId: string): Promise<{ attachments: ProductAttachment[] }> {
        // Note: The backend route is /api/products/{id}/versions/{versionId}/attachments
        return this.request(`/api/products/${productId}/versions/${versionId}/attachments`, token);
    }
}

export const productService = new ProductService(API_BASE_URL);
