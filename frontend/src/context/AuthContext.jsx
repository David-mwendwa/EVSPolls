import {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/apiClient';

// Constants
const AUTH_KEYS = ['token', 'user', 'sessionExpiry'];
const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes for session (standard web session)
const PERSISTENT_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for persistent (remember me)

const AuthContext = createContext();

/**
 * AuthProvider - Manages authentication state and session persistence
 * Handles login/logout, session storage, and automatic session expiry
 */
export const AuthProvider = ({ children }) => {
  // State
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // Storage utilities
  const clearStorage = useCallback((storage) => {
    AUTH_KEYS.forEach((key) => storage.removeItem(key));
  }, []);

  const getAuthData = useCallback((storage) => {
    const [token, userData] = AUTH_KEYS.slice(0, 2).map((key) =>
      storage.getItem(key)
    );
    return { token, userData: userData ? JSON.parse(userData) : null };
  }, []);

  const setAuthData = useCallback((storage, userData, expiryTime) => {
    storage.setItem('user', JSON.stringify(userData));
    storage.setItem('token', userData.token || '');
    storage.setItem('sessionExpiry', expiryTime.toString());
  }, []);

  // Check for existing session on initial load
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storage = localStorage.getItem('token')
          ? localStorage
          : sessionStorage.getItem('token')
            ? sessionStorage
            : null;

        if (storage) {
          // Honour the stored expiry here as well as on the interval below.
          // Checking only on the interval would leave an already-expired
          // session usable for up to a minute after a page load.
          const expiryTime = storage.getItem('sessionExpiry');

          if (expiryTime && Date.now() > parseInt(expiryTime, 10)) {
            [localStorage, sessionStorage].forEach(clearStorage);
            return;
          }

          const { token, userData } = getAuthData(storage);
          if (token && userData) {
            setUser(userData);
            setIsAuthenticated(true);
            setRememberMe(storage === localStorage);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        [localStorage, sessionStorage].forEach(clearStorage);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [clearStorage, getAuthData]);

  // Handle user login: call backend and set up session
  const login = useCallback(
    async (credentials, remember = false) => {
      try {
        // Call backend
        const response = await api.post('/auth/login', credentials);
        const data = response.data || response;
        const userData = data.user;
        const token = data.token;

        if (!userData || !token) {
          throw new Error('Invalid login response from server');
        }

        const now = Date.now();
        const expiryTime =
          now + (remember ? PERSISTENT_DURATION : SESSION_DURATION);
        const storage = remember ? localStorage : sessionStorage;
        const otherStorage = remember ? sessionStorage : localStorage;

        const userWithToken = { ...userData, token };

        // Update state
        setUser(userWithToken);
        setIsAuthenticated(true);
        setRememberMe(remember);

        // Update storage
        setAuthData(storage, userWithToken, expiryTime);
        clearStorage(otherStorage);

        if (process.env.NODE_ENV === 'development') {
          console.group('Login Successful');
          console.log('User:', userData.email);
          console.log(
            'Session Type:',
            remember ? 'Persistent' : 'Session-only'
          );
          console.log('Expires at:', new Date(expiryTime).toLocaleString());
          console.log(
            'Expires in:',
            Math.round(expiryTime - now) / 1000,
            'seconds'
          );
          console.groupEnd();
        }

        return data;
      } catch (error) {
        console.error('Login error:', error);
        throw error;
      }
    },
    [clearStorage, setAuthData]
  );

  // Backend registration API (moved from authService)
  const register = useCallback(async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);

      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Registration successful!',
      };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Registration failed. Please try again.';

      console.error('Registration error:', error.response?.data || error);

      return {
        success: false,
        message: errorMessage,
        errors: error.response?.data?.errors || null,
        status: error.response?.status,
      };
    }
  }, []);

  // Handle user logout and cleanup
  const logout = useCallback(async () => {
    try {
      // Notify backend (moved from authService)
      try {
        await api.get('/users/logout');
      } catch (err) {
        console.error('Backend logout error:', err);
      }

      // Clear all auth data
      [localStorage, sessionStorage].forEach(clearStorage);

      // Reset state
      setUser(null);
      setIsAuthenticated(false);
      setRememberMe(false);

      // Navigate home after state updates
      setTimeout(() => navigate('/'), 100);
    } catch (error) {
      console.error('Logout error:', error);
      // Ensure clean state on error
      setUser(null);
      setIsAuthenticated(false);
      navigate('/');
    }
  }, [clearStorage, navigate]);

  // Session expiry check
  useEffect(() => {
    const checkSessionExpiry = () => {
      [localStorage, sessionStorage].some((storage) => {
        const expiryTime = storage.getItem('sessionExpiry');
        if (expiryTime && Date.now() > parseInt(expiryTime, 10)) {
          console.log('Session expired, logging out...');
          logout();
          return true; // Stop checking other storages
        }
        return false;
      });
    };

    const interval = setInterval(checkSessionExpiry, 60000);
    return () => clearInterval(interval);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        logout,
        register,
        rememberMe,
        setRememberMe,
      }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
