import { Router } from 'express';
import {
    createBOM,
    getBOMs,
    getBOMById,
    getBOMVersions,
    getActiveVersion,
    getBOMVersionById,
} from '../controllers/bomController.js';
import { authenticate, requireEngineerOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// BOM CRUD
router.post('/', authenticate, requireEngineerOrAdmin(), createBOM);
router.get('/', authenticate, getBOMs);

// Specific version routes
router.get('/versions/:versionId', authenticate, getBOMVersionById);
router.get('/:id/versions', authenticate, requireEngineerOrAdmin(), getBOMVersions);
router.get('/:id/active', authenticate, getActiveVersion);

// Generic ID route
router.get('/:id', authenticate, getBOMById);

export default router;
