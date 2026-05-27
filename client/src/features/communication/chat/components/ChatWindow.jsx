import { useEffect, useRef, useState } from 'react';
import MessageBubble from './MessageBubble';
import CallButton from '../../calls/CallButton';
import { ChatSkeleton } from '../../../../components/ui/Skeleton';

export default function ChatWindow({
  conversation,
  messages,
  currentUserId,
  loading,
  callDisabled,
  onStartAudioCall,
  onStartVideoCall,
  onDeleteMessage,
  onReactToMessage,
  onReplyToMessage,
  targetMessageId
}) {
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageRefs = useRef({});
  const highlightTimerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const [hasNewMessages, setHasNewMessages] = useState(false);

  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    nearBottomRef.current = true;
    setHasNewMessages(false);
  };

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    const nearBottom = distanceFromBottom < 140;
    nearBottomRef.current = nearBottom;
    if (nearBottom) setHasNewMessages(false);
  };

  const handleJumpToMessage = (messageId) => {
    if (!messageId) return;
    messageRefs.current[String(messageId)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(String(messageId));
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedMessageId(''), 1600);
  };

  useEffect(() => {
    if (!targetMessageId || loading) return;
    window.setTimeout(() => handleJumpToMessage(targetMessageId), 100);
  }, [targetMessageId, loading, messages]);

  useEffect(() => {
    nearBottomRef.current = true;
    previousMessageCountRef.current = 0;
    setHasNewMessages(false);
    if (!targetMessageId) {
      window.setTimeout(() => scrollToBottom('auto'), 80);
    }
  }, [conversation?.id]);

  useEffect(() => {
    if (loading) return;

    const previousCount = previousMessageCountRef.current;
    const currentCount = messages.length;
    previousMessageCountRef.current = currentCount;

    if (!currentCount) {
      setHasNewMessages(false);
      return;
    }

    const initialLoad = previousCount === 0;
    const messageAdded = currentCount > previousCount;

    if ((initialLoad && !targetMessageId) || nearBottomRef.current) {
      window.setTimeout(() => scrollToBottom(initialLoad ? 'auto' : 'smooth'), 60);
    } else if (messageAdded) {
      setHasNewMessages(true);
    }
  }, [messages.length, loading, targetMessageId]);

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
      <div className="relative z-10 border-b bg-white p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900">{conversation.participant?.name || 'Conversation'}</h2>
            <p className="text-sm text-gray-500 capitalize">{conversation.participant?.role || ''}</p>
          </div>
          <CallButton
            disabled={callDisabled}
            onStartAudioCall={onStartAudioCall}
            onStartVideoCall={onStartVideoCall}
          />
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 pb-16 pt-16"
      >
        {loading ? (
          <ChatSkeleton showHeader={false} />
        ) : messages.length ? (
          <>
            {messages.map((message) => {
              const messageId = String(message._id || message.clientId || '');
              return (
                <div
                  key={messageId}
                  ref={(node) => {
                    if (node) messageRefs.current[messageId] = node;
                  }}
                >
                  <MessageBubble
                    message={message}
                    currentUserId={currentUserId}
                    onDelete={onDeleteMessage}
                    onReact={onReactToMessage}
                    onReply={onReplyToMessage}
                    onJumpToMessage={handleJumpToMessage}
                    highlighted={highlightedMessageId === messageId}
                  />
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">No messages yet.</div>
        )}
        {hasNewMessages && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="sticky bottom-3 left-1/2 z-40 mx-auto block -translate-x-1/2 rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-secondary"
          >
            New Messages ↓
          </button>
        )}
      </div>
    </div>
  );
}
