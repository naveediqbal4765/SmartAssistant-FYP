import { useRef, useState } from 'react';
import ChatInput from './ChatInput';
import ChatWindow from './ChatWindow';
import MediaCaptureModal from './MediaCaptureModal';

const SWIPE_CLOSE_THRESHOLD_PX = 72;
const SWIPE_CLOSE_VERTICAL_TOLERANCE_PX = 80;

export default function ChatBox({
  conversation,
  messages,
  currentUserId,
  loadingMessages,
  sending,
  onSendMessage,
  onSendVoice,
  onSendMedia,
  onTypingStart,
  onTypingStop,
  onDeleteMessage,
  onReactToMessage,
  onReplyToMessage,
  onForwardMessage,
  typingLabel,
  replyTo,
  onCancelReply,
  targetMessageId,
  callDisabled,
  onStartAudioCall,
  onStartVideoCall,
  callScreen,
  onMobileBack,
  className = ''
}) {
  const [captureMode, setCaptureMode] = useState('');
  const mediaInputRef = useRef(null);
  const swipeStartRef = useRef(null);

  const handleCapturedMedia = (file) => {
    onSendMedia?.(file);
    setCaptureMode('');
  };

  const handleFallbackMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !conversation) return;
    onSendMedia?.(file);
    setCaptureMode('');
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

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStartRef.current = null;
      }}
      className={`relative flex h-[70vh] touch-pan-y flex-col rounded-[2rem] ${className}`}
    >
      {onMobileBack && !captureMode && (
        <button
          type="button"
          onClick={onMobileBack}
          className="swipe-close-hint z-[90] mx-auto mb-2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-brand-primary shadow-xl shadow-gray-900/15 ring-1 ring-emerald-100 backdrop-blur lg:hidden"
        >
          Swipe right to close
        </button>
      )}
      <div className="motion-panel-in motion-card flex min-h-0 flex-1 flex-col overflow-hidden rounded-[inherit] bg-white shadow-xl shadow-gray-200/70 ring-1 ring-gray-200/70">
      <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFallbackMediaChange} />
      {captureMode ? (
        <MediaCaptureModal
          open
          mode={captureMode}
          onClose={() => setCaptureMode('')}
          onCapture={handleCapturedMedia}
          onFallback={() => mediaInputRef.current?.click()}
          fillContainer
        />
      ) : (
        <>
          {callScreen || (
            <>
              <div className="min-h-0 flex-1">
                <ChatWindow
                  conversation={conversation}
                  messages={messages}
                  currentUserId={currentUserId}
                  loading={loadingMessages}
                  callDisabled={callDisabled}
                  onStartAudioCall={onStartAudioCall}
                  onStartVideoCall={onStartVideoCall}
                  onDeleteMessage={onDeleteMessage}
                  onReactToMessage={onReactToMessage}
                  onReplyToMessage={onReplyToMessage}
                  onForwardMessage={onForwardMessage}
                  typingLabel={typingLabel}
                  targetMessageId={targetMessageId}
                />
              </div>
              <ChatInput
                disabled={!conversation}
                sending={sending}
                onSend={onSendMessage}
                onSendVoice={onSendVoice}
                onSendMedia={onSendMedia}
                onTypingStart={onTypingStart}
                onTypingStop={onTypingStop}
                replyTo={replyTo}
                onCancelReply={onCancelReply}
                onOpenCapture={setCaptureMode}
              />
            </>
          )}
        </>
      )}
      </div>
    </div>
  );
}
