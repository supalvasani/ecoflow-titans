import { Router } from 'express';
import {
    getStages,
    updateStages,
    getApprovalRules,
    updateApprovalRules,
} from '../controllers/settingsController.js';
import { authenticate, requireAdmin, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

const requireNonOperations = requireRole('ADMIN', 'ENGINEERING_USER', 'APPROVER');

router.get('/stages', authenticate, requireNonOperations, getStages);
router.post('/stages', authenticate, requireAdmin(), updateStages);

router.get('/approval-rules', authenticate, requireNonOperations, getApprovalRules);
router.post('/approval-rules', authenticate, requireAdmin(), updateApprovalRules);

export default router;
