import axios from 'axios';

const API_BASE_URL = (() => {
  // 1) Highest priority: explicit env override
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 2) Default by mode. 5002 matches backend/.env — port 5000 is held by the
  // AirPlay Receiver on macOS, so the API cannot use it locally.
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:5002/api/v1';
  }

  // 3) Production fallback: Render API URL
  return 'https://electronic-voting-system-nxqt.onrender.com/api/v1';
})();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    // Prefer localStorage, fall back to sessionStorage (matches AuthContext behavior)
    const token =
      localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for basic auth handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth-related storage keys; AuthContext will see this on next load
      ['token', 'user', 'sessionExpiry'].forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
