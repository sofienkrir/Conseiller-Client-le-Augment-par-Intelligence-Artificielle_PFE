// client/src/services/auth.js

const API_URL = 'http://localhost:8000';

let authToken = null;

// Function to validate token with backend
export const validateToken = async () => {
  const token = getToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      return true;
    } else {
      // Token is invalid, clear it
      logout();
      return false;
    }
  } catch (error) {
    // Network error or server down, clear token to be safe
    logout();
    return false;
  }
};

export const register = async (userData) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const data = await response.json();
  if (response.ok) {
    authToken = data.access_token;
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } else {
    // Handle validation errors (422)
    if (data.detail && Array.isArray(data.detail)) {
      const errorMsg = data.detail[0]?.msg || 'Erreur de validation';
      return { error: errorMsg };
    }
    return { error: data.detail || 'Erreur lors de l\'inscription' };
  }
};

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  if (response.ok) {
    authToken = data.access_token;
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  } else {
    // Handle validation errors (422)
    if (data.detail && Array.isArray(data.detail)) {
      const errorMsg = data.detail[0]?.msg || 'Erreur de validation';
      return { error: errorMsg };
    }
    return { error: data.detail || 'Erreur lors de la connexion' };
  }
};

export const logout = () => {
  authToken = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const getToken = () => {
  return authToken || localStorage.getItem('token');
};

export const isAuthenticated = async () => {
  const token = getToken();
  if (!token) return false;
  return await validateToken();
};