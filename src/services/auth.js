import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include token in all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Use Bearer format for JWT authentication
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Request made with token:', token.substring(0, 20) + '...');
    } else {
      console.log('No token found in localStorage');
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    console.log('Response received:', response.config.url, response.status);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    
    // Only log errors that aren't 404 (we handle 404s gracefully)
    if (status !== 404) {
      console.error('Response error:', url, status);
    }
    
    // Don't automatically redirect on 401 - let the app handle auth failures
    // This prevents redirect loops during initial authentication
    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/api/login/', { email, password });
      console.log('Login successful with /api/login/ endpoint');
      
      // After successful login, get the JWT token
      const tokenResponse = await api.post('/api/token/', { email, password });
      console.log('Token retrieved successfully with /api/token/ endpoint');
      
      // Return combined data
      return {
        ...response.data,
        token: tokenResponse.data.access || tokenResponse.data.token
      };
    } catch (error) {
      console.error('Login failed with /api/login/ endpoint');
      throw new Error('Invalid email or password. Please check your credentials or register an account.');
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/api/register/', userData);
      console.log('Registration successful with /api/register/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Registration failed with /api/register/ endpoint');
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      // Extract field-specific errors from the response
      const errorData = error.response?.data;
      let errorMessage = 'Registration failed. Please try again later or contact support.';
      let fieldErrors = [];
      
      if (errorData) {
        // Check for field-specific errors (common in Django REST Framework)
        if (typeof errorData === 'object') {
          Object.keys(errorData).forEach(field => {
            if (Array.isArray(errorData[field])) {
              fieldErrors.push({ field, messages: errorData[field] });
            } else if (typeof errorData[field] === 'string') {
              fieldErrors.push({ field, messages: [errorData[field]] });
            }
          });
        }
        
        if (fieldErrors.length > 0) {
          // Return structured error data for better display
          const error = new Error('Validation failed');
          error.fieldErrors = fieldErrors;
          throw error;
        } else if (errorData.detail) {
          errorMessage = errorData.detail;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      }
      
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/api/logout/');
      console.log('Logout successful with /api/logout/ endpoint');
      return response.data;
    } catch (error) {
      console.error('Logout failed with /api/logout/ endpoint');
      return null;
    }
  },

  getCurrentUser: async () => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      try {
        const response = await api.get('/api/user/');
        console.log('Get current user successful with /api/user/ endpoint');
        return response.data;
      } catch (error) {
        // Don't log 404 errors - we handle them gracefully
        if (error.response?.status !== 404) {
          console.error('Get current user failed with /api/user/ endpoint');
        }
        return null;
      }
    }
    return null;
  },

  setAuthToken: (token, email) => {
    if (token) {
      localStorage.setItem('token', token);
      if (email) {
        localStorage.setItem('userEmail', email);
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      delete api.defaults.headers.common['Authorization'];
    }
  },
};

export default api;
