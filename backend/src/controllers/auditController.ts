import { Response } from 'express';
import { auditService } from '../service/auditService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const {
            entity,
            entityId,
            userId,
            limit,
            offset,
        } = req.query;

        const filters: {
            entity?: string;
            entityId?: string;
            userId?: string;
            limit?: number;
            offset?: number;
        } = {};

        if (entity) filters.entity = entity as string;
        if (entityId) filters.entityId = entityId as string;
        if (userId) filters.userId = userId as string;
        if (limit) filters.limit = parseInt(limit as string);
        if (offset) filters.offset = parseInt(offset as string);

        const result = await auditService.getAuditLogs(filters);
        res.json(result);
    } catch (error: any) {
        console.error('Get audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
};

export const getCCRAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.ccrId;
        if (!id || Array.isArray(id)) {
            return res.status(400).json({ error: 'CCR ID is required' });
        }
        const result = await auditService.getAuditLogsByCCR(id as string);
        res.json(result);
    } catch (error: any) {
        console.error('Get CCR audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch CCR audit logs' });
    }
};

export const getEntityAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { entity, entityId } = req.params;
        if (!entity || !entityId || Array.isArray(entity) || Array.isArray(entityId)) {
            return res.status(400).json({ error: 'Entity type and ID are required' });
        }
        const result = await auditService.getAuditLogsByEntity(entity as string, entityId as string);
        res.json(result);
    } catch (error: any) {
        console.error('Get entity audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch entity audit logs' });
    }
};
