import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const submissionSchema = new mongoose.Schema({
  form: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
    required: true
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  files: [{
    fieldId: String,
    fileId: mongoose.Schema.Types.ObjectId,
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number
  }],
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'completed'],
    default: 'submitted'
  },
  dueDate: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  organization: {
    type: String,
    default: 'default'
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    submissionTime: Number // Time taken to fill form in seconds
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Add pagination plugin
submissionSchema.plugin(mongoosePaginate);

// Update timestamp on save
submissionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
submissionSchema.index({ form: 1, submittedBy: 1 });
submissionSchema.index({ organization: 1, status: 1 });
submissionSchema.index({ currentStage: 1 });
submissionSchema.index({ createdAt: -1 });

export default mongoose.model('Submission', submissionSchema);