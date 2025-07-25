import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, Calendar, User, FileText, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { submissionsAPI, formsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Submission {
  _id: string;
  form: {
    _id: string;
    title: string;
  };
  submittedBy: {
    name: string;
    email: string;
  };
  status: string;
  currentStage: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface Form {
  _id: string;
  title: string;
}

const statusConfig = {
  draft: { color: 'bg-gray-100 text-gray-800', icon: Clock },
  submitted: { color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  in_review: { color: 'bg-blue-100 text-blue-800', icon: Clock },
  approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { color: 'bg-red-100 text-red-800', icon: XCircle },
  completed: { color: 'bg-purple-100 text-purple-800', icon: CheckCircle }
};

const priorityConfig = {
  low: { color: 'bg-gray-100 text-gray-800' },
  medium: { color: 'bg-yellow-100 text-yellow-800' },
  high: { color: 'bg-orange-100 text-orange-800' },
  urgent: { color: 'bg-red-100 text-red-800' }
};

const Submissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterForm, setFilterForm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
  }, [searchTerm, filterForm, filterStatus, filterPriority]);

  const fetchData = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (filterForm) params.form = filterForm;
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;

      const [submissionsResponse, formsResponse] = await Promise.all([
        submissionsAPI.getAll(params),
        formsAPI.getAll()
      ]);

      setSubmissions(submissionsResponse.data.data);
      setForms(formsResponse.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return AlertCircle;
    return config.icon;
  };

  const getStatusColor = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    return config?.color || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return config?.color || 'bg-gray-100 text-gray-800';
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
        <h1 className="text-3xl font-bold text-gray-900">Submissions</h1>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search submissions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterForm}
            onChange={(e) => setFilterForm(e.target.value)}
          >
            <option value="">All Forms</option>
            {forms.map(form => (
              <option key={form._id} value={form._id}>{form.title}</option>
            ))}
          </select>

          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="completed">Completed</option>
          </select>

          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setFilterForm('');
              setFilterStatus('');
              setFilterPriority('');
            }}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <FileText className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No submissions found</h3>
            <p className="text-gray-600">No submissions match your current filters.</p>
          </div>
        ) : (
          submissions.map((submission) => {
            const StatusIcon = getStatusIcon(submission.status);
            return (
              <div key={submission._id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">
                        {submission.form.title}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(submission.status)}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {submission.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(submission.priority)}`}>
                        {submission.priority.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{submission.submittedBy.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Submitted {new Date(submission.createdAt).toLocaleDateString()}</span>
                      </div>
                      {submission.currentStage && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>Stage: {submission.currentStage}</span>
                        </div>
                      )}
                    </div>

                    {submission.updatedAt !== submission.createdAt && (
                      <p className="text-sm text-gray-500">
                        Last updated: {new Date(submission.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Link
                      to={`/submissions/${submission._id}`}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Submission"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {submissions.length > 0 && (
        <div className="mt-8 flex justify-center">
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              Previous
            </button>
            <span className="px-4 py-2 text-sm text-gray-700">
              Page 1 of 1
            </span>
            <button className="px-3 py-2 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Submissions;