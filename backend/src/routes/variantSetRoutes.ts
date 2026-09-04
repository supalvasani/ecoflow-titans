import { Router } from 'express';
import {
    createVariantSet,
    getVariantSets,
    getVariantSetById,
    getVariantSetByCatalogItemId,
    getVariantSetVersions,
    getActiveVariantSetVersion,
    toggleChannelPublishRule,
} from '../controllers/variantSetController.js';
import { authenticate, requireMerchandiserOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/', authenticate, requireMerchandiserOrAdmin(), createVariantSet);
router.get('/', authenticate, getVariantSets);
router.get('/:id', authenticate, getVariantSetById);
router.get('/item/:catalogItemId', authenticate, getVariantSetByCatalogItemId);
router.get('/product/:productId', authenticate, getVariantSetByCatalogItemId);
router.get('/:id/versions', authenticate, requireMerchandiserOrAdmin(), getVariantSetVersions);
router.get('/:id/active', authenticate, getActiveVariantSetVersion);
router.patch('/channel-rules/:ruleId/toggle', authenticate, requireMerchandiserOrAdmin(), toggleChannelPublishRule);

export default router;
