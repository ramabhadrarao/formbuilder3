import Workflow from '../models/Workflow.js';

export const createWorkflow = async (req, res) => {
  try {
    const workflowData = {
      ...req.body,
      createdBy: req.user.id,
      organization: req.user.organization
    };

    const workflow = await Workflow.create(workflowData);
    await workflow.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getWorkflows = async (req, res) => {
  try {
    const { page = 1, limit = 10, isActive } = req.query;

    const query = { organization: req.user.organization };

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      populate: { path: 'createdBy', select: 'name email' },
      sort: { createdAt: -1 }
    };

    const workflows = await Workflow.paginate(query, options);

    res.json({
      success: true,
      data: workflows.docs,
      pagination: {
        page: workflows.page,
        pages: workflows.pages,
        total: workflows.total,
        limit: workflows.limit
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('stages.allowedUsers', 'name email');

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    if (workflow.organization !== req.user.organization && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this workflow'
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateWorkflow = async (req, res) => {
  try {
    let workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    if (req.user.role !== 'admin' && 
        workflow.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this workflow'
      });
    }

    // Increment version if stages are modified
    if (req.body.stages && JSON.stringify(req.body.stages) !== JSON.stringify(workflow.stages)) {
      req.body.version = workflow.version + 1;
    }

    workflow = await Workflow.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('stages.allowedUsers', 'name email');

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteWorkflow = async (req, res) => {
  try {
    const workflow = await Workflow.findById(req.params.id);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        message: 'Workflow not found'
      });
    }

    if (req.user.role !== 'admin' && 
        workflow.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this workflow'
      });
    }

    await Workflow.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};