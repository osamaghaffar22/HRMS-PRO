import axios from 'axios';
import { useAuthStore } from './auth-store';

let baseURL = 'http://localhost:8000';
if (typeof window !== 'undefined') {
  baseURL = `${window.location.protocol}//${window.location.hostname}:8000`;
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        const isLoginPage = pathname === '/login' || pathname === '/login/';
        const isLoginRequest = error.config.url?.includes('/token');

        if (!isLoginPage && !isLoginRequest) {
          useAuthStore.getState().logout();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
