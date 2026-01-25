import { Router } from 'express';
import {
    createProductECO,
    createBOMECO,
    createECO,
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
import { authenticate, requireEngineerOrAdmin, requireApprover, requireAdmin, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

// ECO Creation - Allow Engineers, Approvers, and Admins
router.post('/create', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), createECO);
router.post('/product', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), createProductECO);
router.post('/bom', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), createBOMECO);

// ECO Listing & Details
router.get('/', authenticate, getECOs);
router.get('/statistics', authenticate, getECOStatistics);
router.get('/:id', authenticate, getECOById);

// Draft Editing (only in NEW stage) - Engineers, Approvers, Admins
router.patch('/:id/draft/product', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), updateProductDraft);
router.patch('/:id/draft/bom', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), updateBOMDraft);
router.post('/:id/draft/attachments', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), addDraftAttachment);

// Workflow Transitions
router.post('/:id/submit', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), submitForReview);
router.post('/:id/validate', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), validateECO);
router.post('/:id/approve', authenticate, requireApprover(), approveECO);
router.post('/:id/reject', authenticate, requireApprover(), rejectECO);
router.post('/:id/apply', authenticate, requireAdmin(), applyECO); // Only Admins can apply

// Admin Actions
router.patch('/:id/mandatory-approval', authenticate, requireAdmin(), setMandatoryApproval);

export default router;