import { Router } from 'express';
import {
    getAuditLogs,
    getECOAuditLogs,
    getEntityAuditLogs,
} from '../controllers/auditController.js';
import { authenticate, requireRole } from '../middlewares/authMiddleware.js';

const router = Router();

const requireAuditAccess = requireRole('ADMIN', 'ENGINEERING_USER', 'APPROVER');

router.get('/', authenticate, requireAuditAccess, getAuditLogs);
router.get('/eco/:ecoId', authenticate, requireAuditAccess, getECOAuditLogs);
router.get('/entity/:entity/:entityId', authenticate, requireAuditAccess, getEntityAuditLogs);

export default router;
