// client/src/components/Chat/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MessageList from './MessageList';
import { getUserSessions, getSessionMessages } from '../../services/chatHistory';
import { getToken, getCurrentUser } from '../../services/auth';
import '../../styles/Attijarichat.css'

const LOGO_FULL = '/src/assets/attijari-logo-full.png';
const LOGO_ICON = '/src/assets/attijari-logo-icon.png';
const API_URL   = 'http://localhost:8000';

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

const formatSessionDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/* ══════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════ */
const ChatInterface = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [messages, setMessages]                 = useState([]);
  const [sessions, setSessions]                 = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isTyping, setIsTyping]                 = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [historyOpen, setHistoryOpen]           = useState(true);
  const [inputValue, setInputValue]             = useState('');
  const [isMobile, setIsMobile]                 = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(true);
  const [chatMode, setChatMode]                 = useState('french');

  const messagesEndRef = useRef(null);

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
    setSessions(s => s.filter(x => x.session_id !== sessionId));
    if (currentSessionId === sessionId) startNewChat();
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Supprimer tout l'historique ?")) return;
    setSessions([]);
    startNewChat();
  };

  /* ── SSE streaming send ── */
  const handleSend = async (text) => {
    const msg = (text || inputValue).trim();
    if (!msg) return;
    setInputValue('');

    // 1. Ajoute le message user
    setMessages(prev => [...prev, {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    }]);
    setIsTyping(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: msg,
          language: chatMode,
          conversation_id: currentSessionId || undefined,
          dataset: 'particulier',
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // 2. Première réponse reçue : ouvre la bulle de streaming
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      }]);

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // garde la ligne incomplète

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const evt = JSON.parse(raw);

            // Tokens → append dans la bulle
            if (evt.type === 'token') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + evt.text };
                }
                return updated;
              });

            // Meta → injecte sources + eval_id + auto_score
            } else if (evt.type === 'meta') {
              setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === 'assistant') {
                  updated[updated.length - 1] = {
                    ...last,
                    sources:    evt.sources    || [],
                    eval_id:    evt.eval_id    || null,
                    auto_score: evt.auto_score || null,
                  };
                }
                return updated;
              });

            } else if (evt.type === 'done') {
              loadSessions();
            }
          } catch (_) { /* event malformé, on ignore */ }
        }
      }

    } catch (err) {
      console.error('[handleSend]', err);
      setIsTyping(false);
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        // Si la bulle est vide, on y met le message d'erreur
        if (last?.role === 'assistant' && !last.content) {
          updated[updated.length - 1] = { ...last, content: 'Une erreur est survenue. Veuillez réessayer.' };
        } else {
          updated.push({ role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.', timestamp: new Date().toISOString() });
        }
        return updated;
      });
    }
  };

  /* ── render ── */
  return (
    <div className="attijari-root">

      {isMobile && sidebarOpen && (
        <div className="attijari-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ══ SIDEBAR ══ */}
      <aside className={`attijari-sidebar ${sidebarOpen ? 'open' : 'closed'} ${isMobile ? 'mobile' : ''}`}>

        <div className="sidebar-logo">
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

        <div className="sidebar-footer">
          <button className="btn-new-chat" onClick={startNewChat}>New Chat</button>
          <button className="btn-delete-all" onClick={handleDeleteAll}>Delete All History</button>
          {currentUser?.is_admin && (
            <button
              className="btn-delete-all"
              style={{ background: '#4F46E5', marginTop: 6 }}
              onClick={() => navigate('/admin/evaluations')}
            >
              🛡️ Évaluations Admin
            </button>
          )}
        </div>
      </aside>

      {/* ══ MAIN CHAT ══ */}
      <main className="attijari-main">

        <header className="chat-topbar">
          {isMobile && (
            <button className="topbar-menu-btn" onClick={() => setSidebarOpen(o => !o)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          <div className="mode-selector">
            <button className={`mode-btn ${chatMode === 'french' ? 'active' : ''}`} onClick={() => setChatMode('french')}>
              Français
            </button>
            <button className={`mode-btn ${chatMode === 'derja' ? 'active' : ''}`} onClick={() => setChatMode('derja')}>
              الدارجة
            </button>
          </div>

          <h1 className="topbar-title">Attijari Chatbot</h1>
          <span className="topbar-subtitle">Attijari Bank Assistant | التجاري بنك</span>
        </header>

        <div className="chat-messages-area">
          {loading ? (
            <div className="chat-loading">
              <div className="loading-spinner" />
              <p>Chargement…</p>
            </div>
          ) : (
            <>
              <MessageList messages={messages} isTyping={isTyping} logoIcon={LOGO_ICON} />
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

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
