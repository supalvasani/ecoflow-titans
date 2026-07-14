
import express from 'express';
import { getOperationsTasks, completeOperationsTask } from '../controllers/operationsController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(authenticate); // Ensure user is logged in
// Add role check middleware here if strictly needed, but for now allow logged in users (filtered on frontend usually)

router.get('/', getOperationsTasks);
router.post('/:id/complete', completeOperationsTask);

export default router;
