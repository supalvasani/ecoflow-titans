import { Response } from 'express';
import { settingsService } from '../service/settingsService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

/**
 * @swagger
 * /api/settings/stages:
 *   get:
 *     summary: Retrieve ECO workflow stages
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of workflow stages
 */
export const getStages = async (req: AuthRequest, res: Response) => {
    try {
        const stages = await settingsService.getStages();
        res.json({ stages });
    } catch (error: any) {
        console.error('Get stages error:', error);
        res.status(500).json({ error: 'Failed to fetch stages' });
    }
};

/**
 * @swagger
 * /api/settings/stages:
 *   post:
 *     summary: Update ECO workflow stages (admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stages
 *             properties:
 *               stages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     stageId:
 *                       type: string
 *                     name:
 *                       type: string
 *                     order:
 *                       type: number
 *                     canEditDraft:
 *                       type: boolean
 *                     requiresApproval:
 *                       type: boolean
 *     responses:
 *       200:
 *         description: Stages updated successfully
 */
export const updateStages = async (req: AuthRequest, res: Response) => {
    try {
        const { stages } = req.body;

        if (!stages || !Array.isArray(stages)) {
            return res.status(400).json({ error: 'Stages array is required' });
        }

        const updatedStages = await settingsService.updateStages(stages);
        res.json({
            message: 'Stages updated successfully',
            stages: updatedStages,
        });
    } catch (error: any) {
        console.error('Update stages error:', error);
        res.status(400).json({ error: error.message || 'Failed to update stages' });
    }
};

/**
 * @swagger
 * /api/settings/approval-rules:
 *   get:
 *     summary: Retrieve approval rules
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Approval rules configuration
 */
export const getApprovalRules = async (req: AuthRequest, res: Response) => {
    try {
        const rules = await settingsService.getApprovalRules();
        res.json(rules);
    } catch (error: any) {
        console.error('Get approval rules error:', error);
        res.status(500).json({ error: 'Failed to fetch approval rules' });
    }
};

/**
 * @swagger
 * /api/settings/approval-rules:
 *   post:
 *     summary: Update approval rules (admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rules
 *               - requiresApprovalStages
 *             properties:
 *               rules:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                     canApprove:
 *                       type: boolean
 *                     canReject:
 *                       type: boolean
 *               requiresApprovalStages:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Approval rules updated successfully
 */
export const updateApprovalRules = async (req: AuthRequest, res: Response) => {
    try {
        const rules = req.body;

        if (!rules.rules || !Array.isArray(rules.rules)) {
            return res.status(400).json({ error: 'Rules array is required' });
        }

        const result = await settingsService.updateApprovalRules(rules);
        res.json(result);
    } catch (error: any) {
        console.error('Update approval rules error:', error);
        res.status(400).json({ error: error.message || 'Failed to update approval rules' });
    }
};
