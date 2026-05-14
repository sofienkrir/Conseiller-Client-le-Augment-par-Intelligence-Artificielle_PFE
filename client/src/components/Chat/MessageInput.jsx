import React, { useState } from 'react';
import '../../styles/Attijarichat.css';

const MessageInput = ({ onSendMessage }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-input-bar">
      <form onSubmit={handleSubmit} className="input-form">
        <button className="input-icon-btn" type="button" title="Microphone">
          <span>🎤</span>
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message... | أكتب رسالتك هنا..."
          className="chat-input-field"
        />
        <button
          className="input-send-btn"
          type="submit"
          disabled={!input.trim()}
          title="Envoyer"
        >
          <span>📤</span>
        </button>
      </form>
    </div>
  );
};

export default MessageInput;