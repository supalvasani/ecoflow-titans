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
            // Try to parse error as JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    const error = await response.json();
                    throw new Error(error.error || `API request failed with status ${response.status}`);
                } catch (e) {
                    throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
                }
            } else {
                // Non-JSON response (likely HTML error page)
                const text = await response.text();
                console.error('Non-JSON response received:', text.substring(0, 200));

                // Provide helpful error message for 404
                if (response.status === 404) {
                    throw new Error('Audit log API endpoint not found. The backend may not have audit logging implemented yet.');
                }

                throw new Error(`Server error: Expected JSON but received ${contentType || 'unknown content type'}. Status: ${response.status}`);
            }
        }

        // Verify response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON success response:', text.substring(0, 200));
            throw new Error(`Server error: Expected JSON but received ${contentType || 'unknown content type'}`);
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
