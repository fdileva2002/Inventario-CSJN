import axios from 'axios';
import { getToken, removeToken } from '../auth/auth.storage';

export const api = axios.create({
  baseURL: 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Sesión vencida o usuario desactivado: volver al login en vez de mostrar errores sueltos.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLogin = error?.config?.url?.includes('/auth/login');

    if (error?.response?.status === 401 && !isLogin) {
      removeToken();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  },
);
