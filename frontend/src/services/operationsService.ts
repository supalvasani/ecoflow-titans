
const API_URL = 'http://localhost:5000/api';

export interface OperationsTask {
    id: string;
    ecoId: string;
    title: string;
    description: string | null;
    status: 'PENDING' | 'COMPLETED';
    createdAt: string;
    completedAt: string | null;
    eco: {
        title: string;
        type: string;
        createdById: string;
    };
}

export const operationsService = {
    getTasks: async (token: string): Promise<OperationsTask[]> => {
        const response = await fetch(`${API_URL}/operations`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch operations tasks');
        }

        return response.json();
    },

    completeTask: async (token: string, taskId: string): Promise<OperationsTask> => {
        const response = await fetch(`${API_URL}/operations/${taskId}/complete`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to complete task');
        }

        return response.json();
    }
};
