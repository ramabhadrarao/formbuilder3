import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

// Enhanced field schema with all field types and advanced features
const fieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'text', 'textarea', 'number', 'email', 'password', 'url', 'tel',
      'select', 'multiselect', 'radio', 'checkbox', 'toggle',
      'date', 'datetime', 'time', 'daterange',
      'file', 'image', 'signature',
      'section', 'divider', 'heading',
      'rating', 'slider', 'color',
      'location', 'address',
      'lookup', 'formula', 'autoincrement',
      'nested_form', 'repeater', 'grid'
    ]
  },
  label: { type: String, required: true },
  placeholder: String,
  required: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  hidden: { type: Boolean, default: false },
  
  // Options for select, radio, checkbox
  options: [{
    value: String,
    label: String,
    color: String,
    icon: String
  }],
  
  // Validation rules
  validation: {
    min: mongoose.Schema.Types.Mixed,
    max: mongoose.Schema.Types.Mixed,
    minLength: Number,
    maxLength: Number,
    pattern: String,
    customValidator: String, // JavaScript function as string
    message: String,
    unique: { type: Boolean, default: false },
    allowedFileTypes: [String],
    maxFileSize: Number, // in MB
    minFiles: Number,
    maxFiles: Number,
    dimensions: {
      minWidth: Number,
      maxWidth: Number,
      minHeight: Number,
      maxHeight: Number
    }
  },
  
  // Conditional logic
  conditional: {
    enabled: { type: Boolean, default: false },
    rules: [{
      field: String,
      operator: { 
        type: String, 
        enum: ['equals', 'not_equals', 'contains', 'not_contains', 'greater_than', 'less_than', 'is_empty', 'is_not_empty', 'in', 'not_in']
      },
      value: mongoose.Schema.Types.Mixed,
      action: { 
        type: String, 
        enum: ['show', 'hide', 'enable', 'disable', 'require', 'unrequire']
      }
    }],
    logicalOperator: { type: String, enum: ['AND', 'OR'], default: 'AND' }
  },
  
  // Lookup configuration
  lookup: {
    enabled: { type: Boolean, default: false },
    source: { type: String, enum: ['form', 'api', 'database', 'custom'] },
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form' },
    apiEndpoint: String,
    headers: mongoose.Schema.Types.Mixed,
    searchField: String,
    displayField: String,
    valueField: String,
    filters: mongoose.Schema.Types.Mixed,
    cascadeTo: [String], // Field IDs that depend on this lookup
    refreshOn: [String], // Field IDs that trigger refresh
    cache: { type: Boolean, default: true },
    cacheTimeout: { type: Number, default: 300 } // seconds
  },
  
  // Formula configuration
  formula: {
    enabled: { type: Boolean, default: false },
    expression: String, // JavaScript expression
    dependencies: [String], // Field IDs used in formula
    precision: Number,
    format: String
  },
  
  // Nested form / Master-detail configuration
  nestedForm: {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form' },
    minItems: { type: Number, default: 0 },
    maxItems: Number,
    allowAdd: { type: Boolean, default: true },
    allowEdit: { type: Boolean, default: true },
    allowDelete: { type: Boolean, default: true },
    allowReorder: { type: Boolean, default: true },
    displayMode: { type: String, enum: ['table', 'cards', 'accordion'], default: 'table' },
    summaryFields: [String] // Fields to show in summary view
  },
  
  // Grid configuration for tabular data entry
  grid: {
    columns: [{
      id: String,
      label: String,
      type: String,
      width: Number,
      required: Boolean,
      options: mongoose.Schema.Types.Mixed
    }],
    minRows: { type: Number, default: 1 },
    maxRows: Number,
    allowAdd: { type: Boolean, default: true },
    allowDelete: { type: Boolean, default: true },
    showRowNumbers: { type: Boolean, default: true }
  },
  
  // Default value
  defaultValue: mongoose.Schema.Types.Mixed,
  
  // Help text and tooltips
  helpText: String,
  tooltip: String,
  
  // Layout
  width: { type: String, enum: ['25%', '33%', '50%', '66%', '75%', '100%'], default: '100%' },
  order: { type: Number, default: 0 },
  
  // Advanced properties
  prefix: String,
  suffix: String,
  mask: String, // Input mask pattern
  icon: String,
  className: String,
  attributes: mongoose.Schema.Types.Mixed // Custom HTML attributes
});

