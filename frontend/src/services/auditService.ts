import type { AuditLog } from '../types/eco';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class AuditService {
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
     * Get all audit logs with optional filtering
     */
    async getAuditLogs(
        token: string,
        filters?: {
            entity?: string;
            entityId?: string;
            userId?: string;
            limit?: number;
            offset?: number;
        }
    ): Promise<{ logs: AuditLog[]; total: number }> {
        const query = new URLSearchParams();
        if (filters?.entity) query.append('entity', filters.entity);
        if (filters?.entityId) query.append('entityId', filters.entityId);
        if (filters?.userId) query.append('userId', filters.userId);
        if (filters?.limit) query.append('limit', filters.limit.toString());
        if (filters?.offset) query.append('offset', filters.offset.toString());

        return this.request(`/api/audit?${query.toString()}`, token);
    }

    /**
     * Get audit logs for a specific ECO
     */
    async getECOAuditLogs(token: string, ecoId: string): Promise<{ logs: AuditLog[] }> {
        return this.request(`/api/audit?entity=ECO&entityId=${ecoId}`, token);
    }

    /**
     * Get audit logs for a specific Product
     */
    async getProductAuditLogs(token: string, productId: string): Promise<{ logs: AuditLog[] }> {
        return this.request(`/api/audit?entity=Product&entityId=${productId}`, token);
    }
}

export const auditService = new AuditService(API_BASE_URL);
