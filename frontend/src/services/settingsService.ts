const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface ECOStage {
    id: string;
    name: string;
    sequence: number;
    requiresApproval: boolean;
    isFinal: boolean;
}

export interface ApprovalRule {
    role: string;
    canApprove: boolean;
    canReject: boolean;
}

export interface ApprovalRules {
    rules: ApprovalRule[];
    requiresApprovalStages: string[];
}

class SettingsService {
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
     * Get all ECO workflow stages
     */
    async getStages(token: string): Promise<{ stages: ECOStage[] }> {
        return this.request('/api/settings/stages', token);
    }

    /**
     * Update ECO workflow stages (admin only)
     */
    async updateStages(token: string, stages: Partial<ECOStage>[]): Promise<{ message: string; stages: ECOStage[] }> {
        return this.request('/api/settings/stages', token, {
            method: 'POST',
            body: JSON.stringify({ stages }),
        });
    }

    /**
     * Get approval rules configuration
     */
    async getApprovalRules(token: string): Promise<ApprovalRules> {
        return this.request('/api/settings/approval-rules', token);
    }

    /**
     * Update approval rules (admin only)
     */
    async updateApprovalRules(token: string, rules: ApprovalRules): Promise<{ message: string; rules: ApprovalRules }> {
        return this.request('/api/settings/approval-rules', token, {
            method: 'POST',
            body: JSON.stringify(rules),
        });
    }
}

export const settingsService = new SettingsService(API_BASE_URL);
