import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Settings, Workflow as WorkflowIcon } from 'lucide-react';
import { workflowsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Workflow {
  _id: string;
  name: string;
  description: string;
  stages: Array<{
    id: string;
    name: string;
    description: string;
    allowedRoles: string[];
    order: number;
  }>;
  initialStage: string;
  finalStages: string[];
  isActive: boolean;
  version: number;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
}

const Workflows: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflow, setNewWorkflow] = useState({
    name: '',
    description: '',
    stages: [
      { id: 'draft', name: 'Draft', description: 'Initial draft stage', allowedRoles: ['user'], order: 0 },
      { id: 'review', name: 'Under Review', description: 'Review stage', allowedRoles: ['manager'], order: 1 },
      { id: 'approved', name: 'Approved', description: 'Final approval', allowedRoles: ['admin'], order: 2 }
    ],
    initialStage: 'draft',
    finalStages: ['approved']
  });
  const { user } = useAuth();

  useEffect(() => {
    fetchWorkflows();
  }, [searchTerm]);

  const fetchWorkflows = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;

      const response = await workflowsAPI.getAll(params);
      setWorkflows(response.data.data);
    } catch (error) {
      console.error('Error fetching workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkflow = async () => {
    try {
      await workflowsAPI.create(newWorkflow);
      setShowCreateModal(false);
      setNewWorkflow({
        name: '',
        description: '',
        stages: [
          { id: 'draft', name: 'Draft', description: 'Initial draft stage', allowedRoles: ['user'], order: 0 },
          { id: 'review', name: 'Under Review', description: 'Review stage', allowedRoles: ['manager'], order: 1 },
          { id: 'approved', name: 'Approved', description: 'Final approval', allowedRoles: ['admin'], order: 2 }
        ],
        initialStage: 'draft',
        finalStages: ['approved']
      });
      fetchWorkflows();
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await workflowsAPI.delete(id);
        setWorkflows(workflows.filter(workflow => workflow._id !== id));
      } catch (error) {
        console.error('Error deleting workflow:', error);
      }
    }
  };

  const canCreate = user?.permissions?.includes('manage_workflows') || user?.role === 'admin';
  const canEdit = (workflow: Workflow) => {
    return user?.role === 'admin' || workflow.createdBy.email === user?.email;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Workflow
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search workflows..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <WorkflowIcon className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows yet</h3>
            <p className="text-gray-600 mb-4">Create your first workflow to get started</p>
            {canCreate && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Workflow
              </button>
            )}
          </div>
        ) : (
          workflows.map((workflow) => (
            <div key={workflow._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{workflow.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      workflow.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {workflow.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      v{workflow.version}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{workflow.description || 'No description'}</p>
                  
                  {/* Workflow Stages */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Stages:</h4>
                    <div className="flex flex-wrap gap-2">
                      {workflow.stages
                        .sort((a, b) => a.order - b.order)
                        .map((stage, index) => (
                          <div key={stage.id} className="flex items-center">
                            <span className={`px-2 py-1 text-xs rounded ${
                              stage.id === workflow.initialStage
                                ? 'bg-blue-100 text-blue-800'
                                : workflow.finalStages.includes(stage.id)
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {stage.name}
                            </span>
                            {index < workflow.stages.length - 1 && (
                              <span className="mx-2 text-gray-400">→</span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Created by {workflow.createdBy.name}</span>
                    <span>•</span>
                    <span>{new Date(workflow.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{workflow.stages.length} stages</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  <button
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  {canEdit(workflow) && (
                    <>
                      <button
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow._id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Workflow Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Workflow</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workflow Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={newWorkflow.name}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter workflow name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={newWorkflow.description}
                    onChange={(e) => setNewWorkflow(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your workflow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stages
                  </label>
                  <div className="space-y-2">
                    {newWorkflow.stages.map((stage, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                        <span className="text-sm font-medium text-gray-700">{index + 1}.</span>
                        <input
                          type="text"
                          className="flex-1 px-2 py-1 border border-gray-300 rounded"
                          value={stage.name}
                          onChange={(e) => {
                            const updatedStages = [...newWorkflow.stages];
                            updatedStages[index] = { ...stage, name: e.target.value };
                            setNewWorkflow(prev => ({ ...prev, stages: updatedStages }));
                          }}
                        />
                        <select
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                          value={stage.allowedRoles[0]}
                          onChange={(e) => {
                            const updatedStages = [...newWorkflow.stages];
                            updatedStages[index] = { ...stage, allowedRoles: [e.target.value] };
                            setNewWorkflow(prev => ({ ...prev, stages: updatedStages }));
                          }}
                        >
                          <option value="user">User</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateWorkflow}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Workflow
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Workflows;