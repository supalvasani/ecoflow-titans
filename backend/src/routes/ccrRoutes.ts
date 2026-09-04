import { Router } from 'express';
import {
    createCCR,
    getCCRs,
    getCCRById,
    updateDraft,
    addDraftContent,
    submitForReview,
    validateCCR,
    approveCCR,
    rejectCCR,
    applyCCR,
    getCCRStatistics,
    setMandatoryApproval,
    previewDiff,
} from '../controllers/ccrController.js';
import {
    authenticate,
    requireMerchandiserOrAdmin,
    requireApproverOrAdmin,
    requireAdmin,
} from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/create', authenticate, requireMerchandiserOrAdmin(), createCCR);
router.post('/', authenticate, requireMerchandiserOrAdmin(), createCCR);
router.post('/catalog-item', authenticate, requireMerchandiserOrAdmin(), createCCR);
router.get('/statistics', authenticate, getCCRStatistics);
router.get('/', authenticate, getCCRs);
router.get('/:id', authenticate, getCCRById);
router.get('/:id/diff', authenticate, previewDiff);
router.patch('/:id/draft', authenticate, requireMerchandiserOrAdmin(), updateDraft);
router.post('/:id/draft/content', authenticate, requireMerchandiserOrAdmin(), addDraftContent);
router.post('/:id/draft/attachments', authenticate, requireMerchandiserOrAdmin(), addDraftContent);
router.post('/:id/submit', authenticate, requireMerchandiserOrAdmin(), submitForReview);
router.post('/:id/validate', authenticate, requireMerchandiserOrAdmin(), validateCCR);
router.post('/:id/approve', authenticate, requireApproverOrAdmin(), approveCCR);
router.post('/:id/reject', authenticate, requireApproverOrAdmin(), rejectCCR);
router.post('/:id/apply', authenticate, requireMerchandiserOrAdmin(), applyCCR);
router.patch('/:id/mandatory-approval', authenticate, requireAdmin(), setMandatoryApproval);

export default router;
