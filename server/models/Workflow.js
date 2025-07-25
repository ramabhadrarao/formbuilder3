import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const stageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  allowedRoles: [String],
  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  actions: [{
    id: String,
    name: String,
    nextStage: String,
    requireComment: { type: Boolean, default: false },
    emailNotification: {
      enabled: { type: Boolean, default: false },
      template: String,
      recipients: [String]
    }
  }],
  autoTransition: {
    enabled: { type: Boolean, default: false },
    condition: String,
    nextStage: String,
    delay: Number // in minutes
  },
  order: { type: Number, default: 0 }
});

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workflow name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  stages: [stageSchema],
  initialStage: {
    type: String,
    required: true
  },
  finalStages: [String], // Stages that mark completion
  organization: {
    type: String,
    default: 'default'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: Number,
    default: 1
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
workflowSchema.plugin(mongoosePaginate);

// Update timestamp on save
workflowSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
workflowSchema.index({ organization: 1, isActive: 1 });
workflowSchema.index({ createdBy: 1 });

export default mongoose.model('Workflow', workflowSchema);