import { Response } from 'express';
import { reportService } from '../service/reportService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

/**
 * @swagger
 * /api/reports/eco-history:
 *   get:
 *     summary: Get ECO change history with filters
 *     tags: [Reports]
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
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: ECO audit trail
 */
export const getECOHistory = async (req: AuthRequest, res: Response) => {
    try {
        const filters: any = {};

        if (req.query.type) {
            filters.type = req.query.type;
        }
        if (req.query.stageId) {
            filters.stageId = req.query.stageId as string;
        }
        if (req.query.startDate) {
            filters.startDate = new Date(req.query.startDate as string);
        }
        if (req.query.endDate) {
            filters.endDate = new Date(req.query.endDate as string);
        }

        const history = await reportService.getECOHistory(filters);
        res.json({ history });
    } catch (error: any) {
        console.error('Get ECO history error:', error);
        res.status(500).json({ error: 'Failed to fetch ECO history' });
    }
};

/**
 * @swagger
 * /api/reports/product-versions:
 *   get:
 *     summary: List all product versions across products
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: productId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product version matrix
 */
export const getProductVersions = async (req: AuthRequest, res: Response) => {
    try {
        const productId = req.query.productId as string | undefined;
        const versions = await reportService.getProductVersions(productId);
        res.json({ versions });
    } catch (error: any) {
        console.error('Get product versions error:', error);
        res.status(500).json({ error: 'Failed to fetch product versions' });
    }
};

/**
 * @swagger
 * /api/reports/bom-history:
 *   get:
 *     summary: Retrieve BOM change history
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bomId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: BOM change log
 */
export const getBOMHistory = async (req: AuthRequest, res: Response) => {
    try {
        const bomId = req.query.bomId as string | undefined;
        const history = await reportService.getBOMHistory(bomId);
        res.json({ history });
    } catch (error: any) {
        console.error('Get BOM history error:', error);
        res.status(500).json({ error: 'Failed to fetch BOM history' });
    }
};

/**
 * @swagger
 * /api/reports/active-matrix:
 *   get:
 *     summary: Show current active versions of all products and BOMs
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current active state snapshot
 */
export const getActiveMatrix = async (req: AuthRequest, res: Response) => {
    try {
        const matrix = await reportService.getActiveMatrix();
        res.json(matrix);
    } catch (error: any) {
        console.error('Get active matrix error:', error);
        res.status(500).json({ error: 'Failed to fetch active matrix' });
    }
};

/**
 * @swagger
 * /api/reports/archived-products:
 *   get:
 *     summary: Retrieve archived products versions list
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of archived products versions
 */
export const getArchivedProducts = async (req: AuthRequest, res: Response) => {
    try {
        const archived = await reportService.getArchivedProducts();
        res.json({ archived });
    } catch (error: any) {
        console.error('Get archived products error:', error);
        res.status(500).json({ error: 'Failed to fetch archived products' });
    }
};
