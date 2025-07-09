import express from 'express';
import { getWorkflows, getWorkflow, executeWorkflow } from '../controllers/workflowController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Protected routes - Admin only
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getWorkflows);
router.get('/:id', getWorkflow);
router.post('/:id/execute', executeWorkflow);

export default router; 