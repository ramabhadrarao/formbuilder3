import express from 'express';
import { body } from 'express-validator';
import {
  createForm,
  getForms,
  getForm,
  updateForm,
  deleteForm,
  duplicateForm,
  getFormStats
} from '../controllers/formController.js';
import { authenticate, authorize, checkPermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = express.Router();

router.use(authenticate);

router.post('/', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('fields').isArray().withMessage('Fields must be an array')
], validate, checkPermission('create_forms'), createForm);

router.get('/', getForms);
router.get('/stats', checkPermission('view_submissions'), getFormStats);
router.get('/:id', getForm);
router.put('/:id', checkPermission('edit_forms'), updateForm);
router.delete('/:id', checkPermission('delete_forms'), deleteForm);
router.post('/:id/duplicate', checkPermission('create_forms'), duplicateForm);

export default router;