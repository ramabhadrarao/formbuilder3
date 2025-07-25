import Submission from '../models/Submission.js';
import Form from '../models/Form.js';
import mongoose from 'mongoose';
import { GridFSBucket } from 'mongodb';
import { Readable } from 'stream';

let bucket;

// Initialize GridFS bucket
mongoose.connection.once('open', () => {
  bucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: 'uploads'
  });
});

export const createSubmission = async (req, res) => {
  try {
    const { 
      form: formId, 
      data, 
      metadata, 
      files, 
      nestedSubmissions,
      status = 'submitted',
      parentSubmission,
      masterSubmission
    } = req.body;

    // Verify form exists
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    if (!form.isActive && status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Form is not active'
      });
    }

    // Check submission permissions
    if (!form.canSubmit(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this form'
      });
    }

    // Check for existing submissions if not allowed
    if (!form.settings.allowMultipleSubmissions && status !== 'draft') {
      const existingSubmission = await Submission.findOne({
        form: formId,
        submittedBy: req.user.id,
        status: { $ne: 'draft' }
      });

      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this form'
        });
      }
    }

    // Check scheduling
    if (form.settings.scheduling?.enabled) {
      const now = new Date();
      const startDate = new Date(form.settings.scheduling.startDate);
      const endDate = new Date(form.settings.scheduling.endDate);
      
      if (now < startDate || now > endDate) {
        return res.status(400).json({
          success: false,
          message: form.settings.scheduling.closedMessage || 'This form is not accepting submissions at this time'
        });
      }
    }

    // Check quotas
    if (form.settings.quotas?.enabled) {
      const submissionCount = await Submission.countDocuments({ 
        form: formId,
        status: { $ne: 'draft' }
      });
      
      if (submissionCount >= form.settings.quotas.maxSubmissions) {
        return res.status(400).json({
          success: false,
          message: form.settings.quotas.quotaReachedMessage || 'This form has reached its submission limit'
        });
      }
    }

    // Create submission
    const submission = await Submission.create({
      form: formId,
      data,
      files: files || [],
      nestedSubmissions: nestedSubmissions || [],
      submittedBy: req.user.id,
      organization: req.user.organization || 'default',
      status,
      parentSubmission,
      masterSubmission,
      formVersion: form.version,
      currentStage: status === 'draft' ? 'draft' : 'submitted',
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        browser: parseBrowser(req.get('User-Agent')),
        os: parseOS(req.get('User-Agent')),
        device: parseDevice(req.get('User-Agent'))
      },
      workflowHistory: status !== 'draft' ? [{
        stage: 'submitted',
        user: req.user.id,
        action: 'submitted',
        timestamp: new Date()
      }] : []
    });

    // Handle nested form submissions
    if (nestedSubmissions && nestedSubmissions.length > 0) {
      for (const nested of nestedSubmissions) {
        const field = form.fields.find(f => f.id === nested.fieldId);
        if (field && field.nestedForm?.formId) {
          // Create child submissions
          const childSubmissions = [];
          for (const childData of nested.submissions) {
            const childSubmission = await Submission.create({
              form: field.nestedForm.formId,
              parentSubmission: submission._id,
              data: childData,
              submittedBy: req.user.id,
              organization: req.user.organization || 'default',
              status: submission.status,
              formVersion: 1 // Would need to fetch the nested form version
            });
            childSubmissions.push(childSubmission._id);
          }
          
          // Update parent submission with child references
          submission.nestedSubmissions.push({
            fieldId: nested.fieldId,
            submissions: childSubmissions
          });
        }
      }
      await submission.save();
    }

    // Update form analytics
    if (status !== 'draft') {
      form.analytics.submissions += 1;
      await form.save();
    }

    await submission.populate([
      { path: 'form', select: 'title code type' },
      { path: 'submittedBy', select: 'name email' }
    ]);

    // Send email notifications if enabled
    if (form.settings.emailNotifications?.enabled && status !== 'draft') {
      // Implementation would go here
    }

    res.status(201).json({
      success: true,
      data: submission
    });
  } catch (error) {
    console.error('Error creating submission:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating submission'
    });
  }
};

export const getSubmissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      form,
      status,
      submittedBy,
      currentStage,
      priority,
      search,
      startDate,
      endDate,
      parentSubmission,
      masterSubmission
    } = req.query;

    const query = { 
      organization: req.user.organization || 'default',
      isDeleted: false 
    };

    // Apply filters
    if (form) query.form = form;
    if (status) query.status = status;
    if (submittedBy) query.submittedBy = submittedBy;
    if (currentStage) query.currentStage = currentStage;
    if (priority) query.priority = priority;
    if (parentSubmission) query.parentSubmission = parentSubmission;
    if (masterSubmission) query.masterSubmission = masterSubmission;

    if (search) {
      query.$or = [
        { submissionNumber: { $regex: search, $options: 'i' } },
        { 'data': { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Check user permissions
    if (req.user.role !== 'admin' && !req.user.permissions?.includes('view_all_submissions')) {
      // Get forms user has access to
      const accessibleForms = await Form.find({
        $or: [
          { createdBy: req.user.id },
          { 'permissions.viewSubmissions.users': req.user.id },
          { 'permissions.viewSubmissions.roles': req.user.role }
        ]
      }).select('_id permissions');

      const formIds = [];
      for (const form of accessibleForms) {
        if (form.permissions.viewSubmissions.ownSubmissionsOnly) {
          // User can only see their own submissions for this form
          if (!query.$or) query.$or = [];
          query.$or.push({
            form: form._id,
            submittedBy: req.user.id
          });
        } else {
          formIds.push(form._id);
        }
      }
      
      if (formIds.length > 0) {
        if (!query.$or) query.$or = [];
        query.$or.push({ form: { $in: formIds } });
      }
      
      // Always allow users to see their own submissions
      if (!query.$or) query.$or = [];
      query.$or.push({ submittedBy: req.user.id });
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'form', select: 'title code type' },
        { path: 'submittedBy', select: 'name email' },
        { path: 'parentSubmission', select: 'submissionNumber' },
        { path: 'masterSubmission', select: 'submissionNumber' },
        { path: 'workflowHistory.user', select: 'name email' }
      ],
      sort: { createdAt: -1 }
    };

    const submissions = await Submission.paginate(query, options);

    res.json({
      success: true,
      data: submissions.docs,
      pagination: {
        page: submissions.page,
        pages: submissions.pages,
        total: submissions.total,
        limit: submissions.limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id)
      .populate('form')
      .populate('submittedBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('parentSubmission')
      .populate('masterSubmission')
      .populate('childSubmissions')
      .populate('detailSubmissions')
      .populate('workflowHistory.user', 'name email')
      .populate('approvals.approver', 'name email')
      .populate('comments.user', 'name email')
      .populate({
        path: 'nestedSubmissions.submissions',
        populate: {
          path: 'form',
          select: 'title fields'
        }
      });

    if (!submission || submission.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check access permissions
    const form = await Form.findById(submission.form._id);
    const canView = req.user.role === 'admin' ||
                   submission.submittedBy._id.toString() === req.user.id ||
                   form.permissions.viewSubmissions.roles.includes(req.user.role) ||
                   form.permissions.viewSubmissions.users.includes(req.user.id);

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission'
      });
    }

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateSubmission = async (req, res) => {
  try {
    let submission = await Submission.findById(req.params.id);

    if (!submission || submission.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check edit permissions
    const form = await Form.findById(submission.form);
    const canEdit = req.user.role === 'admin' ||
                   (submission.submittedBy.toString() === req.user.id && submission.status === 'draft') ||
                   form.permissions.editSubmissions.roles.includes(req.user.role) ||
                   form.permissions.editSubmissions.users.includes(req.user.id);

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this submission'
      });
    }

    // Track changes for audit log
    const changes = [];
    for (const key in req.body.data) {
      if (submission.data.get(key) !== req.body.data[key]) {
        changes.push({
          user: req.user.id,
          action: 'field_update',
          field: key,
          oldValue: submission.data.get(key),
          newValue: req.body.data[key],
          timestamp: new Date()
        });
      }
    }

    // Update submission
    if (req.body.data) submission.data = req.body.data;
    if (req.body.files) submission.files = req.body.files;
    if (req.body.priority) submission.priority = req.body.priority;
    if (req.body.dueDate) submission.dueDate = req.body.dueDate;
    
    submission.lastModifiedBy = req.user.id;
    submission.auditLog.push(...changes);

    await submission.save();
    
    await submission.populate([
      { path: 'form', select: 'title code' },
      { path: 'submittedBy', select: 'name email' },
      { path: 'lastModifiedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateSubmissionStatus = async (req, res) => {
  try {
    const { status, currentStage, comment, priority } = req.body;
    
    let submission = await Submission.findById(req.params.id);

    if (!submission || submission.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Add to workflow history
    const historyEntry = {
      stage: currentStage || submission.currentStage,
      user: req.user.id,
      action: status || 'updated',
      comment,
      timestamp: new Date()
    };

    submission.workflowHistory.push(historyEntry);
    
    if (status) {
      await submission.updateStatus(req.user.id, status, comment);
    }
    if (currentStage) submission.currentStage = currentStage;
    if (priority) submission.priority = priority;

    // Handle completion
    if (status === 'completed' || status === 'approved') {
      submission.completedAt = new Date();
      submission.completedBy = req.user.id;
    }

    await submission.save();
    
    await submission.populate([
      { path: 'form', select: 'title' },
      { path: 'submittedBy', select: 'name email' },
      { path: 'workflowHistory.user', select: 'name email' }
    ]);

    res.json({
      success: true,
      data: submission
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteSubmission = async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission || submission.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check delete permissions
    const form = await Form.findById(submission.form);
    const canDelete = req.user.role === 'admin' ||
                     (submission.submittedBy.toString() === req.user.id && 
                      form.permissions.deleteSubmissions.ownSubmissionsOnly) ||
                     form.permissions.deleteSubmissions.roles.includes(req.user.role) ||
                     form.permissions.deleteSubmissions.users.includes(req.user.id);

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this submission'
      });
    }

    // Soft delete
    submission.isDeleted = true;
    submission.deletedAt = new Date();
    submission.deletedBy = req.user.id;
    await submission.save();

    // Delete associated files if any
    if (submission.files && submission.files.length > 0 && bucket) {
      for (const file of submission.files) {
        try {
          await bucket.delete(new mongoose.Types.ObjectId(file.fileId));
        } catch (error) {
          console.error('Error deleting file:', error);
        }
      }
    }

    // Handle cascading deletes for child submissions
    if (form.type === 'master' && form.masterForm?.cascadeDelete) {
      await Submission.updateMany(
        { masterSubmission: submission._id },
        { 
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: req.user.id
        }
      );
    }

    res.json({
      success: true,
      message: 'Submission deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const addComment = async (req, res) => {
  try {
    const { text, attachments, isInternal } = req.body;
    
    const submission = await Submission.findById(req.params.id);
    if (!submission || submission.isDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    await submission.addComment(req.user.id, text, attachments, isInternal);
    
    await submission.populate('comments.user', 'name email');

    res.json({
      success: true,
      data: submission.comments[submission.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getSubmissionStats = async (req, res) => {
  try {
    const organization = req.user.organization || 'default';
    
    const stats = await Submission.aggregate([
      { 
        $match: { 
          organization,
          isDeleted: false 
        } 
      },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          draftCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] } 
          },
          submittedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } 
          },
          inReviewCount: {
            $sum: { $cond: [{ $eq: ['$status', 'in_review'] }, 1, 0] }
          },
          approvedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } 
          },
          rejectedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } 
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get priority breakdown
    const priorityStats = await Submission.aggregate([
      { 
        $match: { 
          organization,
          isDeleted: false,
          status: { $nin: ['draft', 'completed'] }
        } 
      },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Get submissions by form
    const formStats = await Submission.aggregate([
      { 
        $match: { 
          organization,
          isDeleted: false 
        } 
      },
      { $group: { _id: '$form', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'forms',
          localField: '_id',
          foreignField: '_id',
          as: 'form'
        }
      },
      { $unwind: '$form' },
      {
        $project: {
          formTitle: '$form.title',
          count: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        ...(stats[0] || {
          totalSubmissions: 0,
          draftCount: 0,
          submittedCount: 0,
          inReviewCount: 0,
          approvedCount: 0,
          rejectedCount: 0,
          completedCount: 0
        }),
        priorities: priorityStats,
        topForms: formStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const exportSubmissions = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    const query = { ...req.query };
    delete query.format;

    // Get submissions based on filters
    const submissions = await Submission.find(query)
      .populate('form', 'title fields')
      .populate('submittedBy', 'name email')
      .lean();

    if (format === 'csv') {
      // Convert to CSV format
      const csv = await convertSubmissionsToCSV(submissions);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=submissions.csv');
      res.send(csv);
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=submissions.json');
      res.json(submissions);
    } else {
      res.status(400).json({
        success: false,
        message: 'Unsupported export format'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Helper functions
function parseBrowser(userAgent) {
  // Simple browser detection
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function parseOS(userAgent) {
  // Simple OS detection
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

function parseDevice(userAgent) {
  // Simple device detection
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  return 'Desktop';
}

async function convertSubmissionsToCSV(submissions) {
  // Implementation would convert submissions to CSV format
  // This is a placeholder
  return 'id,form,submittedBy,status,createdAt\n';
}