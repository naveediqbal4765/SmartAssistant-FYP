import { useEffect, useRef, useState } from 'react';
import { Camera, File, Image, Mic, Paperclip, Phone, Video } from 'lucide-react';
import MediaCaptureModal from '../chat/components/MediaCaptureModal';
import MessageBubble from '../chat/components/MessageBubble';
import ReplyPreview from '../chat/components/ReplyPreview';
import VoiceRecorder from '../chat/components/VoiceRecorder';
import { buildReplyTarget } from '../chat/utils/replyPreview';
import Button from '../../../components/ui/Button';
import { ChatSkeleton } from '../../../components/ui/Skeleton';

const SWIPE_CLOSE_THRESHOLD_PX = 72;
const SWIPE_CLOSE_VERTICAL_TOLERANCE_PX = 80;

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
  activeCall,
  callState,
  onStartGroupAudioCall,
  onStartGroupVideoCall,
  onJoinGroupCall,
  onSendMessage,
  onSendVoice,
  onSendMedia,
  onDeleteMessage,
  onReactToMessage,
  onForwardMessage,
  onTypingStart,
  onTypingStop,
  typingLabel,
  targetMessageId,
  onOpenSettings,
  onMobileBack,
  className = ''
}) {
  const [text, setText] = useState('');
  const [activePanel, setActivePanel] = useState(null);
  const [captureMode, setCaptureMode] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState('');
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const messageRefs = useRef({});
  const highlightTimerRef = useRef(null);
  const nearBottomRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const panelRef = useRef(null);
  const attachmentButtonRef = useRef(null);
  const micButtonRef = useRef(null);
  const mediaInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const swipeStartRef = useRef(null);
  const showRecorder = activePanel === 'mic';
  const showAttachments = activePanel === 'attachments';

  const scrollToBottom = (behavior = 'smooth') => {
    window.requestAnimationFrame(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior
      });
      nearBottomRef.current = true;
      setHasNewMessages(false);
    });
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

  useEffect(() => {
    if (!text.trim()) return undefined;

    const timerId = window.setTimeout(() => {
      onTypingStop?.();
    }, 2500);

    return () => window.clearTimeout(timerId);
  }, [onTypingStop, text]);

  useEffect(() => {
    if (!activePanel) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (
        panelRef.current?.contains(target)
        || attachmentButtonRef.current?.contains(target)
        || micButtonRef.current?.contains(target)
      ) {
        return;
      }

      setActivePanel(null);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [activePanel]);

  if (!group) {
    return (
      <div className={`motion-card h-[70vh] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-gray-200/70 ring-1 ring-gray-200/70 ${className}`}>
        <ChatSkeleton />
      </div>
    );
  }

  const admin = isAdmin(group, currentUserId);
  const hasActiveCall = Boolean(activeCall?.groupId);
  const inCall = callState !== 'idle';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim(), replyTo);
    onTypingStop?.();
    setText('');
    setReplyTo(null);
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setActivePanel(null);
    onSendMedia?.(file, replyTo);
    setReplyTo(null);
  };

  const openCapture = (mode) => {
    if (!navigator.mediaDevices?.getUserMedia || (mode === 'video' && !window.MediaRecorder)) {
      mediaInputRef.current?.click();
      return;
    }
    setActivePanel(null);
    setCaptureMode(mode);
  };

  const handleCapturedMedia = (file) => {
    setActivePanel(null);
    onSendMedia?.(file, replyTo);
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

  const handlePointerDown = (event) => {
    if (!onMobileBack || !window.matchMedia('(max-width: 1023px)').matches) return;
    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  };

  const handlePointerUp = (event) => {
    if (!swipeStartRef.current || !onMobileBack) return;

    const deltaX = event.clientX - swipeStartRef.current.x;
    const deltaY = Math.abs(event.clientY - swipeStartRef.current.y);
    swipeStartRef.current = null;

    if (deltaX > SWIPE_CLOSE_THRESHOLD_PX && deltaY < SWIPE_CLOSE_VERTICAL_TOLERANCE_PX) {
      onMobileBack();
    }
  };

  if (captureMode) {
    return (
      <div className={`motion-panel-in motion-card h-[70vh] overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-gray-200/70 ring-1 ring-gray-200/70 ${className}`}>
        <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaChange} />
        <MediaCaptureModal
          open
          mode={captureMode}
          onClose={() => setCaptureMode('')}
          onCapture={handleCapturedMedia}
          onFallback={() => mediaInputRef.current?.click()}
          fillContainer
        />
      </div>
    );
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStartRef.current = null;
      }}
      className={`relative flex h-[70vh] touch-pan-y flex-col rounded-[2rem] ${className}`}
    >
      {onMobileBack && (
        <button
          type="button"
          onClick={onMobileBack}
          className="swipe-close-hint z-[90] mx-auto mb-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-brand-primary shadow-xl shadow-gray-900/15 ring-1 ring-emerald-100 backdrop-blur lg:hidden"
        >
          Swipe right to close
        </button>
      )}
      <div className="motion-panel-in motion-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-white shadow-xl shadow-gray-200/70 ring-1 ring-gray-200/70">
      <div className="relative z-10 border-b border-gray-200 bg-gray-50 p-4 shadow-[inset_0_-10px_16px_-18px_rgba(15,23,42,0.45)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">{group.name}</h2>
            <p className="text-sm text-gray-500">{group.description}</p>
            <p className="text-sm text-gray-500">{group.members?.length || 0} members</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {hasActiveCall && !inCall ? (
              <Button variant="success" onClick={onJoinGroupCall}>
                Join {activeCall.callType === 'video' ? 'Video' : 'Audio'} Call
              </Button>
            ) : (
              <>
                <Button
                  variant="success"
                  disabled={inCall}
                  onClick={onStartGroupAudioCall}
                  className="transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Phone size={16} />
                  Audio Call
                </Button>
                <Button
                  disabled={inCall}
                  onClick={onStartGroupVideoCall}
                  className="transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Video size={16} />
                  Video Call
                </Button>
              </>
            )}
            <Button variant={admin ? 'primary' : 'secondary'} onClick={onOpenSettings}>
              {admin ? 'Group Settings' : 'View Members'}
            </Button>
          </div>
        </div>
        {hasActiveCall && !inCall && (
          <div className="mt-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
            A group {activeCall.callType || 'audio'} call is in progress.
          </div>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 space-y-3 overflow-y-auto bg-gray-50 px-5 pb-16 pt-16"
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
                onForward={onForwardMessage}
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

      <div className="relative border-t border-gray-100 bg-white p-4 shadow-[inset_0_10px_16px_-18px_rgba(15,23,42,0.45)]">
        {typingLabel && (
          <div className="mb-2 text-sm font-semibold text-green-700">{typingLabel}</div>
        )}
        <ReplyPreview replyTo={replyTo} onCancel={() => setReplyTo(null)} />
        {showRecorder && (
          <div ref={panelRef} className="mb-3">
            <VoiceRecorder
              disabled={!group}
              onSendVoice={(audioBlob, duration) => {
                onSendVoice(audioBlob, duration, replyTo);
                setReplyTo(null);
              }}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}
        <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaChange} />
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="hidden" onChange={handleMediaChange} />
        <div
          ref={showAttachments ? panelRef : null}
          className={`absolute bottom-20 left-4 z-[80] w-64 origin-bottom-left rounded-2xl bg-white p-2 shadow-2xl shadow-gray-900/15 ring-1 ring-black/5 transition-all duration-200 ease-out ${
            showAttachments
              ? 'pointer-events-auto translate-y-0 scale-100 opacity-100'
              : 'pointer-events-none translate-y-2 scale-95 opacity-0'
          }`}
        >
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => mediaInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
              <Image size={16} /> Media
            </button>
            <button type="button" onClick={() => openCapture('photo')} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
              <Camera size={16} /> Take Photo
            </button>
            <button type="button" onClick={() => openCapture('video')} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
              <Video size={16} /> Record Video
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
              <File size={16} /> File
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <button
            ref={attachmentButtonRef}
            type="button"
            onClick={() => setActivePanel((panel) => (panel === 'attachments' ? null : 'attachments'))}
            aria-label="Attach media or file"
            title="Attach"
            className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
              showAttachments
                ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            }`}
          >
            <Paperclip size={22} />
          </button>
          <button
            ref={micButtonRef}
            type="button"
            onClick={() => setActivePanel((panel) => (panel === 'mic' ? null : 'mic'))}
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
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.trim()) {
                onTypingStart?.();
              } else {
                onTypingStop?.();
              }
            }}
            placeholder="Message group..."
            className="flex-1 rounded-xl border px-4 py-3"
          />
          <Button type="submit" disabled={!text.trim()}>
            Send
          </Button>
        </form>
        <MediaCaptureModal
          open={Boolean(captureMode)}
          mode={captureMode}
          onClose={() => setCaptureMode('')}
          onCapture={handleCapturedMedia}
          onFallback={() => mediaInputRef.current?.click()}
        />
      </div>
      </div>
    </div>
  );
}
