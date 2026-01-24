import { Router } from 'express';
import {
    createBOM,
    getBOMs,
    getBOMById,
    getBOMVersions,
    getActiveVersion,
    getBOMComponents,
    getBOMOperations,
} from '../controllers/bomController.js';
import { authenticate, requireEngineerOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// BOM CRUD
router.post('/', authenticate, requireEngineerOrAdmin(), createBOM);
router.get('/', authenticate, getBOMs);
router.get('/:id', authenticate, getBOMById);
router.get('/:id/versions', authenticate, requireEngineerOrAdmin(), getBOMVersions);
router.get('/:id/active', authenticate, getActiveVersion);

// BOM Components & Operations
router.get('/:id/versions/:versionId/components', authenticate, getBOMComponents);
router.get('/:id/versions/:versionId/operations', authenticate, getBOMOperations);

export default router;
