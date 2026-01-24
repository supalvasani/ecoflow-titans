import { Response } from 'express';
import { ecoService } from '../service/ecoService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { ECOType } from '@prisma/client';

/**
 * @swagger
 * /api/ecos/product:
 *   post:
 *     summary: Create a new ECO for a product
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - title
 *             properties:
 *               productId:
 *                 type: string
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: ECO created successfully
 */
export const createProductECO = async (req: AuthRequest, res: Response) => {
    try {
        const { productId, title } = req.body;
        const userId = req.user!.userId;

        const eco = await ecoService.createProductECO(productId, title, userId);
        res.status(201).json({
            message: 'Product ECO created successfully',
            eco,
        });
    } catch (error: any) {
        console.error('Create product ECO error:', error);
        res.status(400).json({ error: error.message || 'Failed to create product ECO' });
    }
};

/**
 * @swagger
 * /api/ecos/bom:
 *   post:
 *     summary: Create a new ECO for a BOM
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bomId
 *               - title
 *             properties:
 *               bomId:
 *                 type: string
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: ECO created successfully
 */
export const createBOMECO = async (req: AuthRequest, res: Response) => {
    try {
        const { bomId, title } = req.body;
        const userId = req.user!.userId;

        const eco = await ecoService.createBOMECO(bomId, title, userId);
        res.status(201).json({
            message: 'BOM ECO created successfully',
            eco,
        });
    } catch (error: any) {
        console.error('Create BOM ECO error:', error);
        res.status(400).json({ error: error.message || 'Failed to create BOM ECO' });
    }
};

/**
 * @swagger
 * /api/ecos:
 *   get:
 *     summary: Get all ECOs
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PRODUCT, BOM]
 *       - in: query
 *         name: stageId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of ECOs
 */
export const getECOs = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const filters = {
            type: req.query.type as ECOType | undefined,
            stageId: req.query.stageId as string | undefined,
        };

        const ecos = await ecoService.getECOs(userRole, filters);
        res.json({ ecos });
    } catch (error: any) {
        console.error('Get ECOs error:', error);
        res.status(500).json({ error: 'Failed to fetch ECOs' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}:
 *   get:
 *     summary: Get ECO by ID
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ECO details
 */
export const getECOById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const eco = await ecoService.getECOById(id as string, userRole);
        res.json({ eco });
    } catch (error: any) {
        if (error.message === 'ECO not found') {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Get ECO error:', error);
        res.status(500).json({ error: 'Failed to fetch ECO' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/draft/product:
 *   patch:
 *     summary: Update product draft
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               salePrice:
 *                 type: number
 *               costPrice:
 *                 type: number
 *     responses:
 *       200:
 *         description: Draft updated
 */
export const updateProductDraft = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const changes = req.body;
        const userId = req.user!.userId;

        const draft = await ecoService.updateProductDraft(id as string, changes, userId);
        res.json({
            message: 'Product draft updated successfully',
            draft,
        });
    } catch (error: any) {
        console.error('Update product draft error:', error);
        res.status(400).json({ error: error.message || 'Failed to update product draft' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/draft/bom:
 *   patch:
 *     summary: Update BOM draft
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               components:
 *                 type: array
 *                 items:
 *                   type: object
 *               operations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Draft updated
 */
export const updateBOMDraft = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { components = [], operations = [] } = req.body;
        const userId = req.user!.userId;

        const draft = await ecoService.updateBOMDraft(id as string, components, operations, userId);
        res.json({
            message: 'BOM draft updated successfully',
            draft,
        });
    } catch (error: any) {
        console.error('Update BOM draft error:', error);
        res.status(400).json({ error: error.message || 'Failed to update BOM draft' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/draft/attachments:
 *   post:
 *     summary: Add draft attachment
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filename
 *               - url
 *               - action
 *             properties:
 *               filename:
 *                 type: string
 *               url:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [ADD, DELETE]
 *     responses:
 *       201:
 *         description: Attachment added
 */
export const addDraftAttachment = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { filename, url, action } = req.body;
        const userId = req.user!.userId;

        const attachment = await ecoService.addDraftAttachment(id as string, filename, url, action, userId);
        res.status(201).json({
            message: 'Draft attachment added successfully',
            attachment,
        });
    } catch (error: any) {
        console.error('Add draft attachment error:', error);
        res.status(400).json({ error: error.message || 'Failed to add draft attachment' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/submit:
 *   post:
 *     summary: Submit ECO for review
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ECO submitted for review
 */
export const submitForReview = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const eco = await ecoService.submitForReview(id as string, userId);
        res.json({
            message: 'ECO submitted for review successfully',
            eco,
        });
    } catch (error: any) {
        console.error('Submit for review error:', error);
        res.status(400).json({ error: error.message || 'Failed to submit ECO for review' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/approve:
 *   post:
 *     summary: Approve ECO
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ECO approved
 */
export const approveECO = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const eco = await ecoService.approveECO(id as string, userId, userRole);
        res.json({
            message: 'ECO approved successfully',
            eco,
        });
    } catch (error: any) {
        console.error('Approve ECO error:', error);
        res.status(400).json({ error: error.message || 'Failed to approve ECO' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/reject:
 *   post:
 *     summary: Reject ECO
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: ECO rejected
 */
export const rejectECO = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        const eco = await ecoService.rejectECO(id as string, userId, reason, userRole);
        res.json({
            message: 'ECO rejected successfully',
            eco,
        });
    } catch (error: any) {
        console.error('Reject ECO error:', error);
        res.status(400).json({ error: error.message || 'Failed to reject ECO' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/apply:
 *   post:
 *     summary: Apply ECO (creates new version)
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: ECO applied, new version created
 */
export const applyECO = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const result = await ecoService.applyECO(id as string, userId);
        res.json({
            message: 'ECO applied successfully. New version created.',
            eco: result.eco,
            newVersion: result.newVersion,
        });
    } catch (error: any) {
        console.error('Apply ECO error:', error);
        res.status(400).json({ error: error.message || 'Failed to apply ECO' });
    }
};
