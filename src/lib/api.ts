import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // CSRF Token Injection
    const csrfToken = Cookies.get('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔒 Security Hardening: Handle Forced Password Change
    if (error.response?.status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/change-password')) {
        window.location.href = '/change-password';
        // Return a pending promise to prevent further error propagation
        return new Promise(() => { });
      }
    }

    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      Cookies.remove('token');
      Cookies.remove('user');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');

        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
          // Return a pending promise to prevent further error propagation
          // This stops the "Request failed with status code 401" from hitting the console/UI
          return new Promise(() => { });
        }
      }
    }

    // Add network error handling
    if (!error.response) {
      console.error("Network error or server unavailable", error.message);
      error.response = {
        data: {
          error: "Unable to connect to server. Please check your connection and try again."
        }
      };
    }

    return Promise.reject(error);
  }
);

export default api;
