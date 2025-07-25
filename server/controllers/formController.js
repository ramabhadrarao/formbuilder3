import Form from '../models/Form.js';
import Submission from '../models/Submission.js';

export const createForm = async (req, res) => {
  try {
    const formData = {
      ...req.body,
      createdBy: req.user.id,
      lastModifiedBy: req.user.id,
      organization: req.user.organization || 'default'
    };

    const form = await Form.create(formData);
    await form.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: form
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getForms = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      tags,
      isActive,
      createdBy,
      type,
      category,
      masterFormId
    } = req.query;

    const query = { organization: req.user.organization || 'default' };

    // Apply filters
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    if (tags) {
      query.tags = { $in: tags.split(',') };
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (createdBy) {
      query.createdBy = createdBy;
    }

    if (type) {
      query.type = type;
    }

    if (category) {
      query.category = category;
    }

    if (masterFormId) {
      query['masterForm.formId'] = masterFormId;
    }

    // Check user permissions
    const userCanViewAll = req.user.role === 'admin' || 
                          req.user.permissions?.includes('view_all_forms');

    if (!userCanViewAll) {
      // User can only see forms they have permission to view
      query.$or = [
        { createdBy: req.user.id },
        { 'permissions.viewForm.public': true },
        { 'permissions.viewForm.users': req.user.id },
        { 'permissions.viewForm.roles': req.user.role }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'workflow', select: 'name' },
        { path: 'masterForm.formId', select: 'title code' }
      ],
      sort: { createdAt: -1 }
    };

    const forms = await Form.paginate(query, options);

    // Populate virtual fields
    for (let form of forms.docs) {
      if (form.type === 'master') {
        await form.populate('detailForms', 'title code type');
      }
    }

    res.json({
      success: true,
      data: forms.docs,
      pagination: {
        page: forms.page,
        pages: forms.pages,
        total: forms.total,
        limit: forms.limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('lastModifiedBy', 'name email')
      .populate('workflow')
      .populate('masterForm.formId', 'title code')
      .populate('detailForms', 'title code type');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check view permissions
    if (!form.canView(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this form'
      });
    }

    // Track form view
    form.analytics.views += 1;
    await form.save();

    res.json({
      success: true,
      data: form
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateForm = async (req, res) => {
  try {
    let form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check edit permissions
    const canEdit = req.user.role === 'admin' || 
                   form.createdBy.toString() === req.user.id ||
                   req.user.permissions?.includes('edit_all_forms');

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this form'
      });
    }

    // Increment version if fields or workflow are modified
    const fieldsChanged = JSON.stringify(req.body.fields) !== JSON.stringify(form.fields);
    const workflowChanged = req.body.workflow !== form.workflow?.toString();
    
    if (fieldsChanged || workflowChanged) {
      req.body.version = form.version + 1;
    }

    req.body.lastModifiedBy = req.user.id;

    form = await Form.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('lastModifiedBy', 'name email')
     .populate('workflow')
     .populate('masterForm.formId', 'title code');

    res.json({
      success: true,
      data: form
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteForm = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check delete permissions
    const canDelete = req.user.role === 'admin' || 
                     form.createdBy.toString() === req.user.id ||
                     req.user.permissions?.includes('delete_forms');

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this form'
      });
    }

    // Check if form has submissions
    const submissionCount = await Submission.countDocuments({ form: req.params.id });
    if (submissionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete form with ${submissionCount} existing submissions. Archive it instead.`
      });
    }

    // Check if form is a master form with detail forms
    const detailFormsCount = await Form.countDocuments({ 'masterForm.formId': req.params.id });
    if (detailFormsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete master form with ${detailFormsCount} linked detail forms.`
      });
    }

    await Form.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const duplicateForm = async (req, res) => {
  try {
    const originalForm = await Form.findById(req.params.id);

    if (!originalForm) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check view permissions
    if (!originalForm.canView(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to duplicate this form'
      });
    }

    // Create duplicate
    const duplicateData = originalForm.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    delete duplicateData.code; // Will be auto-generated
    
    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.createdBy = req.user.id;
    duplicateData.lastModifiedBy = req.user.id;
    duplicateData.version = 1;
    duplicateData.isActive = false; // Start as inactive
    duplicateData.analytics = {
      views: 0,
      submissions: 0,
      completionRate: 0,
      averageTime: 0
    };

    const duplicatedForm = await Form.create(duplicateData);
    await duplicatedForm.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: duplicatedForm
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getFormStats = async (req, res) => {
  try {
    const organization = req.user.organization || 'default';
    
    const stats = await Form.aggregate([
      { $match: { organization } },
      {
        $group: {
          _id: null,
          totalForms: { $sum: 1 },
          activeForms: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
          },
          inactiveForms: { 
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } 
          },
          standardForms: {
            $sum: { $cond: [{ $eq: ['$type', 'standard'] }, 1, 0] }
          },
          masterForms: {
            $sum: { $cond: [{ $eq: ['$type', 'master'] }, 1, 0] }
          },
          detailForms: {
            $sum: { $cond: [{ $eq: ['$type', 'detail'] }, 1, 0] }
          },
          wizardForms: {
            $sum: { $cond: [{ $eq: ['$type', 'wizard'] }, 1, 0] }
          },
          surveyForms: {
            $sum: { $cond: [{ $eq: ['$type', 'survey'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get category breakdown
    const categoryStats = await Form.aggregate([
      { $match: { organization } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        ...(stats[0] || {
          totalForms: 0,
          activeForms: 0,
          inactiveForms: 0,
          standardForms: 0,
          masterForms: 0,
          detailForms: 0,
          wizardForms: 0,
          surveyForms: 0
        }),
        categories: categoryStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getFormSubmissions = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      submittedBy,
      startDate,
      endDate
    } = req.query;

    const form = await Form.findById(id);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check permissions
    const canViewSubmissions = req.user.role === 'admin' ||
                              form.permissions.viewSubmissions.roles.includes(req.user.role) ||
                              form.permissions.viewSubmissions.users.includes(req.user.id);

    if (!canViewSubmissions) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view submissions for this form'
      });
    }

    const query = { form: id };

    // Apply filters
    if (status) query.status = status;
    if (submittedBy) query.submittedBy = submittedBy;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Check if user can only see own submissions
    if (form.permissions.viewSubmissions.ownSubmissionsOnly && req.user.role !== 'admin') {
      query.submittedBy = req.user.id;
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'submittedBy', select: 'name email' },
        { path: 'lastModifiedBy', select: 'name email' }
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

export const createFormTemplate = async (req, res) => {
  try {
    const form = await Form.findById(req.params.id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check permissions
    const canCreateTemplate = req.user.role === 'admin' || 
                            form.createdBy.toString() === req.user.id;

    if (!canCreateTemplate) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create template from this form'
      });
    }

    // Create template
    const templateData = form.toObject();
    delete templateData._id;
    delete templateData.createdAt;
    delete templateData.updatedAt;
    delete templateData.code;
    delete templateData.analytics;
    
    templateData.title = `${templateData.title} Template`;
    templateData.createdBy = req.user.id;
    templateData.lastModifiedBy = req.user.id;
    templateData.version = 1;
    templateData.isTemplate = true;
    templateData.isActive = false;

    const template = await Form.create(templateData);
    await template.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getFormTemplates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      type
    } = req.query;

    const query = {
      isTemplate: true,
      $or: [
        { organization: req.user.organization || 'default' },
        { 'permissions.viewForm.public': true }
      ]
    };

    if (category) query.category = category;
    if (type) query.type = type;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: { path: 'createdBy', select: 'name email' },
      sort: { createdAt: -1 }
    };

    const templates = await Form.paginate(query, options);

    res.json({
      success: true,
      data: templates.docs,
      pagination: {
        page: templates.page,
        pages: templates.pages,
        total: templates.total,
        limit: templates.limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};