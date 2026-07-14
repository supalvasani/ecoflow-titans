import { Router } from 'express';
import {
    getECOHistory,
    getProductVersions,
    getBOMHistory,
    getActiveMatrix,
} from '../controllers/reportController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// Reports are accessible by ADMIN, ENGINEERING_USER, and APPROVER (Forbidden for OPERATIONS_USER)
const requireReportAccess = requireRole('ADMIN', 'ENGINEERING_USER', 'APPROVER');

router.get('/eco-history', authenticate, requireReportAccess, getECOHistory);
router.get('/product-versions', authenticate, requireReportAccess, getProductVersions);
router.get('/bom-history', authenticate, requireReportAccess, getBOMHistory);
router.get('/active-matrix', authenticate, requireReportAccess, getActiveMatrix);

export default router;
