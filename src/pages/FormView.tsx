import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Send, Calendar, User, Tag, Settings } from 'lucide-react';
import { formsAPI, submissionsAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Form {
  _id: string;
  title: string;
  description: string;
  fields: any[];
  settings: any;
  styling: any;
  createdBy: {
    name: string;
    email: string;
  };
  createdAt: string;
  isActive: boolean;
  version: number;
  tags: string[];
}

interface SubmissionData {
  [key: string]: any;
}

const FormView: React.FC = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<SubmissionData>({});
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await formsAPI.getById(id!);
      setForm(response.data.data);
      
      // Initialize form data
      const initialData: SubmissionData = {};
      response.data.data.fields.forEach((field: any) => {
        if (field.defaultValue !== undefined) {
          initialData[field.id] = field.defaultValue;
        } else if (field.type === 'checkbox' && field.options) {
          initialData[field.id] = [];
        } else {
          initialData[field.id] = '';
        }
      });
      setFormData(initialData);
    } catch (error) {
      console.error('Error fetching form:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    form?.fields.forEach((field: any) => {
      if (field.required) {
        const value = formData[field.id];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      // Additional validation based on field type
      if (field.type === 'email' && formData[field.id]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.id])) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }

      if (field.validation) {
        const value = formData[field.id];
        const validation = field.validation;
        
        if (validation.min && value && value.length < validation.min) {
          newErrors[field.id] = `Minimum ${validation.min} characters required`;
        }
        
        if (validation.max && value && value.length > validation.max) {
          newErrors[field.id] = `Maximum ${validation.max} characters allowed`;
        }
        
        if (validation.pattern && value) {
          const regex = new RegExp(validation.pattern);
          if (!regex.test(value)) {
            newErrors[field.id] = validation.message || 'Invalid format';
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    
    // Clear error for this field
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (fieldId: string, option: string, checked: boolean) => {
    setFormData(prev => {
      const currentValues = prev[fieldId] || [];
      if (checked) {
        return { ...prev, [fieldId]: [...currentValues, option] };
      } else {
        return { ...prev, [fieldId]: currentValues.filter((v: string) => v !== option) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      await submissionsAPI.create({
        form: id,
        data: formData,
        metadata: {
          submissionTime: Date.now() - (Date.now() - 60000) // Placeholder for actual time tracking
        }
      });
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field: any) => {
    const hasError = errors[field.id];
    const errorClass = hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={field.type}
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            placeholder={field.placeholder}
            rows={4}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option: string, index: number) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                  checked={formData[field.id] === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-3 rounded text-blue-600 focus:ring-blue-500"
                  checked={(formData[field.id] || []).includes(option)}
                  onChange={(e) => handleCheckboxChange(field.id, option, e.target.checked)}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
          />
        );

      case 'file':
        return (
          <input
            type="file"
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleInputChange(field.id, file);
              }
            }}
          />
        );

      case 'section':
        return (
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
            {field.helpText && <p className="text-gray-600 mt-1">{field.helpText}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const canEdit = () => {
    return user?.role === 'admin' || form?.createdBy.email === user?.email;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Form not found</h3>
          <p className="text-gray-600 mb-4">The form you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/forms"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Forms
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Send className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600 mb-6">
              {form.settings.confirmationMessage}
            </p>
            <Link
              to="/forms"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Forms
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link
              to="/forms"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{form.title}</h1>
              {form.description && (
                <p className="text-gray-600 mt-1">{form.description}</p>
              )}
            </div>
          </div>
          {canEdit() && (
            <Link
              to={`/forms/${id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-5 w-5 mr-2" />
              Edit Form
            </Link>
          )}
        </div>

        {/* Form Info */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Created by</p>
                <p className="font-medium text-gray-900">{form.createdBy.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Created on</p>
                <p className="font-medium text-gray-900">
                  {new Date(form.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  form.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          
          {form.tags.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Tags:</span>
                <div className="flex gap-2">
                  {form.tags.map((tag, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200" style={{
          backgroundColor: form.styling.backgroundColor
        }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {form.fields.map((field: any) => (
              <div key={field.id} className="space-y-2">
                {field.type !== 'section' && (
                  <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                )}
                
                {renderField(field)}
                
                {errors[field.id] && (
                  <p className="text-sm text-red-600">{errors[field.id]}</p>
                )}
                
                {field.helpText && field.type !== 'section' && (
                  <p className="text-sm text-gray-500">{field.helpText}</p>
                )}
              </div>
            ))}

            {form.fields.length > 0 && (
              <div className="pt-6">
                <button
                  type="submit"
                  disabled={submitting || !form.isActive}
                  className="w-full py-3 px-6 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: form.styling.primaryColor }}
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Form'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default FormView;