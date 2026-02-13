/**
 * API client configuration
 */
import axios from 'axios';
import { useAuthStore } from '@/store/auth';

// Определяем baseURL для клиента и сервера
const getBaseURL = () => {
  // На клиенте (браузере) используем переменную окружения или дефолтное значение
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
  }
  // На сервере можем использовать внутренний URL
  return process.env.NEXT_PUBLIC_API_URL || 'http://backend:8000/api/v1';
};

const API_URL = getBaseURL();

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    // Only access store in browser environment
    if (typeof window !== 'undefined') {
      // Get token from Zustand store (outside React context)
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    // Let browser set correct Content-Type for FormData (multipart)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      // Handle unauthorized - logout user
      useAuthStore.getState().logout();
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
