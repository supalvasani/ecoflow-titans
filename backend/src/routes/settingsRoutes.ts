import { Router } from 'express';
import {
    getStages,
    updateStages,
    getApprovalRules,
    updateApprovalRules,
} from '../controllers/settingsController.js';
import { authenticate, requireAdmin, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

const requireNonStorefront = requireRole('ADMIN', 'MERCHANDISER', 'CATEGORY_APPROVER');

router.get('/stages', authenticate, requireNonStorefront, getStages);
router.post('/stages', authenticate, requireAdmin(), updateStages);

router.get('/approval-rules', authenticate, requireNonStorefront, getApprovalRules);
router.post('/approval-rules', authenticate, requireAdmin(), updateApprovalRules);

export default router;
