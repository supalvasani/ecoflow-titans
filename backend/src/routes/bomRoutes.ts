import { Router } from 'express';
import {
    createBOM,
    getBOMs,
    getBOMById,
    getBOMVersions,
    getActiveVersion,
    getBOMVersionById,
    getBOMComponents,
    getBOMOperations,
} from '../controllers/bomController.js';
import { authenticate, requireEngineerOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// BOM CRUD - More specific routes first to avoid conflicts
router.post('/', authenticate, requireEngineerOrAdmin(), createBOM);
router.get('/', authenticate, getBOMs);

// Specific routes before generic :id route
router.get('/versions/:versionId', authenticate, getBOMVersionById);
router.get('/:id/versions', authenticate, requireEngineerOrAdmin(), getBOMVersions);
router.get('/:id/active', authenticate, getActiveVersion);
router.get('/:id/versions/:versionId/components', authenticate, getBOMComponents);
router.get('/:id/versions/:versionId/operations', authenticate, getBOMOperations);

// Generic :id route last
router.get('/:id', authenticate, getBOMById);

export default router;
