import { Router } from 'express';
import { login, logout, getMe, getUsers } from '../controllers/authController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// Public routes
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticate, getMe);
router.get('/users', authenticate, getUsers);

export default router;
