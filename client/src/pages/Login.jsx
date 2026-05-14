// client/src/pages/Login.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/auth';
import logo from '../assets/attijari-logo-full.png'; // ✅ استيراد الصورة

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await login(email, password);
      if (result.access_token) {
        navigate('/chat');
      } else {
        setError('Email ou mot de passe incorrect');
      }
    } catch (err) {
      setError('Erreur de connexion. Vérifiez vos informations.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl shadow-orange-500/50 p-8 w-full max-w-2xl">
        
        {/* Logo + Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src={logo} // ✅ استعمال الصورة المستوردة
              alt="Attijari Bank" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-blue-900">Attijari Chatbot</h1>
          <p className="text-sm text-gray-600 mt-1">
            الدخول الآمن للدرشة | Attijari bank
          </p>
          <p className="text-xs text-gray-500 mt-1 border-b pb-4">
            Chatbot Secure Access | Customer ID / User Name | اسم المستخدم | معرف العميل
          </p>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 border border-red-200">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          {/* حقل اسم المستخدم */}
          <div className="mb-4">
            <label className="block text-gray-700 mb-2 text-sm font-medium">
              Customer ID / User Name | اسم المستخدم | معرف العميل
            </label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="أدخل اسم المستخدم"
              required
            />
          </div>
          
          {/* حقل كلمة المرور */}
          <div className="mb-2">
            <label className="block text-gray-700 mb-2 text-sm font-medium">
              كلمة المرور | Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="********"
              required
            />
          </div>

          {/* نسيت كلمة المرور */}
          <div className="text-right mb-6">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password? | هل نسيت كلمة المرور؟
            </Link>
          </div>
          
          {/* أزرار تسجيل الدخول والتسجيل */}
          <div className="flex gap-4 mb-6">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-900 text-white py-3 rounded-lg font-semibold hover:bg-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Login | تسجيل الدخول</span>
                </span>
              ) : (
                <span>Login | تسجيل الدخول</span>
              )}
            </button>
            
            <Link
              to="/register"
              className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all text-center"
            >
              Register | تسجيل
            </Link>
          </div>
        </form>

        {/* نص التسجيل */}
        <p className="text-center text-sm text-gray-600 mb-6">
          First time? Register for online banking. | أول مرة؟ سجل في الخدمات المصرفية عبر الإنترنت.
        </p>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 border-t pt-4">
          Attijari Bank - All rights reserved © 2024 | جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
};

export default Login;