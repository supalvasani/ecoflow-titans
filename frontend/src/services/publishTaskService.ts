const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface PublishTask {
    id: string;
    ccrId: string;
    title: string;
    description: string | null;
    status: 'PENDING' | 'COMPLETED';
    createdAt: string;
    completedAt: string | null;
    ccr?: {
        title: string;
        type: string;
        createdById: string;
    };
}

export const publishTaskService = {
    getTasks: async (token: string): Promise<PublishTask[]> => {
        const response = await fetch(`${API_BASE_URL}/api/publish-tasks/tasks`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch publish execution tasks');
        }

        const data = await response.json();
        return Array.isArray(data) ? data : data.tasks || [];
    },

    completeTask: async (token: string, taskId: string): Promise<PublishTask> => {
        const response = await fetch(`${API_BASE_URL}/api/publish-tasks/tasks/${taskId}/complete`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to complete publish execution task');
        }

        return response.json();
    },
};
