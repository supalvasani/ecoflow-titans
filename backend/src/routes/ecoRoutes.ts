import { Router } from 'express';
import {
    createECO,
    getECOs,
    getECOById,
    updateDraft,
    addDraftAttachment,
    submitForReview,
    approveECO,
    validateECO,
    getECOStatistics,
    rejectECO,
    applyECO,
    setMandatoryApproval,
} from '../controllers/ecoController.js';
import { authenticate, requireRole, requireApprover, requireAdmin, requireEngineerOrAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Primary Unified ECO Creation Path
router.post('/', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), createECO);

// ECO Listing & Statistics
// NOTE: /statistics MUST remain before /:id to prevent Express routing it as an ID lookup
router.get('/', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), getECOs);
router.get('/statistics', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), getECOStatistics);
router.get('/:id', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), getECOById);

// Draft Editing (Draft Stage Only)
router.patch('/:id/draft', authenticate, requireEngineerOrAdmin(), updateDraft);
router.post('/:id/draft/attachments', authenticate, requireEngineerOrAdmin(), addDraftAttachment);

// Workflow Transitions
router.post('/:id/submit', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), submitForReview);
router.post('/:id/validate', authenticate, requireRole('ENGINEERING_USER', 'APPROVER', 'ADMIN'), validateECO);
router.post('/:id/approve', authenticate, requireApprover(), approveECO);
router.post('/:id/reject', authenticate, requireApprover(), rejectECO);
router.post('/:id/apply', authenticate, requireAdmin(), applyECO);

// Admin Actions
router.patch('/:id/mandatory-approval', authenticate, requireAdmin(), setMandatoryApproval);

export default router;