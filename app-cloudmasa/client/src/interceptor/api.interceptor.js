// client/src/interceptor/api.interceptor.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/',
  headers: {
    'Content-Type': 'application/json', // ✅ critical for POST body
    Accept: 'application/json',
  },
  // withCredentials: true, // only needed for cookie-based auth (JWT uses header)
});

api.interceptors.request.use(
  (config) => {
    let token = null;

    // ✅ Try multiple common storage patterns
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        token = user.token || user.accessToken;
      } catch (e) {
        console.warn('Failed to parse user JSON:', e);
      }
    }

    // ✅ Fallback: try `token` directly
    if (!token) {
      token = localStorage.getItem('token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization; // ensure no stale header
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Add request interceptor to attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token"); // or wherever you store it
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized (401). Clearing auth and redirecting...');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      // Optional: show toast before redirect
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
    return Promise.reject(error);
  }
);

export default api;
