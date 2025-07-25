import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  organization: string;
  lastLogin?: string;
  createdAt: string;
}

export interface Form {
  _id: string;
  title: string;
  code?: string;
  description: string;
  type: 'standard' | 'master' | 'detail' | 'wizard' | 'survey';
  category?: string;
  fields: any[];
  pages?: any[];
  settings: any;
  styling: any;
  permissions: any;
  workflow?: any;
  masterForm?: {
    formId: string;
    linkField: string;
  };
  createdBy: any;
  isActive: boolean;
  isTemplate?: boolean;
  version: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  _id: string;
  form: any;
  submissionNumber?: string;
  data: any;
  files?: any[];
  nestedSubmissions?: any[];
  status: string;
  priority: string;
  currentStage: string;
  submittedBy: any;
  parentSubmission?: string;
  masterSubmission?: string;
  workflowHistory: any[];
  createdAt: string;
  updatedAt: string;
}

export interface Workflow {
  _id: string;
  name: string;
  description: string;
  stages: any[];
  initialStage: string;
  finalStages: string[];
  isActive: boolean;
  version: number;
  createdBy: any;
  createdAt: string;
}

// Auth endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string, role?: string) =>
    api.post('/auth/register', { name, email, password, role }),

  getMe: () => api.get('/auth/me'),

  updateProfile: (data: { name: string }) =>
    api.put('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword })
};

// Forms endpoints
export const formsAPI = {
  create: (data: any) => api.post('/forms', data),

  getAll: (params?: any) => api.get('/forms', { params }),

  getById: (id: string) => api.get(`/forms/${id}`),

  update: (id: string, data: any) => api.put(`/forms/${id}`, data),

  delete: (id: string) => api.delete(`/forms/${id}`),

  duplicate: (id: string) => api.post(`/forms/${id}/duplicate`),

  getStats: () => api.get('/forms/stats'),

  getSubmissions: (id: string, params?: any) => 
    api.get(`/forms/${id}/submissions`, { params }),

  createTemplate: (id: string) => api.post(`/forms/${id}/template`),

  getTemplates: (params?: any) => api.get('/forms/templates', { params })
};

// Submissions endpoints
export const submissionsAPI = {
  create: (data: any) => api.post('/submissions', data),

  getAll: (params?: any) => api.get('/submissions', { params }),

  getById: (id: string) => api.get(`/submissions/${id}`),

  update: (id: string, data: any) => api.put(`/submissions/${id}`, data),

  delete: (id: string) => api.delete(`/submissions/${id}`),

  updateStatus: (id: string, data: any) => 
    api.put(`/submissions/${id}/status`, data),

  addComment: (id: string, data: any) => 
    api.post(`/submissions/${id}/comments`, data),

  getStats: () => api.get('/submissions/stats'),

  export: (params?: any) => 
    api.get('/submissions/export', { params, responseType: 'blob' })
};

// Workflows endpoints
export const workflowsAPI = {
  create: (data: any) => api.post('/workflows', data),

  getAll: (params?: any) => api.get('/workflows', { params }),

  getById: (id: string) => api.get(`/workflows/${id}`),

  update: (id: string, data: any) => api.put(`/workflows/${id}`, data),

  delete: (id: string) => api.delete(`/workflows/${id}`)
};

// Users endpoints
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),

  getById: (id: string) => api.get(`/users/${id}`),

  update: (id: string, data: any) => api.put(`/users/${id}`, data),

  delete: (id: string) => api.delete(`/users/${id}`)
};

// Files endpoints
export const filesAPI = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  getById: (id: string) => api.get(`/files/${id}`, { responseType: 'blob' }),

  delete: (id: string) => api.delete(`/files/${id}`)
};

// Lookup endpoints (for lookup fields)
export const lookupAPI = {
  searchForms: (formId: string, query: string) => 
    api.get(`/lookup/forms/${formId}/search`, { params: { q: query } }),

  getFormData: (formId: string) => 
    api.get(`/lookup/forms/${formId}/data`),

  searchAPI: (endpoint: string, params: any) => 
    api.get(`/lookup/api`, { params: { endpoint, ...params } })
};

// Analytics endpoints
export const analyticsAPI = {
  getFormAnalytics: (formId: string, params?: any) => 
    api.get(`/analytics/forms/${formId}`, { params }),

  getSubmissionAnalytics: (params?: any) => 
    api.get('/analytics/submissions', { params }),

  getDashboardStats: () => api.get('/analytics/dashboard')
};

export default api;