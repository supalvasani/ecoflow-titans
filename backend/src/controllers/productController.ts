import { Request, Response } from 'express';
import { productService } from '../service/productService.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product with initial version
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - salePrice
 *               - costPrice
 *             properties:
 *               name:
 *                 type: string
 *                 example: "EcoPhone X2"
 *               salePrice:
 *                 type: number
 *                 example: 799.99
 *               costPrice:
 *                 type: number
 *                 example: 500.00
 *     responses:
 *       201:
 *         description: Product created successfully
 *       403:
 *         description: Forbidden - requires ENGINEERING_USER or ADMIN role
 */
export const createProduct = async (req: AuthRequest, res: Response) => {
    try {
        const { name, salePrice, costPrice } = req.body;
        const userId = req.user!.userId;

        const product = await productService.createProduct(name, salePrice, costPrice, userId);
        res.status(201).json({
            message: 'Product created successfully',
            product
        });
    } catch (error: any) {
        console.error('Create product error:', error);
        res.status(400).json({ error: error.message || 'Failed to create product' });
    }
};

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products with active versions
 *     tags: [Products]
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
 *         description: List of products
 */
export const getProducts = async (req: AuthRequest, res: Response) => {
    try {
        const userRole = req.user!.role;
        const includeArchived = req.query.includeArchived === 'true';

        const products = await productService.getProducts(userRole, includeArchived);
        res.json({ products });
    } catch (error: any) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID with version history
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
export const getProductById = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;

        const product = await productService.getProductById(id as string, userRole);
        res.json({ product });
    } catch (error: any) {
        if (error.message === 'Product not found') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

/**
 * @swagger
 * /api/products/{id}/versions:
 *   get:
 *     summary: Get all versions of a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product version history
 */
export const getProductVersions = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const userRole = req.user!.role;
        const versions = await productService.getProductVersions(id as string, userRole);
        res.json({ versions });
    } catch (error: any) {
        if (error.statusCode === 403) {
            return res.status(403).json({ error: error.message });
        }
        console.error('Get product versions error:', error);
        res.status(500).json({ error: 'Failed to fetch product versions' });
    }
};

/**
 * @swagger
 * /api/products/{id}/active:
 *   get:
 *     summary: Get active version of a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Active product version
 *       404:
 *         description: No active version found
 */
export const getActiveVersion = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const version = await productService.getActiveProductVersion(id as string);
        res.json({ version });
    } catch (error: any) {
        if (error.message === 'No active version found for this product') {
            return res.status(404).json({ error: error.message });
        }
        console.error('Get active version error:', error);
        res.status(500).json({ error: 'Failed to fetch active version' });
    }
};

/**
 * @swagger
 * /api/products/{id}/versions/{versionId}/attachments:
 *   get:
 *     summary: Get attachments for product version (READ-ONLY)
 *     tags: [Products]
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
 *         description: List of attachments
 */
export const getAttachments = async (req: AuthRequest, res: Response) => {
    try {
        const { versionId } = req.params;
        const attachments = await productService.getAttachments(versionId as string);
        res.json({ attachments });
    } catch (error: any) {
        console.error('Get attachments error:', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
};
