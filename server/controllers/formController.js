import Form from '../models/Form.js';
import Submission from '../models/Submission.js';

export const createForm = async (req, res) => {
  try {
    const formData = {
      ...req.body,
      createdBy: req.user.id,
      organization: req.user.organization
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
      createdBy
    } = req.query;

    const query = { organization: req.user.organization };

    // Apply filters
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
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

    // If user is not admin, only show forms they created or are assigned to
    if (req.user.role !== 'admin') {
      query.$or = [
        { createdBy: req.user.id },
        { assignedUsers: req.user.id },
        { assignedRoles: req.user.role }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: [
        { path: 'createdBy', select: 'name email' },
        { path: 'workflow', select: 'name' },
        { path: 'assignedUsers', select: 'name email' }
      ],
      sort: { createdAt: -1 }
    };

    const forms = await Form.paginate(query, options);

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
      .populate('workflow')
      .populate('assignedUsers', 'name email');

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Check access permissions
    if (req.user.role !== 'admin' && 
        form.organization !== req.user.organization) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this form'
      });
    }

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

    // Check ownership or admin role
    if (req.user.role !== 'admin' && 
        form.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this form'
      });
    }

    // Increment version if fields are modified
    if (req.body.fields && JSON.stringify(req.body.fields) !== JSON.stringify(form.fields)) {
      req.body.version = form.version + 1;
    }

    form = await Form.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('workflow')
     .populate('assignedUsers', 'name email');

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

    // Check ownership or admin role
    if (req.user.role !== 'admin' && 
        form.createdBy.toString() !== req.user.id) {
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
        message: 'Cannot delete form with existing submissions. Archive it instead.'
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

    // Create duplicate
    const duplicateData = originalForm.toObject();
    delete duplicateData._id;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;
    
    duplicateData.title = `${duplicateData.title} (Copy)`;
    duplicateData.createdBy = req.user.id;
    duplicateData.version = 1;

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
    const stats = await Form.aggregate([
      { $match: { organization: req.user.organization } },
      {
        $group: {
          _id: null,
          totalForms: { $sum: 1 },
          activeForms: { 
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } 
          },
          inactiveForms: { 
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } 
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || { totalForms: 0, activeForms: 0, inactiveForms: 0 }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};