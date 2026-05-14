import React, { useState, useEffect } from 'react';
import { sendMessage } from './services/api';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import QuickTips from './components/Layout/QuickTips';
import ChatInterface from './components/Chat/ChatInterface';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', content: 'مرحبا بيك في Attijari Chatbot! كيفاش ننجم نعاونك؟' },
  ]);

  const [isTyping, setIsTyping] = useState(false);
  const [micActive, setMicActive] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);     // للـ mobile
  const [showQuickTips, setShowQuickTips] = useState(false); // للـ mobile

  // Voice states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [recognition, setRecognition] = useState(null);

  async function handleSendMessage(text) {
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', content: text }]);
    setTranscript('');
    setIsTyping(true);

    try {
      const response = await sendMessage(text);
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        type: 'bot', 
        content: response.answer,
        sources: response.sources || []
      }]);
      
    } catch (error) {
      console.error('Error:', error);
      setIsTyping(false);
      
      // رسالة خطأ
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        type: 'bot', 
        content: 'صرلك خطأ في الاتصال. تأكد أن الـ Backend شغال على port 8000.' 
      }]);
    }
  }

  // بدء التسجيل
const startListening = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    alert('متصفحك ما يدعمش التعرف على الصوت. استعمل Chrome أو Edge.');
    return;
  }

  const recognitionInstance = new SpeechRecognition();
  recognitionInstance.lang = 'fr-FR'; // أو 'ar-TN' للدارجة
  recognitionInstance.continuous = false;
  recognitionInstance.interimResults = true;

  // متغير مؤقت باش نخزنو فيه النص
  let finalTranscript = '';

  recognitionInstance.onstart = () => {
    setIsListening(true);
    setTranscript('');
    finalTranscript = '';
    console.log('🎤 التسجيل بدأ...');
  };

  recognitionInstance.onresult = (event) => {
    const current = event.resultIndex;
    const transcriptText = event.results[current][0].transcript;
    setTranscript(transcriptText);
    finalTranscript = transcriptText;  // نخزنو في المتغير المؤقت
    console.log('📝 النص المسجل:', transcriptText);
  };

  recognitionInstance.onerror = (event) => {
    console.error('❌ خطأ في التسجيل:', event.error);
    setIsListening(false);
  };

  recognitionInstance.onend = () => {
    console.log('🛑 التسجيل توقف');
    setIsListening(false);
    
    // نستعمل المتغير المؤقت باش نبعتو السؤال
    if (finalTranscript.trim()) {
      handleSendMessage(finalTranscript);
    } else {
      console.log('⚠️ ما فيش نص مسجل');
    }
  };

  recognitionInstance.start();
  setRecognition(recognitionInstance);
};

  // إيقاف التسجيل
  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  // تبديل حالة التسجيل
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar 
        toggleSidebar={() => setShowSidebar(!showSidebar)}
        toggleQuickTips={() => setShowQuickTips(!showQuickTips)}
      />
      
      <div className="flex h-[calc(100vh-64px)] relative">
        {/* Sidebar Left - Recent (يظهر دايماً على PC، مخفي على mobile) */}
        <div className={`
          ${showSidebar ? 'block' : 'hidden'} 
          md:block 
          absolute md:relative 
          z-20 md:z-auto 
          w-80 
          bg-white m-4 rounded-2xl shadow-lg p-4
          transition-all duration-300
        `}>
          <Sidebar />
        </div>
        
        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-white m-4 rounded-2xl shadow-lg overflow-hidden">
          {/* Chat Header with Voice Status */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
              <h2 className="text-white font-semibold">Voice Interaction Status</h2>
              <div className="flex flex-wrap items-center gap-2">
                
                {/* مؤشر الميكروفون */}
                <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
                  <span className="text-white text-xs md:text-sm">
                    {isListening ? '🎤 Microphone Active' : '🎤 Microphone Inactive'}
                  </span>
                </div>
                
                {/* زر التسجيل */}
                <button
                  onClick={toggleListening}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full transition-all
                    ${isListening 
                      ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                      : 'bg-green-500 hover:bg-green-600'
                    }
                  `}
                >
                  <span className="text-white text-sm font-medium">
                    {isListening ? '🛑 إيقاف التسجيل' : '🎤 بدء التسجيل'}
                  </span>
                </button>
              </div>
            </div>
            
            {/* النص المسجل (يظهر تحت) */}
            {transcript && (
              <div className="mt-3 bg-white/10 rounded-lg p-3">
                <p className="text-white text-sm">
                  <span className="font-semibold">📝 سؤالك:</span> {transcript}
                </p>
              </div>
            )}
          </div>

          {/* Messages */}
          <ChatInterface 
            messages={messages} 
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
          />
        </main>

        {/* Quick Tips Sidebar (يظهر دايماً على PC، مخفي على mobile) */}
        <div className={`
          ${showQuickTips ? 'block' : 'hidden'} 
          md:block 
          absolute md:relative 
          z-20 md:z-auto 
          w-80 
          right-0
          bg-white m-4 rounded-2xl shadow-lg p-4
          transition-all duration-300
        `}>
          <QuickTips />
        </div>
      </div>
    </div>
  );
}

export default App;