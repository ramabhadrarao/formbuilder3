import express from 'express';
import { body } from 'express-validator';
import {
  createSubmission,
  getSubmissions,
  getSubmission,
  updateSubmission,
  deleteSubmission,
  updateSubmissionStatus,
  getSubmissionStats
} from '../controllers/submissionController.js';
import { authenticate, checkPermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

router.post('/', [
  body('form').isMongoId().withMessage('Valid form ID is required'),
  body('data').isObject().withMessage('Form data is required')
], validate, createSubmission);

router.get('/', getSubmissions);
router.get('/stats', checkPermission('view_submissions'), getSubmissionStats);
router.get('/:id', getSubmission);
router.put('/:id', updateSubmission);
router.delete('/:id', deleteSubmission);
router.put('/:id/status', updateSubmissionStatus);

export default router;