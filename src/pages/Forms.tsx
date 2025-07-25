import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Eye, Edit, Trash2, Copy, MoreVertical } from 'lucide-react';
import { formsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Form {
  _id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  version: number;
  tags: string[];
}

const Forms: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('all');
  const { user } = useAuth();

  useEffect(() => {
    fetchForms();
  }, [searchTerm, filterActive]);

  const fetchForms = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterActive !== 'all') params.isActive = filterActive === 'active';

      const response = await formsAPI.getAll(params);
      setForms(response.data.data);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this form?')) {
      try {
        await formsAPI.delete(id);
        setForms(forms.filter(form => form._id !== id));
      } catch (error) {
        console.error('Error deleting form:', error);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await formsAPI.duplicate(id);
      fetchForms(); // Refresh the list
    } catch (error) {
      console.error('Error duplicating form:', error);
    }
  };

  const canEdit = (form: Form) => {
    return user?.role === 'admin' || form.createdBy.email === user?.email;
  };

  const canDelete = (form: Form) => {
    return user?.role === 'admin' || form.createdBy.email === user?.email;
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
        <h1 className="text-3xl font-bold text-gray-900">Forms</h1>
        {(user?.permissions?.includes('create_forms') || user?.role === 'admin') && (
          <Link
            to="/forms/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Form
          </Link>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search forms..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value)}
          >
            <option value="all">All Forms</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Forms List */}
      <div className="space-y-4">
        {forms.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-600 mb-4">Get started by creating your first form</p>
            {(user?.permissions?.includes('create_forms') || user?.role === 'admin') && (
              <Link
                to="/forms/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Form
              </Link>
            )}
          </div>
        ) : (
          forms.map((form) => (
            <div key={form._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{form.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      form.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {form.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                      v{form.version}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-3">{form.description || 'No description'}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Created by {form.createdBy.name}</span>
                    <span>•</span>
                    <span>{new Date(form.createdAt).toLocaleDateString()}</span>
                    {form.tags.length > 0 && (
                      <>
                        <span>•</span>
                        <div className="flex gap-1">
                          {form.tags.map((tag, index) => (
                            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Link
                    to={`/forms/${form._id}`}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View"
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                  {canEdit(form) && (
                    <Link
                      to={`/forms/${form._id}/edit`}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="h-5 w-5" />
                    </Link>
                  )}
                  <button
                    onClick={() => handleDuplicate(form._id)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  {canDelete(form) && (
                    <button
                      onClick={() => handleDelete(form._id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Forms;