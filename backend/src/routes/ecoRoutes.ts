import { Router } from 'express';
import {
    createECO,
    createProductECO,
    createBOMECO,
    getECOs,
    getECOById,
    updateProductDraft,
    updateBOMDraft,
    addDraftAttachment,
    submitForReview,
    approveECO,
    validateECO,
    getECOStatistics,
    rejectECO,
    applyECO,
    setMandatoryApproval,
} from '../controllers/ecoController.js';
import { authenticate, requireRole, requireApprover, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Primary Unified ECO Creation Path
router.post('/', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), createECO);

// Backward Compatibility Wrappers (Product & BOM typed creation)
router.post('/product', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), createProductECO);
router.post('/bom', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), createBOMECO);

// ECO Listing & Statistics
router.get('/', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), getECOs);
router.get('/statistics', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), getECOStatistics);
router.get('/:id', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), getECOById);

// Draft Editing (Draft Stage Only)
router.patch('/:id/draft/product', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), updateProductDraft);
router.patch('/:id/draft/bom', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), updateBOMDraft);
router.post('/:id/draft/attachments', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), addDraftAttachment);

// Workflow Transitions
router.post('/:id/submit', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), submitForReview);
router.post('/:id/advance', authenticate, requireApprover(), validateECO);
router.post('/:id/validate', authenticate, requireApprover(), validateECO);
router.post('/:id/approve', authenticate, requireApprover(), approveECO);
router.post('/:id/reject', authenticate, requireApprover(), rejectECO);
router.post('/:id/apply', authenticate, requireAdmin(), applyECO);

// Admin Actions
router.patch('/:id/mandatory-approval', authenticate, requireAdmin(), setMandatoryApproval);

export default router;