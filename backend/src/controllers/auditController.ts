import { Response } from 'express';
import { auditService } from '../service/auditService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

/**
 * @swagger
 * /api/audit:
 *   get:
 *     summary: Retrieve audit logs with optional filtering
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entity
 *         schema:
 *           type: string
 *         description: Filter by entity type (e.g., ECO, Product, BOM)
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *         description: Filter by entity ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of logs to skip
 *     responses:
 *       200:
 *         description: List of audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 offset:
 *                   type: integer
 */
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

/**
 * @swagger
 * /api/audit/eco/{ecoId}:
 *   get:
 *     summary: Get audit logs for a specific ECO
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ecoId
 *         required: true
 *         schema:
 *           type: string
 *         description: ECO ID
 *     responses:
 *       200:
 *         description: List of audit logs for the ECO
 */
export const getECOAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { ecoId } = req.params;
        if (!ecoId || Array.isArray(ecoId)) {
            return res.status(400).json({ error: 'ECO ID is required' });
        }
        const result = await auditService.getAuditLogsByECO(ecoId);
        res.json(result);
    } catch (error: any) {
        console.error('Get ECO audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch ECO audit logs' });
    }
};

/**
 * @swagger
 * /api/audit/entity/{entity}/{entityId}:
 *   get:
 *     summary: Get audit logs for a specific entity
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entity
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity type (e.g., Product, BOM)
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Entity ID
 *     responses:
 *       200:
 *         description: List of audit logs for the entity
 */
export const getEntityAuditLogs = async (req: AuthRequest, res: Response) => {
    try {
        const { entity, entityId } = req.params;
        if (!entity || !entityId || Array.isArray(entity) || Array.isArray(entityId)) {
            return res.status(400).json({ error: 'Entity type and ID are required' });
        }
        const result = await auditService.getAuditLogsByEntity(entity, entityId);
        res.json(result);
    } catch (error: any) {
        console.error('Get entity audit logs error:', error);
        res.status(500).json({ error: 'Failed to fetch entity audit logs' });
    }
};
