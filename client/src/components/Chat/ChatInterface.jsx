// client/src/components/Chat/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
// في ChatInterface.jsx
import MessageList from './MessageList';      // نفس المجلد
import MessageInput from './MessageInput';    // نفس المجلد
import TypingIndicator from './TypingIndicator'; // نفس المجلد
import { getUserSessions, getSessionMessages } from '../../services/chatHistory';
import { getToken } from '../../services/auth';
import '../../styles/Attijarichat.css'
import ConfidenceScore from "../ConfidenceScore";
import FeedbackButtons from "../FeedbackButtons";
/* ─────────────────────────────────────────────
   IMAGE PLACEHOLDERS
   Replace the src values below with your actual
   image paths once you add them to /public or /assets
   ───────────────────────────────────────────── */
const LOGO_FULL   = '/src/assets/attijari-logo-full.png';   // Full logo with text (sidebar header)
const LOGO_ICON   = '/src/assets/attijari-logo-icon.png';   // Square icon only (message avatars)

/* ── Icons ── */
const ChevronIcon = ({ open }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);
const SendIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);
const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

/* ── Attijari brand avatar (fallback if image missing) ── */
const BrandAvatar = ({ size = 40 }) => (
  <div
    className="flex-shrink-0 rounded-lg overflow-hidden flex items-center justify-center"
    style={{ width: size, height: size, background: 'linear-gradient(135deg, #C8371A, #E8521D)' }}
  >
    {/* Replace with: <img src={LOGO_ICON} alt="Attijari" className="w-full h-full object-cover" /> */}
    <img
      src={LOGO_ICON}
      alt="Attijari"
      className="w-full h-full object-cover"
      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
    />
    <span style={{ display:'none', color:'white', fontWeight:'bold', fontSize: size * 0.35 }}>A</span>
  </div>
);

