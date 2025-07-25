import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Eye, ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import { formsAPI } from '../services/api';

interface Field {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  helpText?: string;
  order: number;
}

interface FormData {
  title: string;
  description: string;
  fields: Field[];
  settings: {
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    showProgress: boolean;
    confirmationMessage: string;
  };
  styling: {
    theme: string;
    primaryColor: string;
    backgroundColor: string;
  };
  tags: string[];
}

const fieldTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'select', label: 'Dropdown' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'checkbox', label: 'Checkboxes' },
  { value: 'date', label: 'Date' },
  { value: 'file', label: 'File Upload' },
  { value: 'section', label: 'Section Header' }
];

const FormBuilder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    fields: [],
    settings: {
      allowMultipleSubmissions: false,
      requireLogin: true,
      showProgress: true,
      confirmationMessage: 'Thank you for your submission!'
    },
    styling: {
      theme: 'default',
      primaryColor: '#3B82F6',
      backgroundColor: '#FFFFFF'
    },
    tags: []
  });
  const [activeTab, setActiveTab] = useState('fields');

  useEffect(() => {
    if (id) {
      fetchForm();
    }
  }, [id]);

  const fetchForm = async () => {
    try {
      setLoading(true);
      const response = await formsAPI.getById(id!);
      setFormData(response.data.data);
    } catch (error) {
      console.error('Error fetching form:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (id) {
        await formsAPI.update(id, formData);
      } else {
        await formsAPI.create(formData);
      }
      navigate('/forms');
    } catch (error) {
      console.error('Error saving form:', error);
    } finally {
      setSaving(false);
    }
  };

  const addField = () => {
    const newField: Field = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'New Field',
      required: false,
      order: formData.fields.length
    };
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (fieldId: string, updates: Partial<Field>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }));
  };

  const deleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    const fieldIndex = formData.fields.findIndex(f => f.id === fieldId);
    if (
      (direction === 'up' && fieldIndex === 0) ||
      (direction === 'down' && fieldIndex === formData.fields.length - 1)
    ) {
      return;
    }

    const newFields = [...formData.fields];
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];

    // Update order
    newFields.forEach((field, index) => {
      field.order = index;
    });

    setFormData(prev => ({ ...prev, fields: newFields }));
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/forms')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {id ? 'Edit Form' : 'Create New Form'}
            </h1>
            <p className="text-gray-600">Build your form with drag-and-drop components</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Eye className="h-5 w-5 mr-2 inline" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2 inline-block"></div>
            ) : (
              <Save className="h-5 w-5 mr-2 inline" />
            )}
            {id ? 'Update Form' : 'Save Form'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['fields', 'settings', 'styling'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Form Builder */}
        <div className="lg:col-span-2">
          {activeTab === 'fields' && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Form Title *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter form title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your form"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.tags.join(', ')}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                      }))}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Form Fields</h3>
                  <button
                    onClick={addField}
                    className="px-3 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2 inline" />
                    Add Field
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.fields.map((field, index) => (
                    <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-5 w-5 text-gray-400" />
                          <span className="font-medium text-gray-900">Field {index + 1}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => moveField(field.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveField(field.id, 'down')}
                            disabled={index === formData.fields.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => deleteField(field.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Field Type
                          </label>
                          <select
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={field.type}
                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                          >
                            {fieldTypes.map(type => (
                              <option key={type.value} value={type.value}>
                                {type.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={field.label}
                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={field.required}
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
                            />
                            <span className="ml-2 text-sm text-gray-700">Required</span>
                          </label>
                        </div>
                      </div>

                      {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Options (one per line)
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            value={(field.options || []).join('\n')}
                            onChange={(e) => updateField(field.id, { 
                              options: e.target.value.split('\n').filter(Boolean) 
                            })}
                            placeholder="Option 1&#10;Option 2&#10;Option 3"
                          />
                        </div>
                      )}

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Help Text
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={field.helpText || ''}
                          onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                          placeholder="Additional help text for this field"
                        />
                      </div>
                    </div>
                  ))}

                  {formData.fields.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                      <p className="text-gray-600 mb-4">Add your first field to get started</p>
                      <button
                        onClick={addField}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Field
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Settings</h3>
              <div className="space-y-6">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.settings.allowMultipleSubmissions}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, allowMultipleSubmissions: e.target.checked }
                      }))}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Allow Multiple Submissions</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">Allow users to submit this form multiple times</p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.settings.requireLogin}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, requireLogin: e.target.checked }
                      }))}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Require Login</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">Only logged-in users can submit this form</p>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.settings.showProgress}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, showProgress: e.target.checked }
                      }))}
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Show Progress Bar</span>
                  </label>
                  <p className="text-sm text-gray-500 mt-1">Display progress indicator for multi-step forms</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmation Message
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    value={formData.settings.confirmationMessage}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, confirmationMessage: e.target.value }
                    }))}
                    placeholder="Thank you for your submission!"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'styling' && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Styling</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.styling.theme}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      styling: { ...prev.styling, theme: e.target.value }
                    }))}
                  >
                    <option value="default">Default</option>
                    <option value="minimal">Minimal</option>
                    <option value="modern">Modern</option>
                    <option value="corporate">Corporate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-10 border border-gray-300 rounded-lg"
                    value={formData.styling.primaryColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      styling: { ...prev.styling, primaryColor: e.target.value }
                    }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    className="w-full h-10 border border-gray-300 rounded-lg"
                    value={formData.styling.backgroundColor}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      styling: { ...prev.styling, backgroundColor: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Preview */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
            <div className="border border-gray-200 rounded-lg p-4 min-h-[400px]" style={{
              backgroundColor: formData.styling.backgroundColor
            }}>
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold" style={{ color: formData.styling.primaryColor }}>
                    {formData.title || 'Form Title'}
                  </h2>
                  {formData.description && (
                    <p className="text-gray-600 mt-2">{formData.description}</p>
                  )}
                </div>

                {formData.fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'text' && (
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        disabled
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <textarea
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        rows={3}
                        disabled
                      />
                    )}
                    
                    {field.type === 'select' && (
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" disabled>
                        <option>{field.placeholder || 'Select an option'}</option>
                        {field.options?.map((option, index) => (
                          <option key={index}>{option}</option>
                        ))}
                      </select>
                    )}
                    
                    {field.type === 'radio' && (
                      <div className="space-y-2">
                        {field.options?.map((option, index) => (
                          <label key={index} className="flex items-center">
                            <input type="radio" name={field.id} className="mr-2" disabled />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {field.type === 'checkbox' && (
                      <div className="space-y-2">
                        {field.options?.map((option, index) => (
                          <label key={index} className="flex items-center">
                            <input type="checkbox" className="mr-2" disabled />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {field.helpText && (
                      <p className="text-xs text-gray-500">{field.helpText}</p>
                    )}
                  </div>
                ))}

                {formData.fields.length > 0 && (
                  <button
                    className="w-full py-2 px-4 rounded-lg text-white font-medium"
                    style={{ backgroundColor: formData.styling.primaryColor }}
                    disabled
                  >
                    Submit
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;