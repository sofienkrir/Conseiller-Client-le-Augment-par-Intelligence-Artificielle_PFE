// client/src/components/Chat/MessageList.jsx
import React from 'react';
import '../../styles/Attijarichat.css'
import ConfidenceScore from '../ConfidenceScore';
import FeedbackButtons from '../FeedbackButtons';

/* ── Language direction detection ── */
const getDir = (text = '') => {
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const la = (text.match(/[a-zA-ZÀ-ÿ]/g)    || []).length;
  return ar > la ? 'rtl' : 'ltr';
};

/* ── Inline markdown: **bold** ── */
const inlineFmt = (text) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => {
    const m = p.match(/^\*\*(.+)\*\*$/);
    return m ? <strong key={i}>{m[1]}</strong> : p;
  });

/* ── Block markdown renderer (no external lib) ── */
const renderMd = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const out = [];
  let globalIndex = 0; // عداد عام لكل العناصر
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (!line.trim()) { 
      out.push(<div key={`spacer-${globalIndex++}`} className="md-spacer" />); 
      continue; 
    }
    
    const heading = line.match(/^\*\*(.+)\*\*\s*:?\s*$/);
    if (heading) { 
      out.push(<p key={`heading-${globalIndex++}`} className="md-heading">{heading[1]}</p>); 
      continue; 
    }
    
    if (line.trim().match(/^[*\-]\s+/)) {
      const items = [];
      while (i < lines.length && lines[i].trim().match(/^[*\-]\s+/)) {
        items.push(lines[i].trim().replace(/^[*\-]\s+/, '')); 
        i++;
      }
      i--; // نرجع i خطوة لأن الـ for loop راح يزيدها بعدين
      
      out.push(
        <ul key={`list-${globalIndex++}`} className="md-list">
          {items.map((it, idx) => 
            <li key={`item-${globalIndex}-${idx}`} className="md-list-item">
              <span className="md-bullet" />
              {inlineFmt(it)}
            </li>
          )}
        </ul>
      );
      continue;
    }
    
    out.push(<p key={`para-${globalIndex++}`} className="md-para">{inlineFmt(line)}</p>);
  }
  
  return out;
};

/* ── Typing dots ── */
const TypingIndicator = ({ logoIcon }) => (
  <div className="msg-row bot">
    <BotAvatar logoIcon={logoIcon} />
    <div className="typing-bubble">
      <span className="dot" style={{ animationDelay: '0s' }}   />
      <span className="dot" style={{ animationDelay: '.18s' }} />
      <span className="dot" style={{ animationDelay: '.36s' }} />
    </div>
  </div>
);

/* ── Bot avatar ── */
const BotAvatar = ({ logoIcon }) => (
  <div className="bot-avatar">
    {/* ── AVATAR LOGO PLACEHOLDER ──
        Image path: /assets/attijari-logo-icon.png
        This should be the square Attijari brand mark (the wave/M symbol on orange/red background)
    ── */}
    <img
      src={logoIcon}
      alt="Attijari"
      className="bot-avatar-img"
      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
    />
    <div className="bot-avatar-fallback">≋</div>
  </div>
);

/* ── Sources ── */
const Sources = ({ sources }) => (
  <div className="msg-sources">
    {sources.map((src, i) => (
      <a key={i} href={src.url || '#'} target="_blank" rel="noopener noreferrer" className="source-badge">
        {src.title || `Source ${i + 1}`}
      </a>
    ))}
  </div>
);

/* ══ Main ══ */
const MessageList = ({ messages, isTyping, logoIcon }) => (
  <div className="msg-list">
    {messages.map((msg, idx) => {
      const isUser = msg.role === 'user' || msg.type === 'user';
      const dir    = getDir(msg.content);

      if (isUser) {
        return (
          <div key={msg.id ?? idx} className="msg-row user">
            <div className="msg-bubble user" dir={dir} style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
              {msg.content}
            </div>
          </div>
        );
      }

      return (
        <div key={msg.id ?? idx} className="msg-row bot">
          <BotAvatar logoIcon={logoIcon} />
          <div className="msg-bubble bot" dir={dir} style={{ textAlign: dir === 'rtl' ? 'right' : 'left' }}>
            {renderMd(msg.content)}
            {msg.sources?.length > 0 && <Sources sources={msg.sources} />}
            {msg.eval_id && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <ConfidenceScore evalId={msg.eval_id} initialAutoScore={msg.auto_score} />
                <FeedbackButtons evalId={msg.eval_id} />
              </div>
            )}
          </div>
        </div>
      );
    })}
    {isTyping && <TypingIndicator logoIcon={logoIcon} />}
  </div>
);

export default MessageList;
