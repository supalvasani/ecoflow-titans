import { Response } from 'express';
import { ecoService } from '../service/ecoService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { ECOType } from '../db/schema.js';

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
/**
 * @swagger
 * /api/ecos/create:
 *   post:
 *     summary: Create a new ECO (Unified)
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
 *               - title
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [PRODUCT, BOM, BOM_CHANGE]
 *               assigneeId:
 *                 type: string
 *               effectiveDate:
 *                 type: string
 *                 format: date
 *               versionUpdate:
 *                 type: boolean
 *               productId:
 *                 type: string
 *               bomId:
 *                 type: string
 *     responses:
 *       201:
 *         description: ECO created successfully
 */
export const createECO = async (req: AuthRequest, res: Response) => {
    try {
        const { title, type, assigneeId, effectiveDate, versionUpdate, productId, bomId, initialChanges } = req.body;
        const userId = req.user!.userId;

        // Convert effectiveDate to Date object if present
        const dateObj = effectiveDate ? new Date(effectiveDate) : undefined;

        const eco = await ecoService.createECO({
            title,
            type: type as ECOType,
            createdById: userId,
            ...(assigneeId ? { assigneeId } : {}),
            ...(dateObj ? { effectiveDate: dateObj } : {}),
            ...(versionUpdate !== undefined ? { versionUpdate } : {}),
            ...(productId ? { productId } : {}),
            ...(bomId ? { bomId } : {}),
            initialChanges
        });

        res.status(201).json({
            message: 'ECO created successfully',
            eco,
        });
    } catch (error: any) {
        console.error('Create ECO error:', error);
        res.status(400).json({ error: error.message || 'Failed to create ECO' });
    }
};

export const createProductECO = async (req: AuthRequest, res: Response) => {
    try {
        const { productId, title, name, salePrice, costPrice } = req.body;
        const userId = req.user!.userId;
        const initialChanges = { name, salePrice, costPrice };

        const eco = await ecoService.createECO({
            title,
            type: ECOType.PRODUCT,
            createdById: userId,
            productId,
            initialChanges
        });

        res.status(201).json({ message: 'Product ECO created successfully', eco });
    } catch (error: any) {
        res.status(400).json({ error: error.message || 'Failed to create product ECO' });
    }
};

export const createBOMECO = async (req: AuthRequest, res: Response) => {
    try {
        const { bomId, title, notes, components } = req.body;
        const userId = req.user!.userId;
        const initialChanges = { notes, components };

        const eco = await ecoService.createECO({
            title,
            type: ECOType.BOM,
            createdById: userId,
            bomId,
            initialChanges
        });

        res.status(201).json({ message: 'BOM ECO created successfully', eco });
    } catch (error: any) {
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
    console.log('[DEBUG] getECOs - Request received');
    try {
        const userRole = req.user!.role;
        console.log('[DEBUG] getECOs - User Role:', userRole);

        const filters: { type?: ECOType; stageId?: string } = {};
        if (req.query.type) {
            filters.type = req.query.type as ECOType;
        }
        if (req.query.stageId) {
            filters.stageId = req.query.stageId as string;
        }
        console.log('[DEBUG] getECOs - Filters:', filters);

        console.log('[DEBUG] getECOs - Calling service...');
        const ecos = await ecoService.getECOs(userRole, filters);
        console.log(`[DEBUG] getECOs - Service returned ${ecos.length} ECOs`);

        res.json({ ecos });
    } catch (error: any) {
        console.error('[DEBUG] Get ECOs error - Full Error:', error);
        console.error('[DEBUG] Get ECOs error - Stack:', error.stack);
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
 * /api/ecos/{id}/validate:
 *   post:
 *     summary: Validate ECO (advance stage without approval)
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
 *         description: ECO validated and advanced
 */
export const validateECO = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const eco = await ecoService.advanceStage(id as string, userId);
        res.json({
            message: 'ECO validated and advanced to next stage successfully',
            eco,
        });
    } catch (error: any) {
        console.error('Validate ECO error:', error);
        res.status(400).json({ error: error.message || 'Failed to validate ECO' });
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
        if (error.message.includes('Only approvers') || error.message.includes('Forbidden') || error.message.includes('Access denied')) {
            return res.status(403).json({ error: error.message });
        }
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

/**
 * @swagger
 * /api/ecos/statistics:
 *   get:
 *     summary: Get ECO statistics (count by stage)
 *     tags: [ECOs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: ECO statistics by stage
 */
export const getECOStatistics = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const statistics = await ecoService.getECOStatistics(userRole);
        res.json({ statistics });
    } catch (error: any) {
        console.error('Get ECO statistics error:', error);
        res.status(500).json({ error: 'Failed to fetch ECO statistics' });
    }
};

/**
 * @swagger
 * /api/ecos/{id}/mandatory-approval:
 *   patch:
 *     summary: Set mandatory approval flag (Admin only)
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
 *               - mandatoryApproval
 *             properties:
 *               mandatoryApproval:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Mandatory approval flag updated
 *       403:
 *         description: Only admins can update this flag
 */
export const setMandatoryApproval = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { mandatoryApproval } = req.body;
        const userId = req.user!.userId;
        const userRole = req.user!.role;

        if (typeof mandatoryApproval !== 'boolean') {
            return res.status(400).json({ error: 'mandatoryApproval must be a boolean' });
        }

        const eco = await ecoService.setMandatoryApproval(id as string, mandatoryApproval, userId, userRole);
        res.json({
            message: 'Mandatory approval flag updated successfully',
            eco,
        });
    } catch (error: any) {
        if (error.message.includes('Only admins')) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Set mandatory approval error:', error);
        res.status(400).json({ error: error.message || 'Failed to update mandatory approval flag' });
    }
};