// Form schema
const formSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Form title is required'],
    trim: true
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['standard', 'master', 'detail', 'wizard', 'survey'],
    default: 'standard'
  },
  category: {
    type: String,
    trim: true
  },
  icon: String,
  
  // Master-detail relationship
  masterForm: {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form' },
    linkField: String, // Field in detail form that links to master
    cascadeDelete: { type: Boolean, default: false }
  },
  
  // Form fields
  fields: [fieldSchema],
  
  // Form pages for wizard/multi-step forms
  pages: [{
    id: String,
    title: String,
    description: String,
    fields: [String], // Field IDs
    order: Number
  }],
  
  // Form settings
  settings: {
    allowMultipleSubmissions: { type: Boolean, default: false },
    allowSaveDraft: { type: Boolean, default: true },
    allowPrint: { type: Boolean, default: true },
    allowExport: { type: Boolean, default: true },
    requireLogin: { type: Boolean, default: true },
    captchaEnabled: { type: Boolean, default: false },
    showProgress: { type: Boolean, default: true },
    showPageNumbers: { type: Boolean, default: true },
    submitButtonText: { type: String, default: 'Submit' },
    saveButtonText: { type: String, default: 'Save Draft' },
    confirmationMessage: { type: String, default: 'Thank you for your submission!' },
    redirectUrl: String,
    emailNotifications: {
      enabled: { type: Boolean, default: false },
      recipients: [String],
      subject: String,
      template: String,
      includeSubmissionData: { type: Boolean, default: true }
    },
    autoSave: {
      enabled: { type: Boolean, default: false },
      interval: { type: Number, default: 30 } // seconds
    },
    scheduling: {
      enabled: { type: Boolean, default: false },
      startDate: Date,
      endDate: Date,
      timezone: String,
      closedMessage: String
    },
    quotas: {
      enabled: { type: Boolean, default: false },
      maxSubmissions: Number,
      quotaReachedMessage: String
    },
    dataRetention: {
      enabled: { type: Boolean, default: false },
      days: Number,
      action: { type: String, enum: ['delete', 'archive'], default: 'archive' }
    }
  },
  
  // Form styling
  styling: {
    theme: { type: String, default: 'default' },
    primaryColor: { type: String, default: '#3B82F6' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    fontFamily: String,
    fontSize: String,
    customCSS: String,
    layout: { type: String, enum: ['single-column', 'two-column', 'custom'], default: 'single-column' }
  },
  
  // Workflow configuration
  workflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workflow'
  },
  
  // Permissions
  permissions: {
    viewForm: {
      public: { type: Boolean, default: false },
      roles: [String],
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      conditions: mongoose.Schema.Types.Mixed
    },
    submitForm: {
      public: { type: Boolean, default: false },
      roles: [String],
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      conditions: mongoose.Schema.Types.Mixed
    },
    editSubmissions: {
      roles: [String],
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      ownSubmissionsOnly: { type: Boolean, default: true }
    },
    viewSubmissions: {
      roles: [String],
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      ownSubmissionsOnly: { type: Boolean, default: true }
    },
    deleteSubmissions: {
      roles: [String],
      users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      ownSubmissionsOnly: { type: Boolean, default: true }
    }
  },
  
  // Integrations
  integrations: [{
    type: { type: String, enum: ['webhook', 'email', 'api', 'database'] },
    name: String,
    enabled: { type: Boolean, default: true },
    trigger: { type: String, enum: ['on_submit', 'on_approve', 'on_reject', 'on_update'] },
    config: mongoose.Schema.Types.Mixed
  }],
  
  // Metadata
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
  isTemplate: {
    type: Boolean,
    default: false
  },
  version: {
    type: Number,
    default: 1
  },
  publishedVersion: Number,
  tags: [String],
  
  // Analytics
  analytics: {
    views: { type: Number, default: 0 },
    submissions: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageTime: { type: Number, default: 0 } // seconds
  },
  
  // Audit fields
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
formSchema.index({ organization: 1, isActive: 1 });
formSchema.index({ createdBy: 1 });
formSchema.index({ tags: 1 });
formSchema.index({ code: 1 });
formSchema.index({ 'masterForm.formId': 1 });
formSchema.index({ type: 1 });
formSchema.index({ category: 1 });

// Add pagination plugin
formSchema.plugin(mongoosePaginate);

// Update timestamp on save
formSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Generate code if not provided
  if (!this.code && this.isNew) {
    this.code = 'FORM-' + Date.now().toString(36).toUpperCase();
  }
  
  next();
});

// Virtual for detail forms
formSchema.virtual('detailForms', {
  ref: 'Form',
  localField: '_id',
  foreignField: 'masterForm.formId',
  justOne: false
});

// Methods
formSchema.methods.canView = function(user) {
  const perms = this.permissions.viewForm;
  
  if (perms.public) return true;
  if (perms.users.includes(user._id)) return true;
  if (perms.roles.some(role => user.role === role)) return true;
  
  return false;
};

formSchema.methods.canSubmit = function(user) {
  const perms = this.permissions.submitForm;
  
  if (perms.public) return true;
  if (!user && !this.settings.requireLogin) return true;
  if (perms.users.includes(user?._id)) return true;
  if (perms.roles.some(role => user?.role === role)) return true;
  
  return false;
};

export default mongoose.model('Form', formSchema);