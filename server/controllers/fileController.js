import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';

let bucket;

// Initialize GridFS bucket
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
});

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    
    // Create upload stream
    const uploadStream = bucket.openUploadStream(originalname, {
      metadata: {
        originalName: originalname,
        mimetype,
        size,
        uploadedBy: req.user.id,
        uploadedAt: new Date()
      }
    });

    // Handle upload completion
    uploadStream.on('finish', () => {
      res.status(201).json({
        success: true,
        data: {
          id: uploadStream.id,
          filename: originalname,
          mimetype,
          size
        }
      });
    });

    // Handle upload errors
    uploadStream.on('error', (error) => {
      res.status(500).json({
        success: false,
        message: 'Upload failed',
        error: error.message
      });
    });

    // Write file buffer to stream
    uploadStream.end(buffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getFile = async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    // Get file info
    const file = await bucket.find({ _id: fileId }).toArray();
    
    if (!file || file.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const fileDoc = file[0];
    
    // Set response headers
    res.set({
      'Content-Type': fileDoc.metadata.mimetype,
      'Content-Length': fileDoc.length,
      'Content-Disposition': `inline; filename="${fileDoc.filename}"`
    });

    // Stream file to response
    const downloadStream = bucket.openDownloadStream(fileId);
    
    downloadStream.on('error', (error) => {
      res.status(500).json({
        success: false,
        message: 'Download failed',
        error: error.message
      });
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    // Check if file exists
    const file = await bucket.find({ _id: fileId }).toArray();
    
    if (!file || file.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file
    await bucket.delete(fileId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};