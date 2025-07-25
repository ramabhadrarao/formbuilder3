import express from 'express';
import multer from 'multer';
import { uploadFile, getFile, deleteFile } from '../controllers/fileController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|xls/;
    const extname = allowedTypes.test(file.originalname.toLowerCase().split('.').pop());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed types: jpeg, jpg, png, gif, pdf, doc, docx, txt, csv, xlsx'));
    }
  }
});

// File routes
router.post('/upload', authenticate, upload.single('file'), uploadFile);
router.get('/:id', authenticate, getFile);
router.delete('/:id', authenticate, deleteFile);

export default router;