import { Router } from 'express';
import {
    getAuditLogs,
    getECOAuditLogs,
    getEntityAuditLogs,
} from '../controllers/auditController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// Get audit logs with optional filtering
router.get('/', authenticate, getAuditLogs);

// Get audit logs for a specific ECO
router.get('/eco/:ecoId', authenticate, getECOAuditLogs);

// Get audit logs for a specific entity
router.get('/entity/:entity/:entityId', authenticate, getEntityAuditLogs);

export default router;
