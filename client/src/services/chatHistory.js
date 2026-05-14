// client/src/services/chatHistory.js

import { getToken } from './auth';

const API_URL = 'http://localhost:8000';

export const sendMessage = async (message, sessionId = null, language = 'french') => {  // ← add language
  const token = getToken();
  
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ 
      text: message,
      session_id: sessionId,
      language: language,      // ← send it to the backend
      use_gemini: true,
    }),
  });
  
  return await response.json();
};

// ── everything below is unchanged ──

export const getUserSessions = async () => {
  const token = getToken();
  const response = await fetch(`${API_URL}/chat/sessions`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

export const getSessionMessages = async (sessionId) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/chat/sessions/${sessionId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};

export const deleteSession = async (sessionId) => {
  const token = getToken();
  const response = await fetch(`${API_URL}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await response.json();
};