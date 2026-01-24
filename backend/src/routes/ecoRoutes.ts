import { Router } from 'express';
import {
    createProductECO,
    createBOMECO,
    getECOs,
    getECOById,
    updateProductDraft,
    updateBOMDraft,
    addDraftAttachment,
    submitForReview,
    approveECO,
    rejectECO,
    applyECO,
<<<<<<< Updated upstream
=======
    getECOStatistics,
>>>>>>> Stashed changes
} from '../controllers/ecoController.js';
import { authenticate, requireEngineerOrAdmin, requireApprover } from '../middlewares/authMiddleware.js';

const router = Router();

// ECO Creation
router.post('/product', authenticate, requireEngineerOrAdmin(), createProductECO);
router.post('/bom', authenticate, requireEngineerOrAdmin(), createBOMECO);

// ECO Listing & Details
router.get('/', authenticate, getECOs);
router.get('/statistics', authenticate, getECOStatistics);
router.get('/:id', authenticate, getECOById);

// Draft Editing (only in NEW stage)
router.patch('/:id/draft/product', authenticate, requireEngineerOrAdmin(), updateProductDraft);
router.patch('/:id/draft/bom', authenticate, requireEngineerOrAdmin(), updateBOMDraft);
router.post('/:id/draft/attachments', authenticate, requireEngineerOrAdmin(), addDraftAttachment);

// Workflow Transitions
router.post('/:id/submit', authenticate, requireEngineerOrAdmin(), submitForReview);
router.post('/:id/approve', authenticate, requireApprover(), approveECO);
router.post('/:id/reject', authenticate, requireApprover(), rejectECO);
router.post('/:id/apply', authenticate, requireEngineerOrAdmin(), applyECO);

export default router;
