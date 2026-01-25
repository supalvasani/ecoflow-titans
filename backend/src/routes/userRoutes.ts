import { Router } from 'express';
import { getUsers, createUser } from '../controllers/userController.js';
import { authenticate, requireRole, requireAdmin } from '../middlewares/authMiddleware.js';

const router = Router();

// Retrieve all users - restricted to Admin
router.get('/', authenticate, requireAdmin(), getUsers);

// Create new user - restricted to Admin
router.post('/', authenticate, requireAdmin(), createUser);

export default router;
