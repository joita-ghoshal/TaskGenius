import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
  updateVoiceSettings: (data) => api.put('/auth/voice-settings', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data)
};

export const tasksAPI = {
  getAll: (params) => api.get('/tasks', { params }),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  getDashboard: () => api.get('/tasks/dashboard')
};

export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  getBriefing: () => api.get('/ai/briefing'),
  getInsights: () => api.get('/ai/insights'),
  analyzeTask: (taskId) => api.get(`/ai/analyze/${taskId}`),
  getHistory: (sessionId) => api.get('/ai/history', { params: { sessionId } }),
  clearHistory: (sessionId) => api.delete('/ai/history', { data: { sessionId } })
};

export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data)
};

export const analyticsAPI = {
  get: (params) => api.get('/analytics', { params }),
  getStats: () => api.get('/analytics/stats'),
  log: (data) => api.post('/analytics/log', data)
};

export default api;
