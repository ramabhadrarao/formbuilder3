import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Send, Users, Plus, BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { formsAPI, submissionsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Stats {
  totalForms: number;
  activeForms: number;
  inactiveForms: number;
  totalSubmissions: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalForms: 0,
    activeForms: 0,
    inactiveForms: 0,
    totalSubmissions: 0,
    draftCount: 0,
    submittedCount: 0,
    approvedCount: 0,
    rejectedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [formsResponse, submissionsResponse] = await Promise.all([
          formsAPI.getStats(),
          submissionsAPI.getStats()
        ]);

        setStats({
          ...formsResponse.data.data,
          ...submissionsResponse.data.data
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total Forms',
      value: stats.totalForms,
      icon: FileText,
      color: 'bg-blue-500',
      change: '+2.1%'
    },
    {
      title: 'Active Forms',
      value: stats.activeForms,
      icon: CheckCircle,
      color: 'bg-green-500',
      change: '+4.3%'
    },
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions,
      icon: Send,
      color: 'bg-purple-500',
      change: '+12.5%'
    },
    {
      title: 'Pending Review',
      value: stats.submittedCount,
      icon: Clock,
      color: 'bg-yellow-500',
      change: '-1.2%'
    }
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your forms today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.change} from last month</p>
                </div>
                <div className={`p-3 rounded-full ${card.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/forms/new"
              className="flex items-center p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
            >
              <div className="p-2 bg-blue-500 rounded-lg mr-4 group-hover:bg-blue-600 transition-colors">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Create New Form</h3>
                <p className="text-sm text-gray-600">Build a new form with our intuitive builder</p>
              </div>
            </Link>
            <Link
              to="/submissions"
              className="flex items-center p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors group"
            >
              <div className="p-2 bg-purple-500 rounded-lg mr-4 group-hover:bg-purple-600 transition-colors">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">View Submissions</h3>
                <p className="text-sm text-gray-600">Review and manage form submissions</p>
              </div>
            </Link>
            {(user?.role === 'admin' || user?.permissions?.includes('manage_users')) && (
              <Link
                to="/users"
                className="flex items-center p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
              >
                <div className="p-2 bg-green-500 rounded-lg mr-4 group-hover:bg-green-600 transition-colors">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Manage Users</h3>
                  <p className="text-sm text-gray-600">Add and manage user accounts</p>
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Submission Status Overview */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Submission Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full mr-3"></div>
                <span className="text-gray-600">Draft</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.draftCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                <span className="text-gray-600">Submitted</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.submittedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                <span className="text-gray-600">Approved</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.approvedCount}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
                <span className="text-gray-600">Rejected</span>
              </div>
              <span className="font-semibold text-gray-900">{stats.rejectedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">New form submission received</p>
              <p className="text-xs text-gray-500">Contact Form - 2 minutes ago</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Form "Employee Survey" was published</p>
              <p className="text-xs text-gray-500">1 hour ago</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-gray-50 rounded-lg">
            <Users className="h-5 w-5 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">New user registered</p>
              <p className="text-xs text-gray-500">3 hours ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;