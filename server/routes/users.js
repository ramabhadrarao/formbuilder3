import express from 'express';
import { getUsers, getUser, updateUser, deleteUser } from '../controllers/userController.js';
import { authenticate, authorize, checkPermission } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', checkPermission('manage_users'), getUsers);
router.get('/:id', getUser);
router.put('/:id', checkPermission('manage_users'), updateUser);
router.delete('/:id', checkPermission('manage_users'), deleteUser);

export default router;