import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const fieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ['text', 'textarea', 'number', 'email', 'password', 'select', 'radio', 'checkbox', 'date', 'file', 'section']
  },
  label: { type: String, required: true },
  placeholder: String,
  required: { type: Boolean, default: false },
  options: [String], // for select, radio, checkbox
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    message: String
  },
  conditional: {
    field: String,
    operator: { type: String, enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than'] },
    value: String,
    show: { type: Boolean, default: true }
  },
  defaultValue: mongoose.Schema.Types.Mixed,
  helpText: String,
  order: { type: Number, default: 0 }
});

const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Form title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  fields: [fieldSchema],
  settings: {
    allowMultipleSubmissions: { type: Boolean, default: false },
    requireLogin: { type: Boolean, default: true },
    showProgress: { type: Boolean, default: true },
    confirmationMessage: { type: String, default: 'Thank you for your submission!' }
  },
  styling: {
    theme: { type: String, default: 'default' },
    primaryColor: { type: String, default: '#3B82F6' },
    backgroundColor: { type: String, default: '#FFFFFF' }
  },
  workflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedRoles: [String],
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
  tags: [String],
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
formSchema.plugin(mongoosePaginate);

// Update timestamp on save
formSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better performance
formSchema.index({ organization: 1, isActive: 1 });
formSchema.index({ createdBy: 1 });
formSchema.index({ tags: 1 });

export default mongoose.model('Form', formSchema);