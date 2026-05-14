import React, { useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

const ChatInterface = ({ messages, isTyping, onSendMessage }) => {
  const messagesEndRef = useRef(null);
  const containerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      {/* منطقة الرسائل مع التمرير */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto p-6"
        style={{ maxHeight: 'calc(100vh - 200px)' }} // يضمن مساحة كافية للـ input
      >
        <MessageList messages={messages} />
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input ثابت في القاع */}
      <div className="border-t bg-white p-4 sticky bottom-0">
        <MessageInput onSendMessage={onSendMessage} />
      </div>
    </div>
  );
};

export default ChatInterface;