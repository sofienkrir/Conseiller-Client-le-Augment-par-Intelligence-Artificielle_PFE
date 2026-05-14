// client/src/services/api.js

import { getToken, logout } from './auth';

const API_URL = 'http://localhost:8000';

export const sendMessage = async (message, sessionId = null, language = 'french') => {
  const token = getToken();

  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      text: message,
      session_id: sessionId,
      language: language,       // "french" or "derja"
      use_gemini: true,
    }),
  });

  if (response.status === 401) {
    logout();
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};