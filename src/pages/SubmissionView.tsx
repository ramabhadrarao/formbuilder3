import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock, FileText, Download, MessageSquare, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { submissionsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Submission {
  _id: string;
  form: {
    _id: string;
    title: string;
    fields: any[];
  };
  data: { [key: string]: any };
  submittedBy: {
    name: string;
    email: string;
  };
  status: string;
  currentStage: string;
  priority: string;
  workflowHistory: Array<{
    stage: string;
    user: {
      name: string;
      email: string;
    };
    action: string;
    comment?: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
  files?: Array<{
    fieldId: string;
    filename: string;
    originalName: string;
    size: number;
  }>;
}

const SubmissionView: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const fetchSubmission = async () => {
    try {
      const response = await submissionsAPI.getById(id!);
      setSubmission(response.data.data);
      setNewStatus(response.data.data.status);
    } catch (error) {
      console.error('Error fetching submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!submission || newStatus === submission.status) return;

    try {
      setUpdating(true);
      await submissionsAPI.updateStatus(id!, {
        status: newStatus,
        comment: comment.trim() || undefined
      });
      
      setComment('');
      fetchSubmission(); // Refresh data
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const renderFieldValue = (field: any, value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">No data</span>;
    }

    switch (field.type) {
      case 'checkbox':
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : <span className="text-gray-400 italic">None selected</span>;
        }
        return value;

      case 'file':
        const file = submission?.files?.find(f => f.fieldId === field.id);
        if (file) {
          return (
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" />
              <span>{file.originalName}</span>
              <span className="text-sm text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
              <button className="text-blue-600 hover:text-blue-800 text-sm">
                <Download className="h-4 w-4" />
              </button>
            </div>
          );
        }
        return <span className="text-gray-400 italic">No file uploaded</span>;

      case 'date':
        return value ? new Date(value).toLocaleDateString() : <span className="text-gray-400 italic">No date</span>;

      case 'textarea':
        return (
          <div className="whitespace-pre-wrap bg-gray-50 p-3 rounded border">
            {value}
          </div>
        );

      default:
        return value.toString();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'submitted':
      case 'in_review':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const canUpdateStatus = () => {
    return user?.role === 'admin' || user?.permissions?.includes('view_submissions');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Submission not found</h3>
          <p className="text-gray-600 mb-4">The submission you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/submissions"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Submissions
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              to="/submissions"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{submission.form.title}</h1>
              <p className="text-gray-600 mt-1">Submission Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(submission.status)}
            <span className="text-lg font-medium text-gray-900 capitalize">
              {submission.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Submission Info */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Submission Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Submitted by</p>
                    <p className="font-medium text-gray-900">{submission.submittedBy.name}</p>
                    <p className="text-sm text-gray-600">{submission.submittedBy.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Submitted on</p>
                    <p className="font-medium text-gray-900">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(submission.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Current Stage</p>
                    <p className="font-medium text-gray-900">{submission.currentStage}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Priority</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      submission.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      submission.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      submission.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {submission.priority.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Data */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Data</h2>
              <div className="space-y-6">
                {submission.form.fields.map((field: any) => (
                  <div key={field.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="font-medium text-gray-900">{field.label}</p>
                        <p className="text-sm text-gray-500 capitalize">{field.type}</p>
                        {field.required && (
                          <span className="text-xs text-red-600">Required</span>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        {renderFieldValue(field, submission.data[field.id])}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow History */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Activity History</h2>
              <div className="space-y-4">
                {submission.workflowHistory.map((entry, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">{entry.user.name}</p>
                        <span className="text-sm text-gray-500">•</span>
                        <p className="text-sm text-gray-500">{entry.action}</p>
                        <span className="text-sm text-gray-500">•</span>
                        <p className="text-sm text-gray-500">
                          {new Date(entry.timestamp).toLocaleDateString()} at{' '}
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600">Stage: {entry.stage}</p>
                      {entry.comment && (
                        <div className="mt-2 p-3 bg-gray-50 rounded border">
                          <p className="text-sm text-gray-700">{entry.comment}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Status Update */}
            {canUpdateStatus() && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Status
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="draft">Draft</option>
                      <option value="submitted">Submitted</option>
                      <option value="in_review">In Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comment (Optional)
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Add a comment about this status change..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <button
                    onClick={handleStatusUpdate}
                    disabled={updating || newStatus === submission.status}
                    className="w-full py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updating ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Status'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to={`/forms/${submission.form._id}`}
                  className="flex items-center p-3 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <FileText className="h-5 w-5 mr-3" />
                  View Form
                </Link>
                <button className="flex items-center w-full p-3 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                  <Download className="h-5 w-5 mr-3" />
                  Export Data
                </button>
                <button className="flex items-center w-full p-3 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionView;