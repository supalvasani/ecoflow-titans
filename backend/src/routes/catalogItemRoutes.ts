import { Router } from 'express';
import {
    createCatalogItem,
    getCatalogItems,
    getCatalogItemById,
    getCatalogItemVersions,
    getActiveVersion,
    getContent,
} from '../controllers/catalogItemController.js';
import { authenticate, requireMerchandiserOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', authenticate, requireMerchandiserOrAdmin(), createCatalogItem);
router.get('/', authenticate, getCatalogItems);
router.get('/:id', authenticate, getCatalogItemById);
router.get('/:id/versions', authenticate, requireMerchandiserOrAdmin(), getCatalogItemVersions);
router.get('/:id/active', authenticate, getActiveVersion);
router.get('/:id/versions/:versionId/content', authenticate, getContent);
router.get('/:id/versions/:versionId/attachments', authenticate, getContent);

export default router;
