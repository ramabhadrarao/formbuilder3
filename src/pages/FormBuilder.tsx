import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Save, Eye, ArrowLeft, Plus, Trash2, GripVertical, Settings2,
  Type, Hash, Mail, Calendar, Clock, Upload, Image, MapPin,
  List, Radio, CheckSquare, ToggleLeft, Sliders, Star,
  Layout, Database, Calculator, Link2, Grid3X3, Copy,
  ChevronDown, ChevronUp, Code, Palette, Shield, Workflow,
  FileText, Users, AlertCircle, HelpCircle
} from 'lucide-react';
import { formsAPI } from '../services/api';

// Field type definitions with icons and categories
const fieldCategories = {
  basic: {
    label: 'Basic Fields',
    fields: [
      { type: 'text', label: 'Text Input', icon: Type },
      { type: 'textarea', label: 'Text Area', icon: FileText },
      { type: 'number', label: 'Number', icon: Hash },
      { type: 'email', label: 'Email', icon: Mail },
      { type: 'url', label: 'URL', icon: Link2 },
      { type: 'tel', label: 'Phone', icon: Type }
    ]
  },
  choice: {
    label: 'Choice Fields',
    fields: [
      { type: 'select', label: 'Dropdown', icon: List },
      { type: 'multiselect', label: 'Multi-Select', icon: List },
      { type: 'radio', label: 'Radio Buttons', icon: Radio },
      { type: 'checkbox', label: 'Checkboxes', icon: CheckSquare },
      { type: 'toggle', label: 'Toggle Switch', icon: ToggleLeft }
    ]
  },
  datetime: {
    label: 'Date & Time',
    fields: [
      { type: 'date', label: 'Date', icon: Calendar },
      { type: 'datetime', label: 'Date & Time', icon: Calendar },
      { type: 'time', label: 'Time', icon: Clock },
      { type: 'daterange', label: 'Date Range', icon: Calendar }
    ]
  },
  file: {
    label: 'File & Media',
    fields: [
      { type: 'file', label: 'File Upload', icon: Upload },
      { type: 'image', label: 'Image Upload', icon: Image },
      { type: 'signature', label: 'Signature', icon: FileText }
    ]
  },
  advanced: {
    label: 'Advanced Fields',
    fields: [
      { type: 'rating', label: 'Rating', icon: Star },
      { type: 'slider', label: 'Slider', icon: Sliders },
      { type: 'color', label: 'Color Picker', icon: Palette },
      { type: 'location', label: 'Location', icon: MapPin },
      { type: 'address', label: 'Address', icon: MapPin }
    ]
  },
  data: {
    label: 'Data Fields',
    fields: [
      { type: 'lookup', label: 'Lookup', icon: Database },
      { type: 'formula', label: 'Formula', icon: Calculator },
      { type: 'autoincrement', label: 'Auto Number', icon: Hash }
    ]
  },
  layout: {
    label: 'Layout & Structure',
    fields: [
      { type: 'section', label: 'Section', icon: Layout },
      { type: 'divider', label: 'Divider', icon: Layout },
      { type: 'heading', label: 'Heading', icon: Type },
      { type: 'nested_form', label: 'Nested Form', icon: Grid3X3 },
      { type: 'repeater', label: 'Repeater', icon: Copy },
      { type: 'grid', label: 'Data Grid', icon: Grid3X3 }
    ]
  }
};

interface Field {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required: boolean;
  readonly?: boolean;
  hidden?: boolean;
  options?: Array<{ value: string; label: string; color?: string }>;
  validation?: any;
  conditional?: any;
  lookup?: any;
  formula?: any;
  nestedForm?: any;
  grid?: any;
  width?: string;
  helpText?: string;
  tooltip?: string;
  order: number;
}

interface FormData {
  title: string;
  code?: string;
  description: string;
  type: 'standard' | 'master' | 'detail' | 'wizard' | 'survey';
  category?: string;
  fields: Field[];
  pages?: Array<{ id: string; title: string; description?: string; fields: string[] }>;
  settings: any;
  styling: any;
  permissions: any;
  integrations?: any[];
  tags: string[];
  masterForm?: { formId: string; linkField: string };
}

