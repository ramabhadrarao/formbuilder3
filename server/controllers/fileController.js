import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

let bucket;

// Initialize GridFS bucket
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
  console.log('GridFS bucket initialized');
});

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'File storage not initialized'
      });
    }

    const { originalname, mimetype, buffer, size } = req.file;
    
    // Create a readable stream from buffer
    const readableStream = Readable.from(buffer);
    
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
          id: uploadStream.id.toString(),
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

    // Pipe the buffer to GridFS
    readableStream.pipe(uploadStream);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getFile = async (req, res) => {
  try {
    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'File storage not initialized'
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    // Get file info
    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    const file = files[0];
    
    // Set response headers
    res.set({
      'Content-Type': file.metadata?.mimetype || 'application/octet-stream',
      'Content-Length': file.length,
      'Content-Disposition': `inline; filename="${file.filename}"`
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
    if (!bucket) {
      return res.status(500).json({
        success: false,
        message: 'File storage not initialized'
      });
    }

    const fileId = new mongoose.Types.ObjectId(req.params.id);
    
    // Check if file exists
    const files = await bucket.find({ _id: fileId }).toArray();
    
    if (!files || files.length === 0) {
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