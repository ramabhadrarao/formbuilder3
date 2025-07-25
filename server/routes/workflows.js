import express from 'express';
import { body } from 'express-validator';
import {
  createWorkflow,
  getWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow
} from '../controllers/workflowController.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

router.post('/', [
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('stages').isArray().withMessage('Stages must be an array'),
  body('initialStage').notEmpty().withMessage('Initial stage is required')
], validate, checkPermission('manage_workflows'), createWorkflow);

router.get('/', getWorkflows);
router.get('/:id', getWorkflow);
router.put('/:id', checkPermission('manage_workflows'), updateWorkflow);
router.delete('/:id', checkPermission('manage_workflows'), deleteWorkflow);

export default router;