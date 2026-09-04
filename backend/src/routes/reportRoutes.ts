import { Router } from 'express';
import {
    getCCRHistory,
    getCatalogItemVersions,
    getVariantSetHistory,
    getActiveMatrix,
    getArchivedCatalogItems,
    getECOHistory,
    getProductVersions,
    getBOMHistory,
    getArchivedProducts,
} from '../controllers/reportController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// Reports are accessible by ADMIN, MERCHANDISER, CATEGORY_APPROVER (Forbidden for STOREFRONT_VIEWER)
const requireReportAccess = requireRole('ADMIN', 'MERCHANDISER', 'CATEGORY_APPROVER', 'ENGINEERING_USER', 'APPROVER');

// New domain routes
router.get('/ccr-history', authenticate, requireReportAccess, getCCRHistory);
router.get('/catalog-item-versions', authenticate, requireReportAccess, getCatalogItemVersions);
router.get('/variant-set-history', authenticate, requireReportAccess, getVariantSetHistory);
router.get('/archived-catalog-items', authenticate, requireReportAccess, getArchivedCatalogItems);
router.get('/active-matrix', authenticate, requireReportAccess, getActiveMatrix);

// Legacy aliases
router.get('/eco-history', authenticate, requireReportAccess, getECOHistory);
router.get('/product-versions', authenticate, requireReportAccess, getProductVersions);
router.get('/bom-history', authenticate, requireReportAccess, getBOMHistory);
router.get('/archived-products', authenticate, requireReportAccess, getArchivedProducts);

export default router;
