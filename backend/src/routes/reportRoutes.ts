import { Router } from 'express';
import {
    getECOHistory,
    getProductVersions,
    getBOMHistory,
    getActiveMatrix,
} from '../controllers/reportController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// All report endpoints require authentication
router.get('/eco-history', authenticate, getECOHistory);
router.get('/product-versions', authenticate, getProductVersions);
router.get('/bom-history', authenticate, getBOMHistory);
router.get('/active-matrix', authenticate, getActiveMatrix);

export default router;
