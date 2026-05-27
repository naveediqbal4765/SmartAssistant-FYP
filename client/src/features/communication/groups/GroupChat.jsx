import { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import MessageBubble from '../chat/components/MessageBubble';
import ReplyPreview from '../chat/components/ReplyPreview';
import VoiceRecorder from '../chat/components/VoiceRecorder';
import { buildReplyTarget } from '../chat/utils/replyPreview';
import Button from '../../../components/ui/Button';
import { ChatSkeleton } from '../../../components/ui/Skeleton';

const isAdmin = (group, userId) => {
  return group?.members?.some((member) => {
    const memberId = String(member.userId?._id || member.userId);
    return memberId === String(userId) && member.role === 'admin';
  });
};

export default function GroupChat({
  group,
  currentUserId,
  messages,
  onSendMessage,
  onSendVoice,
  onDeleteMessage,
  onReactToMessage,
  targetMessageId,
  onOpenSettings
}) {
  const [text, setText] = useState('');
  const [showRecorder, setShowRecorder] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageRefs = useRef({});
  const highlightTimerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);

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

  useEffect(() => {
    if (!targetMessageId) return;
    messageRefs.current[String(targetMessageId)]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }, [messages, targetMessageId]);

  useEffect(() => {
    nearBottomRef.current = true;
    previousMessageCountRef.current = 0;
    setHasNewMessages(false);
    if (!targetMessageId) {
      window.setTimeout(() => scrollToBottom('auto'), 80);
    }
  }, [group?._id]);

  useEffect(() => {
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
  }, [messages.length, targetMessageId]);

  if (!group) {
    return (
      <div className="motion-card h-[70vh] rounded-xl bg-white">
        <ChatSkeleton />
      </div>
    );
  }

  const admin = isAdmin(group, currentUserId);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim(), replyTo);
    setText('');
    setReplyTo(null);
  };

  const handleReply = (message) => {
    setReplyTo(buildReplyTarget(message, currentUserId, message.senderName || message.senderId?.name));
  };

  const handleJumpToMessage = (messageId) => {
    if (!messageId) return;
    messageRefs.current[String(messageId)]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(String(messageId));
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedMessageId(''), 1600);
  };

  return (
    <div className="motion-panel-in motion-card flex h-[70vh] flex-col rounded-xl bg-white">
      <div className="relative z-10 border-b bg-white p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{group.name}</h2>
            <p className="text-sm text-gray-500">{group.description}</p>
            <p className="text-sm text-gray-500">{group.members?.length || 0} members</p>
          </div>
          <Button variant={admin ? 'primary' : 'secondary'} onClick={onOpenSettings}>
            {admin ? 'Group Settings' : 'View Members'}
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 space-y-3 overflow-y-auto bg-gray-50 px-4 pb-16 pt-16"
      >
        {!messages.length && <div className="text-gray-500">No group messages yet.</div>}
        {messages.map((message) => {
          const mine = String(message.senderId?._id || message.senderId) === String(currentUserId);
          return (
            <div
              key={message._id}
              ref={(node) => {
                if (node) messageRefs.current[String(message._id)] = node;
              }}
            >
              <MessageBubble
                message={message}
                currentUserId={currentUserId}
                onDelete={onDeleteMessage}
                onReact={onReactToMessage}
                onReply={handleReply}
                onJumpToMessage={handleJumpToMessage}
                highlighted={highlightedMessageId === String(message._id)}
                allowDeleteForMe
                allowDeleteForEveryone={mine || admin}
                showDisabledDeleteForEveryone={false}
                senderLabel={mine ? '' : (message.senderName || message.senderId?.name || 'Member')}
              />
            </div>
          );
        })}
        <div ref={messagesEndRef} />
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

      <div className="border-t p-4">
        <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />
        {showRecorder && (
          <div className="mb-3">
            <VoiceRecorder
              disabled={!group}
              onSendVoice={(audioBlob, duration) => {
                onSendVoice(audioBlob, duration, replyTo);
                setReplyTo(null);
              }}
            />
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowRecorder((value) => !value)}
            aria-label="Record voice note"
            title="Record voice note"
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              showRecorder
                ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Mic size={22} />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Message group..."
            className="flex-1 rounded-xl border px-4 py-3"
          />
          <Button type="submit" disabled={!text.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
}
