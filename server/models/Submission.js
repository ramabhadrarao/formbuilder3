import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const submissionSchema = new mongoose.Schema({
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  
  // Parent submission for nested/detail forms
  parentSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  
  // Master submission for detail forms
  masterSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  
  // Submission number (auto-generated)
  submissionNumber: {
    type: String,
    unique: true
  },
  
  // Form data - flexible schema to store any field values
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  
  // Nested submissions for repeater/nested form fields
  nestedSubmissions: [{
    fieldId: String,
    submissions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission'
    }]
  }],
  
  // File attachments
  files: [{
    fieldId: String,
    fileId: String,
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: Date,
    path: String // GridFS or S3 path
  }],
  
  // Signature data
  signatures: [{
    fieldId: String,
    data: String, // Base64 encoded signature
    timestamp: Date
  }],
  
  // Submission metadata
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  submittedOnBehalf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Workflow tracking
  currentStage: {
    type: String,
    default: 'submitted'
  },
  
  workflowHistory: [{
    stage: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: String,
    comment: String,
    attachments: [{
      fileId: String,
      filename: String,
      size: Number
    }],
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],
  
  // Approval tracking
  approvals: [{
    stage: String,
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'returned']
    },
    comment: String,
    timestamp: Date,
    signature: String
  }],
  
  // Status tracking
  status: {
    type: String,
    enum: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'returned', 'completed', 'archived'],
    default: 'submitted'
  },
  
  // Priority and scheduling
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent', 'critical'],
    default: 'medium'
  },
  
  dueDate: Date,
  
  scheduledDate: Date,
  
  // Completion tracking
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completionTime: Number, // Time taken to complete in seconds
  
  // Organization and categorization
  organization: {
    type: String,
    default: 'default'
  },
  
  department: String,
  
  category: String,
  
  tags: [String],
  
  // External references
  externalId: String,
  referenceNumber: String,
  
  // Calculated fields
  calculatedFields: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  
  // Form version at time of submission
  formVersion: Number,
  
  // Tracking metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    browser: String,
    os: String,
    device: String,
    location: {
      country: String,
      region: String,
      city: String,
      latitude: Number,
      longitude: Number
    },
    referrer: String,
    sessionId: String,
    submissionTime: Number, // Time taken to fill form in seconds
    pageViews: [{
      page: String,
      timestamp: Date,
      duration: Number
    }]
  },
  
  // Validation results
  validationResults: [{
    fieldId: String,
    valid: Boolean,
    errors: [String],
    warnings: [String]
  }],
  
  // Comments and notes
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    attachments: [{
      fileId: String,
      filename: String
    }],
    isInternal: { type: Boolean, default: false },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Reminders and follow-ups
  reminders: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  
  // Audit trail
  auditLog: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: String,
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Flags
  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

// Indexes for better performance
submissionSchema.index({ form: 1, submittedBy: 1 });
submissionSchema.index({ organization: 1, status: 1 });
submissionSchema.index({ currentStage: 1 });
submissionSchema.index({ createdAt: -1 });
submissionSchema.index({ submissionNumber: 1 });
submissionSchema.index({ parentSubmission: 1 });
submissionSchema.index({ masterSubmission: 1 });
submissionSchema.index({ externalId: 1 });
submissionSchema.index({ referenceNumber: 1 });

// Add pagination plugin
submissionSchema.plugin(mongoosePaginate);

// Generate submission number
submissionSchema.pre('save', async function(next) {
  this.updatedAt = Date.now();
  
  if (!this.submissionNumber && this.isNew) {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Find the last submission of this month
    const lastSubmission = await this.constructor.findOne({
      submissionNumber: new RegExp(`^SUB-${year}${month}-`)
    }).sort({ submissionNumber: -1 });
    
    let sequence = 1;
    if (lastSubmission) {
      const lastSequence = parseInt(lastSubmission.submissionNumber.split('-')[2]);
      sequence = lastSequence + 1;
    }
    
    this.submissionNumber = `SUB-${year}${month}-${String(sequence).padStart(5, '0')}`;
  }
  
  next();
});

// Virtual for child submissions
submissionSchema.virtual('childSubmissions', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'parentSubmission',
  justOne: false
});

// Virtual for detail submissions
submissionSchema.virtual('detailSubmissions', {
  ref: 'Submission',
  localField: '_id',
  foreignField: 'masterSubmission',
  justOne: false
});

// Methods
submissionSchema.methods.canEdit = function(user) {
  if (user.role === 'admin') return true;
  if (this.submittedBy.equals(user._id) && this.status === 'draft') return true;
  
  // Check form permissions
  // This would need the form data populated
  
  return false;
};

submissionSchema.methods.addComment = async function(userId, text, attachments = [], isInternal = false) {
  this.comments.push({
    user: userId,
    text,
    attachments,
    isInternal,
    timestamp: new Date()
  });
  
  await this.save();
};

submissionSchema.methods.updateStatus = async function(userId, newStatus, comment) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Add to workflow history
  this.workflowHistory.push({
    stage: this.currentStage,
    user: userId,
    action: `Status changed from ${oldStatus} to ${newStatus}`,
    comment,
    timestamp: new Date()
  });
  
  // Add to audit log
  this.auditLog.push({
    user: userId,
    action: 'status_change',
    field: 'status',
    oldValue: oldStatus,
    newValue: newStatus,
    timestamp: new Date()
  });
  
  this.lastModifiedBy = userId;
  
  await this.save();
};

export default mongoose.model('Submission', submissionSchema);