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

  getStats: () => api.get('/forms/stats')
};

// Submissions endpoints
export const submissionsAPI = {
  create: (data: any) => api.post('/submissions', data),

  getAll: (params?: any) => api.get('/submissions', { params }),

  getById: (id: string) => api.get(`/submissions/${id}`),

  update: (id: string, data: any) => api.put(`/submissions/${id}`, data),

  delete: (id: string) => api.delete(`/submissions/${id}`),

  updateStatus: (id: string, data: any) => api.put(`/submissions/${id}/status`, data),

  getStats: () => api.get('/submissions/stats')
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

export default api;