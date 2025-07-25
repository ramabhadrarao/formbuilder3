import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Edit, Send, Calendar, User, Tag, Settings, Upload, X, 
  Plus, Trash2, Image, MapPin, Star, ChevronDown, ChevronUp,
  Grid3X3, Copy, FileText, Clock
} from 'lucide-react';
import { formsAPI, submissionsAPI, filesAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';

interface Form {
  _id: string;
  title: string;
  code?: string;
  description: string;
  type: string;
  fields: any[];
  settings: any;
  styling: any;
  permissions: any;
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

interface FileData {
  fieldId: string;
  fileId: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype?: string;
  file?: File;
}

interface NestedSubmission {
  fieldId: string;
  data: SubmissionData[];
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
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: string]: FileData }>({});
  const [uploadingFiles, setUploadingFiles] = useState<{ [key: string]: boolean }>({});
  const [nestedSubmissions, setNestedSubmissions] = useState<{ [key: string]: SubmissionData[] }>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    fetchForm();
  }, [id]);

  const fetchForm = async () => {
    try {
      const response = await formsAPI.getById(id!);
      const formData = response.data.data;
      setForm(formData);
      
      // Initialize form data
      const initialData: SubmissionData = {};
      formData.fields.forEach((field: any) => {
        if (field.defaultValue !== undefined) {
          initialData[field.id] = field.defaultValue;
        } else if (field.type === 'checkbox' || field.type === 'multiselect') {
          initialData[field.id] = [];
        } else if (field.type === 'toggle') {
          initialData[field.id] = false;
        } else if (field.type === 'rating') {
          initialData[field.id] = 0;
        } else if (field.type === 'slider') {
          initialData[field.id] = field.validation?.min || 0;
        } else if (field.type === 'grid') {
          initialData[field.id] = [{}]; // Start with one empty row
        } else {
          initialData[field.id] = '';
        }
        
        // Initialize nested forms
        if (field.type === 'nested_form' || field.type === 'repeater') {
          setNestedSubmissions(prev => ({
            ...prev,
            [field.id]: []
          }));
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
    const currentFields = form?.type === 'wizard' && form.pages 
      ? form.fields.filter(f => form.pages[currentPage].fields.includes(f.id))
      : form?.fields || [];
    
    currentFields.forEach((field: any) => {
      // Skip hidden fields
      if (field.hidden || !evaluateCondition(field)) {
        return;
      }

      if (field.required) {
        const value = formData[field.id];
        if (field.type === 'file' || field.type === 'image') {
          if (!uploadedFiles[field.id]) {
            newErrors[field.id] = `${field.label} is required`;
          }
        } else if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.id] = `${field.label} is required`;
        }
      }

      // Field-specific validation
      const value = formData[field.id];
      if (value) {
        if (field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            newErrors[field.id] = 'Please enter a valid email address';
          }
        }

        if (field.type === 'url') {
          try {
            new URL(value);
          } catch {
            newErrors[field.id] = 'Please enter a valid URL';
          }
        }

        if (field.type === 'tel') {
          const phoneRegex = /^[\d\s\-\+\(\)]+$/;
          if (!phoneRegex.test(value)) {
            newErrors[field.id] = 'Please enter a valid phone number';
          }
        }

        // Custom validation rules
        if (field.validation) {
          const validation = field.validation;
          
          if (validation.min !== undefined && parseFloat(value) < validation.min) {
            newErrors[field.id] = `Minimum value is ${validation.min}`;
          }
          
          if (validation.max !== undefined && parseFloat(value) > validation.max) {
            newErrors[field.id] = `Maximum value is ${validation.max}`;
          }
          
          if (validation.minLength && value.length < validation.minLength) {
            newErrors[field.id] = `Minimum ${validation.minLength} characters required`;
          }
          
          if (validation.maxLength && value.length > validation.maxLength) {
            newErrors[field.id] = `Maximum ${validation.maxLength} characters allowed`;
          }
          
          if (validation.pattern) {
            const regex = new RegExp(validation.pattern);
            if (!regex.test(value)) {
              newErrors[field.id] = validation.message || 'Invalid format';
            }
          }
        }
      }

      // Validate nested forms
      if ((field.type === 'nested_form' || field.type === 'repeater') && field.nestedForm) {
        const nested = nestedSubmissions[field.id] || [];
        if (field.nestedForm.minItems && nested.length < field.nestedForm.minItems) {
          newErrors[field.id] = `Minimum ${field.nestedForm.minItems} items required`;
        }
        if (field.nestedForm.maxItems && nested.length > field.nestedForm.maxItems) {
          newErrors[field.id] = `Maximum ${field.nestedForm.maxItems} items allowed`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const evaluateCondition = (field: any) => {
    if (!field.conditional?.enabled || !field.conditional?.rules?.length) {
      return true;
    }

    const rules = field.conditional.rules;
    const operator = field.conditional.logicalOperator || 'AND';

    const results = rules.map((rule: any) => {
      const sourceValue = formData[rule.field];
      const targetValue = rule.value;

      switch (rule.operator) {
        case 'equals':
          return sourceValue === targetValue;
        case 'not_equals':
          return sourceValue !== targetValue;
        case 'contains':
          return sourceValue?.toString().includes(targetValue);
        case 'not_contains':
          return !sourceValue?.toString().includes(targetValue);
        case 'greater_than':
          return parseFloat(sourceValue) > parseFloat(targetValue);
        case 'less_than':
          return parseFloat(sourceValue) < parseFloat(targetValue);
        case 'is_empty':
          return !sourceValue || (Array.isArray(sourceValue) && sourceValue.length === 0);
        case 'is_not_empty':
          return !!sourceValue && (!Array.isArray(sourceValue) || sourceValue.length > 0);
        case 'in':
          return targetValue.includes(sourceValue);
        case 'not_in':
          return !targetValue.includes(sourceValue);
        default:
          return true;
      }
    });

    return operator === 'AND' ? results.every(r => r) : results.some(r => r);
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

    // Handle cascading lookups
    const field = form?.fields.find(f => f.id === fieldId);
    if (field?.lookup?.cascadeTo) {
      // Reset cascaded fields
      field.lookup.cascadeTo.forEach((cascadeFieldId: string) => {
        setFormData(prev => ({ ...prev, [cascadeFieldId]: '' }));
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

  const handleFileUpload = async (fieldId: string, file: File) => {
    try {
      setUploadingFiles(prev => ({ ...prev, [fieldId]: true }));
      
      const response = await filesAPI.upload(file);
      const fileData = response.data.data;
      
      setUploadedFiles(prev => ({
        ...prev,
        [fieldId]: {
          fieldId,
          fileId: fileData.id,
          filename: fileData.filename,
          originalName: fileData.filename,
          size: fileData.size,
          mimetype: fileData.mimetype,
          file
        }
      }));
      
      if (errors[fieldId]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[fieldId];
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrors(prev => ({
        ...prev,
        [fieldId]: 'File upload failed. Please try again.'
      }));
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  const handleFileRemove = async (fieldId: string) => {
    const fileData = uploadedFiles[fieldId];
    if (fileData && fileData.fileId) {
      try {
        await filesAPI.delete(fileData.fileId);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
    
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[fieldId];
      return newFiles;
    });
  };

  const addNestedItem = (fieldId: string) => {
    const field = form?.fields.find(f => f.id === fieldId);
    if (!field) return;

    setNestedSubmissions(prev => {
      const current = prev[fieldId] || [];
      const newItem: SubmissionData = {};
      
      // Initialize with default values if nested form is defined
      if (field.nestedForm?.formId) {
        // In a real implementation, we would fetch the nested form structure
        // For now, we'll use a simple structure
      }
      
      return {
        ...prev,
        [fieldId]: [...current, newItem]
      };
    });
  };

  const removeNestedItem = (fieldId: string, index: number) => {
    setNestedSubmissions(prev => ({
      ...prev,
      [fieldId]: prev[fieldId].filter((_, i) => i !== index)
    }));
  };

  const updateNestedItem = (fieldId: string, index: number, data: SubmissionData) => {
    setNestedSubmissions(prev => ({
      ...prev,
      [fieldId]: prev[fieldId].map((item, i) => i === index ? data : item)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      
      const files = Object.values(uploadedFiles).map(file => ({
        fieldId: file.fieldId,
        fileId: file.fileId,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size,
        mimetype: file.mimetype
      }));
      
      await submissionsAPI.create({
        form: id,
        data: formData,
        files: files.length > 0 ? files : undefined,
        nestedSubmissions: Object.entries(nestedSubmissions).map(([fieldId, submissions]) => ({
          fieldId,
          submissions
        })),
        metadata: {
          submissionTime: Date.now() - (Date.now() - 60000)
        }
      });
      setSubmitted(true);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      alert(error.response?.data?.message || 'Error submitting form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSavingDraft(true);
      
      const files = Object.values(uploadedFiles).map(file => ({
        fieldId: file.fieldId,
        fileId: file.fileId,
        filename: file.filename,
        originalName: file.originalName,
        size: file.size
      }));
      
      await submissionsAPI.create({
        form: id,
        data: formData,
        files: files.length > 0 ? files : undefined,
        status: 'draft',
        metadata: {}
      });
      
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Error saving draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const renderField = (field: any) => {
    // Check conditional visibility
    if (!evaluateCondition(field)) {
      return null;
    }

    const hasError = errors[field.id];
    const errorClass = hasError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
    const isReadonly = field.readonly || false;
    const isHidden = field.hidden || false;

    if (isHidden) return null;

    switch (field.type) {
      // Basic Fields
      case 'text':
      case 'email':
      case 'url':
      case 'tel':
        return (
          <input
            type={field.type}
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            readOnly={isReadonly}
            disabled={isReadonly}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            placeholder={field.placeholder}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            min={field.validation?.min}
            max={field.validation?.max}
            readOnly={isReadonly}
            disabled={isReadonly}
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
            readOnly={isReadonly}
            disabled={isReadonly}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            disabled={isReadonly}
          >
            <option value="">{field.placeholder || 'Select an option'}</option>
            {field.options?.map((option: any, index: number) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <select
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            multiple
            value={formData[field.id] || []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              handleInputChange(field.id, selected);
            }}
            disabled={isReadonly}
            size={4}
          >
            {field.options?.map((option: any, index: number) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option: any, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                  checked={formData[field.id] === option.value}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  disabled={isReadonly}
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option: any, index: number) => (
              <label key={index} className="flex items-center">
                <input
                  type="checkbox"
                  className="mr-3 rounded text-blue-600 focus:ring-blue-500"
                  checked={(formData[field.id] || []).includes(option.value)}
                  onChange={(e) => handleCheckboxChange(field.id, option.value, e.target.checked)}
                  disabled={isReadonly}
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'toggle':
        return (
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={formData[field.id] || false}
              onChange={(e) => handleInputChange(field.id, e.target.checked)}
              disabled={isReadonly}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            min={field.validation?.min}
            max={field.validation?.max}
            readOnly={isReadonly}
            disabled={isReadonly}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            readOnly={isReadonly}
            disabled={isReadonly}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            id={field.id}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${errorClass}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            readOnly={isReadonly}
            disabled={isReadonly}
          />
        );

      case 'file':
      case 'image':
        const fileData = uploadedFiles[field.id];
        const isUploading = uploadingFiles[field.id];
        const accept = field.type === 'image' ? 'image/*' : field.validation?.allowedFileTypes?.join(',') || '*';
        
        return (
          <div>
            {!fileData ? (
              <div>
                <input
                  type="file"
                  id={field.id}
                  className="hidden"
                  accept={accept}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      // Validate file size
                      if (field.validation?.maxFileSize && file.size > field.validation.maxFileSize * 1024 * 1024) {
                        setErrors(prev => ({
                          ...prev,
                          [field.id]: `File size must be less than ${field.validation.maxFileSize}MB`
                        }));
                        return;
                      }
                      handleFileUpload(field.id, file);
                    }
                  }}
                  disabled={isUploading || isReadonly}
                />
                <label
                  htmlFor={field.id}
                  className={`flex items-center justify-center w-full px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    hasError 
                      ? 'border-red-300 hover:border-red-400 bg-red-50' 
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  } ${(isUploading || isReadonly) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      {field.type === 'image' ? (
                        <Image className="h-5 w-5 mr-2 text-gray-400" />
                      ) : (
                        <Upload className="h-5 w-5 mr-2 text-gray-400" />
                      )}
                      <span className="text-gray-600">
                        {field.type === 'image' ? 'Click to upload image' : 'Click to upload file'}
                      </span>
                    </>
                  )}
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  {field.type === 'image' ? (
                    <Image className="h-5 w-5 text-blue-600 mr-2" />
                  ) : (
                    <Upload className="h-5 w-5 text-blue-600 mr-2" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fileData.originalName}</p>
                    <p className="text-xs text-gray-500">{(fileData.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => handleFileRemove(field.id)}
                    className="p-1 text-red-600 hover:text-red-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}
          </div>
        );

      case 'rating':
        return (
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => !isReadonly && handleInputChange(field.id, value)}
                className={`p-1 transition-colors ${isReadonly ? 'cursor-default' : 'cursor-pointer'}`}
                disabled={isReadonly}
              >
                <Star
                  className={`h-6 w-6 ${
                    value <= (formData[field.id] || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case 'slider':
        return (
          <div>
            <input
              type="range"
              id={field.id}
              className="w-full"
              min={field.validation?.min || 0}
              max={field.validation?.max || 100}
              value={formData[field.id] || field.validation?.min || 0}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              disabled={isReadonly}
            />
            <div className="text-center text-sm text-gray-600 mt-1">
              {formData[field.id] || field.validation?.min || 0}
            </div>
          </div>
        );

      case 'color':
        return (
          <input
            type="color"
            id={field.id}
            className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
            value={formData[field.id] || '#000000'}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            disabled={isReadonly}
          />
        );

      case 'nested_form':
      case 'repeater':
        const nestedItems = nestedSubmissions[field.id] || [];
        return (
          <div className="space-y-4">
            {nestedItems.map((item, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium text-gray-700">Item {index + 1}</h4>
                  {field.nestedForm?.allowDelete && !isReadonly && (
                    <button
                      type="button"
                      onClick={() => removeNestedItem(field.id, index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {/* Nested form fields would go here */}
                <p className="text-sm text-gray-500">Nested form fields would appear here</p>
              </div>
            ))}
            {field.nestedForm?.allowAdd && !isReadonly && (
              <button
                type="button"
                onClick={() => addNestedItem(field.id)}
                className="w-full px-4 py-2 border border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-gray-400 hover:text-gray-700 transition-colors"
                disabled={field.nestedForm?.maxItems && nestedItems.length >= field.nestedForm.maxItems}
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Add {field.label}
              </button>
            )}
          </div>
        );

      case 'grid':
        const gridData = formData[field.id] || [{}];
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {field.grid?.showRowNumbers && <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>}
                  {field.grid?.columns?.map((col: any) => (
                    <th key={col.id} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {col.label}
                      {col.required && <span className="text-red-500 ml-1">*</span>}
                    </th>
                  ))}
                  {field.grid?.allowDelete && !isReadonly && <th className="px-3 py-2"></th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gridData.map((row: any, rowIndex: number) => (
                  <tr key={rowIndex}>
                    {field.grid?.showRowNumbers && <td className="px-3 py-2 text-sm text-gray-500">{rowIndex + 1}</td>}
                    {field.grid?.columns?.map((col: any) => (
                      <td key={col.id} className="px-3 py-2">
                        <input
                          type={col.type || 'text'}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          value={row[col.id] || ''}
                          onChange={(e) => {
                            const newData = [...gridData];
                            newData[rowIndex] = { ...newData[rowIndex], [col.id]: e.target.value };
                            handleInputChange(field.id, newData);
                          }}
                          disabled={isReadonly}
                        />
                      </td>
                    ))}
                    {field.grid?.allowDelete && !isReadonly && (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            const newData = gridData.filter((_: any, i: number) => i !== rowIndex);
                            handleInputChange(field.id, newData);
                          }}
                          className="text-red-600 hover:text-red-800"
                          disabled={gridData.length <= (field.grid?.minRows || 1)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {field.grid?.allowAdd && !isReadonly && (
              <button
                type="button"
                onClick={() => {
                  const newData = [...gridData, {}];
                  handleInputChange(field.id, newData);
                }}
                className="mt-2 px-3 py-1 text-sm border border-gray-300 text-gray-600 rounded hover:bg-gray-50"
                disabled={field.grid?.maxRows && gridData.length >= field.grid.maxRows}
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Add Row
              </button>
            )}
          </div>
        );

      case 'section':
        return (
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
            {field.helpText && <p className="text-gray-600 mt-1">{field.helpText}</p>}
          </div>
        );

      case 'divider':
        return <hr className="border-gray-300" />;

      case 'heading':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{field.label}</h3>
            {field.helpText && <p className="text-gray-600 mt-1">{field.helpText}</p>}
          </div>
        );

      default:
        return <div className="text-gray-500">Unsupported field type: {field.type}</div>;
    }
  };

  const canEdit = () => {
    return user?.role === 'admin' || form?.createdBy.email === user?.email;
  };

  const canSubmit = () => {
    if (!form) return false;
    return form.permissions?.submitForm?.public || 
           form.permissions?.submitForm?.roles?.includes(user?.role || '') ||
           form.permissions?.submitForm?.users?.includes(user?.id || '');
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

  const currentFields = form.type === 'wizard' && form.pages
    ? form.fields.filter(f => form.pages[currentPage].fields.includes(f.id))
    : form.fields;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
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

        {/* Progress Bar for Wizard Forms */}
        {form.type === 'wizard' && form.pages && form.settings.showProgress && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              {form.pages.map((page: any, index: number) => (
                <div key={page.id} className="flex items-center flex-1">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    index < currentPage ? 'bg-green-500 text-white' :
                    index === currentPage ? 'bg-blue-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {index < currentPage ? '✓' : index + 1}
                  </div>
                  <div className={`flex-1 h-1 mx-2 ${
                    index < currentPage ? 'bg-green-500' :
                    index === currentPage ? 'bg-blue-200' :
                    'bg-gray-200'
                  } ${index === form.pages.length - 1 ? 'hidden' : ''}`} />
                </div>
              ))}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {form.pages[currentPage].title}
            </h3>
            {form.pages[currentPage].description && (
              <p className="text-gray-600 mt-1">{form.pages[currentPage].description}</p>
            )}
          </div>
        )}

        {/* Form */}
        <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200" style={{
          backgroundColor: form.styling.backgroundColor
        }}>
          {!canSubmit() && !form.permissions?.viewForm?.public ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">You don't have permission to submit this form.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {currentFields.map((field: any) => {
                const fieldWidth = field.width || '100%';
                const widthClass = {
                  '25%': 'md:w-1/4',
                  '33%': 'md:w-1/3',
                  '50%': 'md:w-1/2',
                  '66%': 'md:w-2/3',
                  '75%': 'md:w-3/4',
                  '100%': 'w-full'
                }[fieldWidth] || 'w-full';

                return (
                  <div key={field.id} className={`${widthClass} ${form.styling.layout === 'two-column' ? 'inline-block px-2' : ''}`}>
                    <div className="space-y-2">
                      {field.type !== 'section' && field.type !== 'divider' && field.type !== 'heading' && (
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                          {field.tooltip && (
                            <span className="ml-2 text-gray-400 cursor-help" title={field.tooltip}>
                              <HelpCircle className="h-4 w-4 inline" />
                            </span>
                          )}
                        </label>
                      )}
                      
                      {renderField(field)}
                      
                      {errors[field.id] && (
                        <p className="text-sm text-red-600">{errors[field.id]}</p>
                      )}
                      
                      {field.helpText && field.type !== 'section' && field.type !== 'heading' && (
                        <p className="text-sm text-gray-500">{field.helpText}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {form.fields.length > 0 && (
                <div className="pt-6 flex gap-3 justify-between">
                  {form.type === 'wizard' && form.pages && (
                    <div className="flex gap-3">
                      {currentPage > 0 && (
                        <button
                          type="button"
                          onClick={() => setCurrentPage(currentPage - 1)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Previous
                        </button>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-3 ml-auto">
                    {form.settings.allowSaveDraft && (
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={savingDraft}
                        className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {savingDraft ? (
                          <div className="flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                            Saving...
                          </div>
                        ) : (
                          'Save Draft'
                        )}
                      </button>
                    )}
                    
                    {form.type === 'wizard' && form.pages && currentPage < form.pages.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (validateForm()) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        className="px-6 py-3 text-white font-medium rounded-lg transition-colors"
                        style={{ backgroundColor: form.styling.primaryColor }}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting || !form.isActive}
                        className="px-6 py-3 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: form.styling.primaryColor }}
                      >
                        {submitting ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </div>
                        ) : (
                          form.settings.submitButtonText || 'Submit Form'
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormView;