import axios from 'axios';
import { isAuthEndpoint } from '../utils/apiError';

/**
 * Normalize API base URL — ensures port 3001 for http URLs without an explicit port
 * (common misconfiguration: REACT_APP_API_URL=http://ec2-ip without :3001).
 */
function normalizeBaseURL(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '');
  if (!trimmed) return 'http://localhost:3001';

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const parsed = new URL(withProtocol);

    if (!parsed.port && parsed.protocol === 'http:') {
      parsed.port = '3001';
    }

    return parsed.origin;
  } catch {
    return trimmed;
  }
}

const getBaseURL = () => {
  if (process.env.REACT_APP_API_URL) {
    return normalizeBaseURL(process.env.REACT_APP_API_URL);
  }

  const hostname = window.location.hostname;
  if (
    hostname.includes('s3-website') ||
    hostname.includes('amazonaws.com') ||
    hostname.includes('cloudfront.net')
  ) {
    return normalizeBaseURL('http://16.16.73.29:3001');
  }

  return 'http://localhost:3001';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    if (status === 401 && !isAuthEndpoint(requestUrl)) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('role');
      sessionStorage.removeItem('username');

      const path = window.location.pathname;
      const isPublicAuthPage = path === '/login' || path === '/register';

      if (!isPublicAuthPage) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
