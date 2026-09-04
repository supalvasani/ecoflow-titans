import { Router } from 'express';
import { getPublishTasks, completePublishTask } from '../controllers/publishTaskController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

router.get('/tasks', authenticate, getPublishTasks);
router.patch('/tasks/:id/complete', authenticate, completePublishTask);

export default router;
