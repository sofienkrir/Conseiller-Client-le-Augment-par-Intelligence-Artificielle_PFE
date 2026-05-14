import React from 'react';
import './Message.css';

const Message = ({ message }) => {
  const { role, content, sources } = message;

  return (
    <div className={`message ${role}`}>
      <div className="message-content">
        {content}
      </div>
      {sources && sources.length > 0 && (
        <div className="sources">
          <strong>Sources:</strong>
          <ul>
            {sources.map((source, index) => (
              <li key={index}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Message;
