import { Request, Response } from 'express';
import { bomService } from '../service/bomService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { db } from '../libs/prisma.js';

/**
 * @swagger
 * /api/boms:
 *   post:
 *     summary: Create a new BOM for a product
 *     tags: [BOMs]
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
 *             properties:
 *               productId:
 *                 type: string
 *                 example: "product-uuid-here"
 *     responses:
 *       201:
 *         description: BOM created successfully
 *       403:
 *         description: Forbidden - requires ENGINEERING_USER or ADMIN role
 */
export const createBOM = async (req: AuthRequest, res: Response) => {
    try {
        const { productId } = req.body;
        const userId = req.user!.userId;

        const bom = await bomService.createBOM(productId, userId);
        res.status(201).json({
            message: 'BOM created successfully',
            bom,
        });
    } catch (error: any) {
        console.error('Create BOM error:', error);
        res.status(400).json({ error: error.message || 'Failed to create BOM' });
    }
};

/**
 * @swagger
 * /api/boms:
 *   get:
 *     summary: Get all BOMs with active versions
 *     tags: [BOMs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeArchived
 *         schema:
 *           type: boolean
 *         description: Include archived versions (not available for OPERATIONS_USER)
 *     responses:
 *       200:
 *         description: List of BOMs
 */
export const getBOMs = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const includeArchived = req.query.includeArchived === 'true';

        const boms = await bomService.getBOMs(userRole, includeArchived);
        res.json({ boms });
    } catch (error: any) {
        console.error('Get BOMs error:', error);
        res.status(500).json({ error: 'Failed to fetch BOMs' });
    }
};

/**
 * @swagger
 * /api/boms/{id}:
 *   get:
 *     summary: Get BOM by ID with version history
 *     tags: [BOMs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: BOM ID
 *     responses:
 *       200:
 *         description: BOM details
 *       404:
 *         description: BOM not found
 */
export const getBOMById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const bom = await bomService.getBOMById(id as string, userRole);
        res.json({ bom });
    } catch (error: any) {
        if (error.message === 'BOM not found') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get BOM error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM' });
    }
};

/**
 * @swagger
 * /api/boms/{id}/versions:
 *   get:
 *     summary: Get all versions of a BOM
 *     tags: [BOMs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: BOM ID
 *     responses:
 *       200:
 *         description: BOM version history
 */
export const getBOMVersions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const versions = await bomService.getBOMVersions(id as string);
        res.json({ versions });
    } catch (error: any) {
        console.error('Get BOM versions error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM versions' });
    }
};

/**
 * @swagger
 * /api/boms/{id}/active:
 *   get:
 *     summary: Get active version of a BOM
 *     tags: [BOMs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: BOM ID
 *     responses:
 *       200:
 *         description: Active BOM version
 *       404:
 *         description: No active version found
 */
export const getActiveVersion = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const version = await bomService.getActiveBOMVersion(id as string);
        res.json({ version });
    } catch (error: any) {
        if (error.message === 'No active version found for this BOM') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get active BOM version error:', error);
        res.status(500).json({ error: 'Failed to fetch active version' });
    }
};

/**
 * @swagger
 * /api/boms/versions/{versionId}:
 *   get:
 *     summary: Get BOM version by version ID
 *     tags: [BOMs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *         description: BOM Version ID
 *     responses:
 *       200:
 *         description: BOM version details with components and operations
 *       404:
 *         description: BOM version not found
 */
export const getBOMVersionById = async (req: AuthRequest, res: Response) => {
    try {
        const { versionId } = req.params;

        const version = await db.bOMVersion.findUnique({
            where: { id: versionId as string },
            include: {
                productVersion: true,
                components: {
                    include: {
                        componentVersion: {
                            include: {
                                product: true,
                            },
                        },
                    },
                },
                operations: true,
            },
        });

        if (!version) {
            return res.status(404).json({ error: 'BOM version not found' });
        }

        res.json({ version });
    } catch (error: any) {
        console.error('Get BOM version error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM version' });
    }
};

/**
 * @swagger
 * /api/boms/{id}/versions/{versionId}/components:
 *   get:
 *     summary: Get components for a BOM version
 *     tags: [BOMs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of BOM components
 */
export const getBOMComponents = async (req: AuthRequest, res: Response) => {
    try {
        const { versionId } = req.params;
        const components = await bomService.getBOMComponents(versionId as string);
        res.json({ components });
    } catch (error: any) {
        console.error('Get BOM components error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM components' });
    }
};

/**
 * @swagger
 * /api/boms/{id}/versions/{versionId}/operations:
 *   get:
 *     summary: Get operations for a BOM version
 *     tags: [BOMs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of BOM operations
 */
export const getBOMOperations = async (req: AuthRequest, res: Response) => {
    try {
        const { versionId } = req.params;
        const operations = await bomService.getBOMOperations(versionId as string);
        res.json({ operations });
    } catch (error: any) {
        console.error('Get BOM operations error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM operations' });
    }
};
