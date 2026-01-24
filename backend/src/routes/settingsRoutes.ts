import { Router } from 'express';
import {
    getStages,
    updateStages,
    getApprovalRules,
    updateApprovalRules,
} from '../controllers/settingsController.js';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Stage configuration
router.get('/stages', authenticate, getStages);
router.post('/stages', authenticate, requireAdmin(), updateStages);

// Approval rules configuration
router.get('/approval-rules', authenticate, getApprovalRules);
router.post('/approval-rules', authenticate, requireAdmin(), updateApprovalRules);

export default router;
