import React from 'react';

const MessageList = ({ messages, isTyping }) => {
  const displayMessages = [...messages];
  if (isTyping) {
    displayMessages.push({ id: 'typing', type: 'bot', content: 'Bot is typing...' });
  }
  return (
    <div className="space-y-4">
      {displayMessages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[70%] rounded-2xl p-4 ${
              message.type === 'user'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {message.options && (
              <div className="mt-3 space-y-2">
                {message.options.map((option, idx) => (
                  <button
                    key={idx}
                    className="w-full bg-white text-gray-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all"
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
            
            {/* عرض المصادر إذا كانت موجودة */}
            {message.sources && message.sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-200">
                <p className="text-xs font-semibold mb-1">المصادر:</p>
                {message.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-400 hover:underline mt-1"
                  >
                    {source.title || 'مصدر'}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;