/* ── Format date for sidebar sessions ── */
const formatSessionDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
const ChatInterface = () => {
  const [messages, setMessages]               = useState([]);
  const [sessions, setSessions]               = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isTyping, setIsTyping]               = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [historyOpen, setHistoryOpen]         = useState(true);
  const [inputValue, setInputValue]           = useState('');
  const [isMobile, setIsMobile]               = useState(false);
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [chatMode, setChatMode]               = useState('french'); // 'french' or 'derja'

  const messagesEndRef = useRef(null);

  /* responsive */
  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768;
      setIsMobile(m);
      if (m) setSidebarOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  const loadSessions = async () => {
    try {
      const data = await getUserSessions();
      setSessions(data.sessions || []);
      if (data.sessions?.length > 0 && !currentSessionId) {
        loadSession(data.sessions[0].session_id);
      }
    } catch (e) { console.error(e); }
  };

  const loadSession = async (sessionId) => {
    setLoading(true);
    try {
      const data = await getSessionMessages(sessionId);
      setMessages(data.messages || []);
      setCurrentSessionId(sessionId);
      if (isMobile) setSidebarOpen(false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const startNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    if (isMobile) setSidebarOpen(false);
  };

 
const handleDeleteSession = async (e, sessionId) => {
  e.stopPropagation();
  try {
    // هذا يحتاج endpoint في الـ backend
    // await deleteSession(sessionId);
    setSessions(s => s.filter(s => s.session_id !== sessionId));
    if (currentSessionId === sessionId) startNewChat();
  } catch (e) { console.error(e); }
};

const handleDeleteAll = async () => {
  if (!window.confirm('Supprimer tout l\'historique ?')) return;
  try {
    // هذا يحتاج endpoint في الـ backend
    // await deleteAllSessions();
    setSessions([]);
    startNewChat();
  } catch (e) { console.error(e); }
};
 

  const handleSend = async (text) => {
    const msg = text || inputValue;
    if (!msg.trim()) return;
    setInputValue('');

    console.log("CHAT RESPONSE:", res);

setMessages(prev => [...prev, {
  role: 'assistant',
  content: res.answer,
  sources: res.sources || [],
  eval_id: res.eval_id || null,
  auto_score: res.auto_score || null,
  timestamp: new Date().toISOString(),
}]);
    setIsTyping(true);

    try {
      const res = await sendMessage(msg, currentSessionId, chatMode); // Pass chatMode
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        timestamp: new Date().toISOString(),
      }]);
      if (!currentSessionId && res.session_id) {
        setCurrentSessionId(res.session_id);
        loadSessions();
      }
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Une erreur est survenue. Veuillez réessayer.',
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  /* ── render ── */
  return (
    <div className="attijari-root">

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="attijari-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className={`attijari-sidebar ${sidebarOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          {/* ── LOGO PLACEHOLDER ──
              Replace the <div> below with:
              <img src={LOGO_FULL} alt="Attijari Bank" className="sidebar-logo-img" />
          ── */}
          <div className="sidebar-logo-placeholder">
            <div className="logo-icon-box">
              <img
                src={LOGO_FULL}
                alt="Attijari Bank"
                className="sidebar-logo-img"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
              />
              <div className="logo-fallback" style={{ display:'none' }}>
                <div className="logo-wave">≋</div>
                
                <div className="logo-text-group">
                  <span className="logo-arabic">التجاري بنك</span>
                  <span className="logo-latin"><strong>Attijari</strong> bank</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History section */}
        <div className="sidebar-section">
          <button className="sidebar-section-header" onClick={() => setHistoryOpen(o => !o)}>
            <span>Conversation History</span>
            <ChevronIcon open={historyOpen} />
          </button>

          {historyOpen && (
            <div className="sidebar-sessions">
              {sessions.length === 0 ? (
                <p className="sidebar-empty">Aucune conversation</p>
              ) : (
                sessions.map(s => (
                  <div
                    key={s.session_id}
                    className={`sidebar-session-item ${currentSessionId === s.session_id ? 'active' : ''}`}
                    onClick={() => loadSession(s.session_id)}
                  >
                    <div className="session-meta">
                      <span className="session-name">{s.session_name || 'Conversation'} - {formatSessionDate(s.updated_at)}</span>
                      <span className="session-delete" onClick={e => handleDeleteSession(e, s.session_id)} title="Supprimer">
                        <TrashIcon />
                      </span>
                    </div>
                    {s.last_message && <p className="session-preview">{s.last_message}</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="sidebar-footer">
          <button className="btn-new-chat" onClick={startNewChat}>New Chat</button>
          <button className="btn-delete-all" onClick={handleDeleteAll}>Delete All History</button>
        </div>
      </aside>

      {/* ══ MAIN CHAT ══ */}
      <main className="attijari-main">

        {/* Top bar */}
        <header className="chat-topbar">
          {isMobile && (
            <button className="topbar-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          
          {/* Mode selector buttons */}
          <div className="mode-selector">
            <button 
              className={`mode-btn ${chatMode === 'french' ? 'active' : ''}`}
              onClick={() => setChatMode('french')}
            >
              Français
            </button>
            <button 
              className={`mode-btn ${chatMode === 'derja' ? 'active' : ''}`}
              onClick={() => setChatMode('derja')}
            >
              الدارجة
            </button>
          </div>
          
          <h1 className="topbar-title">Attijari Chatbot</h1>
          <span className="topbar-subtitle">Attijari Bank Assistant | التجاري بنك</span>
        </header>

        {/* Messages */}
        <div className="chat-messages-area">
          {loading ? (
            <div className="chat-loading">
              <div className="loading-spinner" />
              <p>Chargement…</p>
            </div>
          ) : (
            <>
              <MessageList
                messages={messages}
                isTyping={isTyping}
                logoIcon={LOGO_ICON}
              />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar */}
        <div className="chat-input-bar">
          <button className="input-icon-btn" title="Microphone">
            <MicIcon />
          </button>
          <input
            className="chat-input-field"
            type="text"
            placeholder="Type a message... | أكتب رسالتك هنا..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button
            className="input-send-btn"
            onClick={() => handleSend()}
            disabled={!inputValue.trim()}
            title="Envoyer"
          >
            <SendIcon />
          </button>
          <button className="input-icon-btn" title="Paramètres">
            <SettingsIcon />
          </button>
        </div>
      </main>
    </div>
  );
};

export default ChatInterface;