const FormBuilder: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    type: 'standard',
    fields: [],
    settings: {
      allowMultipleSubmissions: false,
      allowSaveDraft: true,
      requireLogin: true,
      showProgress: true,
      confirmationMessage: 'Thank you for your submission!'
    },
    styling: {
      theme: 'default',
      primaryColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      layout: 'single-column'
    },
    permissions: {
      viewForm: { public: false, roles: ['user'], users: [] },
      submitForm: { public: false, roles: ['user'], users: [] },
      editSubmissions: { roles: ['admin', 'manager'], ownSubmissionsOnly: true },
      viewSubmissions: { roles: ['admin', 'manager'], ownSubmissionsOnly: true }
    },
    tags: []
  });
  
  const [activeTab, setActiveTab] = useState('fields');
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic']);
  const [showFieldSettings, setShowFieldSettings] = useState(false);
  const [showConditionalLogic, setShowConditionalLogic] = useState(false);
  const [forms, setForms] = useState<any[]>([]); // For master form selection

  useEffect(() => {
    if (id) {
      fetchForm();
    }
    fetchForms(); // For master form dropdown
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

  const fetchForms = async () => {
    try {
      const response = await formsAPI.getAll({ limit: 100 });
      setForms(response.data.data.filter((f: any) => f.type === 'master'));
    } catch (error) {
      console.error('Error fetching forms:', error);
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

  const addField = (fieldType: string) => {
    const fieldConfig = Object.values(fieldCategories)
      .flatMap(cat => cat.fields)
      .find(f => f.type === fieldType);

    const newField: Field = {
      id: `field_${Date.now()}`,
      type: fieldType,
      label: fieldConfig?.label || 'New Field',
      required: false,
      order: formData.fields.length,
      width: '100%'
    };

    // Add default options for choice fields
    if (['select', 'multiselect', 'radio', 'checkbox'].includes(fieldType)) {
      newField.options = [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
      ];
    }

    // Add default grid columns
    if (fieldType === 'grid') {
      newField.grid = {
        columns: [
          { id: 'col1', label: 'Column 1', type: 'text', width: 200 },
          { id: 'col2', label: 'Column 2', type: 'number', width: 150 }
        ],
        minRows: 1,
        allowAdd: true,
        allowDelete: true
      };
    }

    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
    setSelectedField(newField.id);
    setShowFieldSettings(true);
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
    if (selectedField === fieldId) {
      setSelectedField(null);
      setShowFieldSettings(false);
    }
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

    newFields.forEach((field, index) => {
      field.order = index;
    });

    setFormData(prev => ({ ...prev, fields: newFields }));
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const renderFieldIcon = (type: string) => {
    const fieldConfig = Object.values(fieldCategories)
      .flatMap(cat => cat.fields)
      .find(f => f.type === type);
    const Icon = fieldConfig?.icon || Type;
    return <Icon className="h-4 w-4" />;
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
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
              <p className="text-gray-600">Design your form with advanced features</p>
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <nav className="flex border-b border-gray-200">
            {[
              { id: 'fields', label: 'Form Fields', icon: Layout },
              { id: 'settings', label: 'Settings', icon: Settings2 },
              { id: 'permissions', label: 'Permissions', icon: Shield },
              { id: 'workflow', label: 'Workflow', icon: Workflow },
              { id: 'styling', label: 'Styling', icon: Palette },
              { id: 'integrations', label: 'Integrations', icon: Link2 }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {activeTab === 'fields' && (
              <div className="space-y-6">
                {/* Form Basic Info */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        Form Code
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.code || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="AUTO-GENERATED"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Form Type
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.type}
                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                      >
                        <option value="standard">Standard Form</option>
                        <option value="master">Master Form</option>
                        <option value="detail">Detail Form</option>
                        <option value="wizard">Multi-Step Wizard</option>
                        <option value="survey">Survey</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        value={formData.category || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="e.g., HR, Finance, Sales"
                      />
                    </div>
                  </div>
                  
                  {formData.type === 'detail' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Master Form
                        </label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={formData.masterForm?.formId || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            masterForm: { 
                              formId: e.target.value,
                              linkField: prev.masterForm?.linkField || ''
                            }
                          }))}
                        >
                          <option value="">Select Master Form</option>
                          {forms.map(form => (
                            <option key={form._id} value={form._id}>{form.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Link Field
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          value={formData.masterForm?.linkField || ''}
                          onChange={(e) => setFormData(prev => ({ 
                            ...prev, 
                            masterForm: { 
                              formId: prev.masterForm?.formId || '',
                              linkField: e.target.value
                            }
                          }))}
                          placeholder="Field ID to link with master"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-4">
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
                  <div className="mt-4">
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

                {/* Form Fields */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Fields</h3>
                  
                  <div className="space-y-4">
                    {formData.fields.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                        <Layout className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
                        <p className="text-gray-600 mb-4">Add fields from the right panel to start building your form</p>
                      </div>
                    ) : (
                      formData.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedField === field.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedField(field.id);
                            setShowFieldSettings(true);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
                              <div className="p-2 bg-gray-100 rounded">
                                {renderFieldIcon(field.type)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{field.label}</div>
                                <div className="text-sm text-gray-500">
                                  Type: {field.type} | ID: {field.id}
                                  {field.required && ' | Required'}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'up');
                                }}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              >
                                <ChevronUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveField(field.id, 'down');
                                }}
                                disabled={index === formData.fields.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                              >
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const duplicate = { ...field, id: `field_${Date.now()}` };
                                  setFormData(prev => ({
                                    ...prev,
                                    fields: [...prev.fields, duplicate]
                                  }));
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteField(field.id);
                                }}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Field Preview */}
                          <div className="mt-3 pl-12">
                            {field.type === 'section' ? (
                              <div className="border-t pt-2">
                                <h4 className="font-semibold">{field.label}</h4>
                                {field.helpText && <p className="text-sm text-gray-600">{field.helpText}</p>}
                              </div>
                            ) : field.type === 'divider' ? (
                              <hr className="border-gray-300" />
                            ) : (
                              <div className="max-w-md">
                                {['text', 'email', 'url', 'tel', 'number'].includes(field.type) && (
                                  <input
                                    type={field.type}
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
                                {['select', 'multiselect'].includes(field.type) && (
                                  <select 
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" 
                                    disabled
                                    multiple={field.type === 'multiselect'}
                                  >
                                    <option>{field.placeholder || 'Select an option'}</option>
                                    {field.options?.map((opt, i) => (
                                      <option key={i}>{opt.label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
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
                    <h4 className="font-medium text-gray-900 mb-3">Submission Settings</h4>
                    <div className="space-y-3">
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
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={formData.settings.allowSaveDraft}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            settings: { ...prev.settings, allowSaveDraft: e.target.checked }
                          }))}
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">Allow Save as Draft</span>
                      </label>
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
                    </div>
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
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'permissions' && (
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Permissions</h3>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">View Form</h4>
                    <label className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData.permissions.viewForm.public}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          permissions: {
                            ...prev.permissions,
                            viewForm: { ...prev.permissions.viewForm, public: e.target.checked }
                          }
                        }))}
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Public (No login required)</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed Roles
                      </label>
                      <div className="space-y-2">
                        {['admin', 'manager', 'user'].map(role => (
                          <label key={role} className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.permissions.viewForm.roles.includes(role)}
                              onChange={(e) => {
                                const roles = e.target.checked
                                  ? [...formData.permissions.viewForm.roles, role]
                                  : formData.permissions.viewForm.roles.filter(r => r !== role);
                                setFormData(prev => ({
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    viewForm: { ...prev.permissions.viewForm, roles }
                                  }
                                }));
                              }}
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Submit Form</h4>
                    <label className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={formData.permissions.submitForm.public}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          permissions: {
                            ...prev.permissions,
                            submitForm: { ...prev.permissions.submitForm, public: e.target.checked }
                          }
                        }))}
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Public (No login required)</span>
                    </label>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed Roles
                      </label>
                      <div className="space-y-2">
                        {['admin', 'manager', 'user'].map(role => (
                          <label key={role} className="flex items-center">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={formData.permissions.submitForm.roles.includes(role)}
                              onChange={(e) => {
                                const roles = e.target.checked
                                  ? [...formData.permissions.submitForm.roles, role]
                                  : formData.permissions.submitForm.roles.filter(r => r !== role);
                                setFormData(prev => ({
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    submitForm: { ...prev.permissions.submitForm, roles }
                                  }
                                }));
                              }}
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">{role}</span>
                          </label>
                        ))}
                      </div>
                    </div>
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
                      Layout
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.styling.layout}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        styling: { ...prev.styling, layout: e.target.value }
                      }))}
                    >
                      <option value="single-column">Single Column</option>
                      <option value="two-column">Two Column</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
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
                      className="w-full h-10 border border-gray-300 rounded-lg cursor-pointer"
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

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {activeTab === 'fields' && (
              <>
                {/* Field Palette */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-6">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Add Fields</h3>
                  </div>
                  <div className="max-h-[600px] overflow-y-auto">
                    {Object.entries(fieldCategories).map(([key, category]) => (
                      <div key={key} className="border-b border-gray-200 last:border-b-0">
                        <button
                          onClick={() => toggleCategory(key)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-medium text-gray-700">{category.label}</span>
                          {expandedCategories.includes(key) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                        {expandedCategories.includes(key) && (
                          <div className="px-2 pb-2">
                            {category.fields.map((field) => {
                              const Icon = field.icon;
                              return (
                                <button
                                  key={field.type}
                                  onClick={() => addField(field.type)}
                                  className="w-full px-3 py-2 mb-1 flex items-center gap-3 text-left hover:bg-blue-50 rounded-lg transition-colors group"
                                >
                                  <div className="p-2 bg-gray-100 rounded group-hover:bg-blue-100">
                                    <Icon className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                                  </div>
                                  <span className="text-sm text-gray-700 group-hover:text-blue-700">
                                    {field.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Field Settings */}
                {showFieldSettings && selectedField && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Field Settings</h3>
                      <button
                        onClick={() => {
                          setShowFieldSettings(false);
                          setSelectedField(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                      {(() => {
                        const field = formData.fields.find(f => f.id === selectedField);
                        if (!field) return null;

                        return (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Field Label
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
                                Field ID
                              </label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                                value={field.id}
                                disabled
                              />
                            </div>

                            {!['section', 'divider', 'heading'].includes(field.type) && (
                              <>
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

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Width
                                  </label>
                                  <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={field.width || '100%'}
                                    onChange={(e) => updateField(field.id, { width: e.target.value })}
                                  >
                                    <option value="25%">25%</option>
                                    <option value="33%">33%</option>
                                    <option value="50%">50%</option>
                                    <option value="66%">66%</option>
                                    <option value="75%">75%</option>
                                    <option value="100%">100%</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={field.required || false}
                                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700">Required</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={field.readonly || false}
                                      onChange={(e) => updateField(field.id, { readonly: e.target.checked })}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700">Read Only</span>
                                  </label>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={field.hidden || false}
                                      onChange={(e) => updateField(field.id, { hidden: e.target.checked })}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700">Hidden</span>
                                  </label>
                                </div>
                              </>
                            )}

                            {['select', 'multiselect', 'radio', 'checkbox'].includes(field.type) && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Options
                                </label>
                                <div className="space-y-2">
                                  {field.options?.map((option, index) => (
                                    <div key={index} className="flex gap-2">
                                      <input
                                        type="text"
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        value={option.label}
                                        onChange={(e) => {
                                          const newOptions = [...(field.options || [])];
                                          newOptions[index] = { ...option, label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, '_') };
                                          updateField(field.id, { options: newOptions });
                                        }}
                                      />
                                      <button
                                        onClick={() => {
                                          const newOptions = field.options?.filter((_, i) => i !== index);
                                          updateField(field.id, { options: newOptions });
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={() => {
                                      const newOptions = [...(field.options || []), { value: `option${(field.options?.length || 0) + 1}`, label: `Option ${(field.options?.length || 0) + 1}` }];
                                      updateField(field.id, { options: newOptions });
                                    }}
                                    className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                                  >
                                    <Plus className="h-4 w-4 inline mr-1" />
                                    Add Option
                                  </button>
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Help Text
                              </label>
                              <textarea
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={2}
                                value={field.helpText || ''}
                                onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                                placeholder="Additional help text for this field"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tooltip
                              </label>
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                value={field.tooltip || ''}
                                onChange={(e) => updateField(field.id, { tooltip: e.target.value })}
                                placeholder="Tooltip text on hover"
                              />
                            </div>

                            {/* Conditional Logic Button */}
                            <button
                              onClick={() => setShowConditionalLogic(!showConditionalLogic)}
                              className="w-full px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-between"
                            >
                              <span>Conditional Logic</span>
                              <AlertCircle className="h-4 w-4" />
                            </button>

                            {showConditionalLogic && (
                              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                                <div>
                                  <label className="flex items-center mb-3">
                                    <input
                                      type="checkbox"
                                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                      checked={field.conditional?.enabled || false}
                                      onChange={(e) => updateField(field.id, { 
                                        conditional: { 
                                          ...field.conditional, 
                                          enabled: e.target.checked,
                                          rules: field.conditional?.rules || []
                                        } 
                                      })}
                                    />
                                    <span className="ml-2 text-sm font-medium text-gray-700">Enable Conditional Logic</span>
                                  </label>
                                </div>
                                
                                {field.conditional?.enabled && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-gray-600">Show/hide this field based on other field values</p>
                                    <button className="text-sm text-blue-600 hover:text-blue-700">
                                      + Add Condition
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormBuilder;