import Submission from '../models/Submission.js';
import Form from '../models/Form.js';

export const createSubmission = async (req, res) => {
  try {
    const { form: formId, data, metadata } = req.body;

    // Verify form exists and user has access
    const form = await Form.findById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    if (!form.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Form is not active'
      });
    }

    // Check if user is allowed to submit
    const canSubmit = form.assignedUsers.includes(req.user.id) ||
                     form.assignedRoles.includes(req.user.role) ||
                     req.user.role === 'admin';

    if (!canSubmit && form.settings.requireLogin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this form'
      });
    }

    // Check for existing submissions if not allowed
    if (!form.settings.allowMultipleSubmissions) {
      const existingSubmission = await Submission.findOne({
        form: formId,
        submittedBy: req.user.id
      });

      if (existingSubmission) {
        return res.status(400).json({
          success: false,
          message: 'You have already submitted this form'
        });
      }
    }

    // Create submission
    const submission = await Submission.create({
      form: formId,
      data,
      submittedBy: req.user.id,
      organization: req.user.organization,
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      workflowHistory: [{
        stage: 'submitted',
        user: req.user.id,
        action: 'submitted',
        timestamp: new Date()
      }]
    });

    await submission.populate([
      { path: 'form', select: 'title' },
      { path: 'submittedBy', select: 'name email' }
    ]);

    res.status(201).json({
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
      search
    } = req.query;

    const query = { organization: req.user.organization };

    // Apply filters
    if (form) query.form = form;
    if (status) query.status = status;
    if (submittedBy) query.submittedBy = submittedBy;
    if (currentStage) query.currentStage = currentStage;
    if (priority) query.priority = priority;

    // If user is not admin, only show their submissions or assigned forms
    if (req.user.role !== 'admin') {
      // Get forms user has access to
      const accessibleForms = await Form.find({
        $or: [
          { createdBy: req.user.id },
          { assignedUsers: req.user.id },
          { assignedRoles: req.user.role }
        ]
      }).select('_id');

      const formIds = accessibleForms.map(f => f._id);
      
      query.$or = [
        { submittedBy: req.user.id },
        { form: { $in: formIds } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'form', select: 'title' },
        { path: 'submittedBy', select: 'name email' },
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
      .populate('workflowHistory.user', 'name email');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Check access permissions
    const canView = req.user.role === 'admin' ||
                   submission.submittedBy._id.toString() === req.user.id ||
                   submission.organization === req.user.organization;

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

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Only submitter can update unless admin
    if (req.user.role !== 'admin' && 
        submission.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this submission'
      });
    }

    // Can't update submitted forms unless in draft
    if (submission.status !== 'draft' && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update submitted form'
      });
    }

    submission = await Submission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      { path: 'form', select: 'title' },
      { path: 'submittedBy', select: 'name email' }
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
    const { status, currentStage, comment } = req.body;
    
    let submission = await Submission.findById(req.params.id);

    if (!submission) {
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
    
    if (status) submission.status = status;
    if (currentStage) submission.currentStage = currentStage;

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

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Only submitter or admin can delete
    if (req.user.role !== 'admin' && 
        submission.submittedBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this submission'
      });
    }

    await Submission.findByIdAndDelete(req.params.id);

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

export const getSubmissionStats = async (req, res) => {
  try {
    const stats = await Submission.aggregate([
      { $match: { organization: req.user.organization } },
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
          approvedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } 
          },
          rejectedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } 
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalSubmissions: 0,
        draftCount: 0,
        submittedCount: 0,
        approvedCount: 0,
        rejectedCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};