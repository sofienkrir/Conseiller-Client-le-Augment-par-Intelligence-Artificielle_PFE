import React, { useState } from 'react';
import logo from './logo.png';

const Navbar = ({ toggleSidebar, toggleQuickTips }) => {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            {/* أزرار القوائم للـ mobile */}
            <button 
              onClick={toggleSidebar}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              ☰
            </button>
            
            <span className="text-xl md:text-2xl font-bold text-black flex items-center gap-2">
              <img src={logo} alt="Attijari Bank Logo" className="h-30 w-30 md:h-30 md:w-40" />
              <span className="hidden sm:inline">Attijari Assistant</span>
              <span className="sm:hidden">AA</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* أزرار التنقل */}
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-1 md:px-4 md:py-2 rounded-lg transition-all ${
                activeTab === 'chat'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab('voice')}
              className={`px-3 py-1 md:px-4 md:py-2 rounded-lg transition-all ${
                activeTab === 'voice'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🎤 Voice
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;