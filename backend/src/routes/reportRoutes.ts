import { Router } from 'express';
import {
    getCCRHistory,
    getCatalogItemVersions,
    getVariantSetHistory,
    getActiveMatrix,
    getArchivedCatalogItems,
} from '../controllers/reportController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// Reports are accessible by ADMIN, MERCHANDISER, CATEGORY_APPROVER (Forbidden for STOREFRONT_VIEWER)
const requireReportAccess = requireRole('ADMIN', 'MERCHANDISER', 'CATEGORY_APPROVER');

router.get('/ccr-history', authenticate, requireReportAccess, getCCRHistory);
router.get('/catalog-item-versions', authenticate, requireReportAccess, getCatalogItemVersions);
router.get('/variant-set-history', authenticate, requireReportAccess, getVariantSetHistory);
router.get('/archived-catalog-items', authenticate, requireReportAccess, getArchivedCatalogItems);
router.get('/active-matrix', authenticate, requireReportAccess, getActiveMatrix);

export default router;
