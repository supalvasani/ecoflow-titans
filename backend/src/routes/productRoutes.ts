import { Router } from 'express';
import {
    createProduct,
    getProducts,
    getProductById,
    getProductVersions,
    getActiveVersion,
    getAttachments,
} from '../controllers/productController.js';
import { authenticate, requireEngineerOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Product CRUD
router.post('/', authenticate, requireEngineerOrAdmin(), createProduct);
router.get('/', authenticate, getProducts);
router.get('/:id', authenticate, getProductById);
router.get('/:id/versions', authenticate, requireEngineerOrAdmin(), getProductVersions);
router.get('/:id/active', authenticate, getActiveVersion);

// Product Attachments (READ-ONLY)
router.get('/:id/versions/:versionId/attachments', authenticate, getAttachments);

export default router;
