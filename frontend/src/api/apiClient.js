import axios from 'axios';

export const API_BASE_URL = (() => {
  // 1) Highest priority: explicit env override
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }

  // 2) Anything that is not a production build talks to the local API. `DEV`
  // rather than `MODE === 'development'`: MODE carries a custom value under
  // `vite build --mode staging` or `vitest`, which would silently fall through
  // to the deployed API below.
  //
  // 5002 matches backend/.env — port 5000 is held by the AirPlay Receiver on
  // macOS, so the API cannot use it locally.
  if (import.meta.env.DEV) {
    return 'http://localhost:5002/api/v1';
  }

  // 3) Production fallback: Render API URL. Set VITE_API_BASE_URL on Netlify
  // to point at a different host without touching the code.
  return 'https://electronic-voting-system-nxqt.onrender.com/api/v1';
})();

/**
 * URL of the API health endpoint, derived from the configured base URL so that
 * it follows VITE_API_BASE_URL instead of hardcoding a second copy of the host.
 *
 * @type {string}
 */
export const API_HEALTH_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '/api/health');

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
