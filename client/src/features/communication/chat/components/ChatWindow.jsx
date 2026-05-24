import { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';

export default function ChatWindow({ conversation, messages, currentUserId, loading }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-6 text-center text-gray-500">
        <div>
          <p className="text-lg font-semibold text-gray-700">No conversation selected</p>
          <p className="mt-2">Choose a conversation or search for an allowed user to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white p-4">
        <h2 className="font-bold text-gray-900">{conversation.participant?.name || 'Conversation'}</h2>
        <p className="text-sm text-gray-500 capitalize">{conversation.participant?.role || ''}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-500">Loading messages...</div>
        ) : messages.length ? (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message._id || message.clientId}
                message={message}
                currentUserId={currentUserId}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">No messages yet.</div>
        )}
      </div>
    </div>
  );
}
