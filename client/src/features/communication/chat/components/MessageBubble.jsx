import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { overlayLayers } from '../../../../components/ui/overlayLayers';
import { reactionEmojiMap, reactionTypes } from '../utils/reactionEmojiMap';

const getUserId = (value) => String(value?._id || value || '');

const getReactionUserName = (reaction, currentUserId) => {
  if (getUserId(reaction.userId) === String(currentUserId)) return 'You';
  return reaction.userId?.name || 'Member';
};

const getReactionEmoji = (reaction) => reaction.emoji || reactionEmojiMap[reaction.type] || '';
const ACTION_MENU_WIDTH = 192;
const ACTION_MENU_MARGIN = 8;
const INTERACTIVE_MESSAGE_TYPES = ['text', 'voice', 'image', 'video', 'file', 'document'];
const TRANSIENT_MESSAGE_STATUSES = ['sending', 'failed'];
const formatFileSize = (bytes) => {
  const size = Number(bytes || 0);
  if (!size) return '';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatVoiceTime = (value) => {
  if (typeof value === 'string' && value.includes(':')) return value;
  const totalSeconds = Math.max(0, Math.round(Number(value || 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const buildWaveformBars = (seed = '', count = 34) => {
  let hash = 0;
  const source = String(seed || 'voice-note');

  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(index);
    hash |= 0;
  }

  return Array.from({ length: count }, (_, index) => {
    const value = Math.abs(Math.sin((hash + index * 31) * 0.017) * 100);
    return 18 + (value % 54);
  });
};

function MessageStatusTicks({ status, className = '' }) {
  const normalizedStatus = status || 'sent';
  const icon = normalizedStatus === 'sent' ? '✓' : '✓✓';
  const statusClass = normalizedStatus === 'seen'
    ? 'font-bold text-white'
    : 'text-white/75';

  return (
    <span className={`ml-1 ${statusClass} ${className}`}>
      {icon}
    </span>
  );
}

function CustomVideoMessage({ src, label }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const hasStarted = playing || progress > 0;

  useEffect(() => () => {
    videoRef.current?.pause();
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    const nextDuration = videoRef.current?.duration;
    if (Number.isFinite(nextDuration)) {
      setDuration(nextDuration);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video?.duration) return;
    setCurrentTime(video.currentTime);
    setProgress(Math.min(1, video.currentTime / video.duration));
  };

  const handleSeek = (event) => {
    const video = videoRef.current;
    if (!video?.duration) return;
    const nextProgress = Number(event.target.value) / 100;
    video.currentTime = nextProgress * video.duration;
    setProgress(nextProgress);
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black shadow-sm ring-1 ring-black/5">
      <button
        type="button"
        onClick={togglePlayback}
        className="relative block bg-black text-left"
        aria-label={playing ? 'Pause video' : 'Play video'}
      >
        <video
          ref={videoRef}
          src={src}
          preload="metadata"
          playsInline
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
          className="block max-h-72 w-[min(20rem,75vw)] bg-black object-contain"
        />
        {!playing && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 pl-1 text-2xl text-white shadow-lg">
              ▶
            </span>
          </span>
        )}
        {!hasStarted && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/65 px-2 py-0.5 text-xs font-semibold text-white">
            {formatVoiceTime(duration)}
          </span>
        )}
        {label && !hasStarted && (
          <span className="absolute bottom-2 left-2 max-w-[70%] truncate rounded-full bg-black/55 px-2 py-0.5 text-xs font-semibold text-white">
            {label}
          </span>
        )}
      </button>

      {hasStarted && (
        <div className="flex items-center gap-2 bg-black/85 px-3 py-2 text-white">
          <button
            type="button"
            onClick={togglePlayback}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-sm font-bold transition hover:bg-white/25"
            aria-label={playing ? 'Pause video' : 'Play video'}
          >
            {playing ? 'Ⅱ' : '▶'}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(progress * 100)}
            onChange={handleSeek}
            className="h-1 flex-1 accent-white"
            aria-label="Video progress"
          />
          <span className="w-20 text-right text-[11px] font-semibold text-white/80">
            {formatVoiceTime(currentTime)} / {formatVoiceTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}

function VoiceWaveformMessage({ src, duration, isMine, seed }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(Number(duration || 0));
  const bars = buildWaveformBars(seed);
  const displayDuration = formatVoiceTime(audioDuration || duration);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    const nextDuration = audioRef.current?.duration;
    if (Number.isFinite(nextDuration)) {
      setAudioDuration(nextDuration);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio?.duration) return;
    setProgress(Math.min(1, audio.currentTime / audio.duration));
  };

  const handleEnded = () => {
    setPlaying(false);
    setProgress(0);
  };

  return (
    <div className="flex min-w-[260px] max-w-[340px] items-center gap-3 pr-10">
      <button
        type="button"
        onClick={togglePlayback}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
          isMine
            ? 'bg-white text-green-700 hover:bg-green-50'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
        aria-label={playing ? 'Pause voice note' : 'Play voice note'}
      >
        {playing ? 'Ⅱ' : '▶'}
      </button>

      <div className="flex min-w-0 flex-1 justify-center px-1">
        <div className="flex h-10 w-full max-w-[190px] items-center justify-center gap-0.5">
          {bars.map((height, index) => {
            const filled = index / Math.max(1, bars.length - 1) <= progress;
            return (
              <span
                key={`${height}-${index}`}
                className={`w-1 rounded-full transition-colors ${
                  filled
                    ? isMine ? 'bg-white' : 'bg-green-600'
                    : isMine ? 'bg-white/35' : 'bg-gray-300'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      <div className={`w-11 shrink-0 text-right text-[11px] font-semibold ${isMine ? 'text-white/80' : 'text-gray-500'}`}>
        {displayDuration}
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="hidden"
      />
    </div>
  );
}

export default function MessageBubble({
  message,
  currentUserId,
  onDelete,
  onReact,
  onReply,
  onForward,
  onJumpToMessage,
  highlighted = false,
  allowDeleteForMe,
  allowDeleteForEveryone,
  showDisabledDeleteForEveryone = true,
  senderLabel
}) {
  const longPressTimerRef = useRef(null);
  const closeMenuTimerRef = useRef(null);
  const bubbleRef = useRef(null);
  const actionButtonRef = useRef(null);
  const actionMenuRef = useRef(null);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  const [reactionDetailsOpen, setReactionDetailsOpen] = useState(false);
  const [mediaPreviewOpen, setMediaPreviewOpen] = useState(false);
  const senderId = String(message.senderId?._id || message.senderId);
  const isMine = senderId === String(currentUserId);
  const isTransientMessage = TRANSIENT_MESSAGE_STATUSES.includes(message.status);
  const canReact = !isTransientMessage && INTERACTIVE_MESSAGE_TYPES.includes(message.messageType);
  const canReply = !isTransientMessage && INTERACTIVE_MESSAGE_TYPES.includes(message.messageType);
  const canForward = !isTransientMessage && ['text', 'voice', 'image', 'video', 'file', 'document'].includes(message.messageType);
  const canDeleteForMe = (allowDeleteForMe ?? true) && !isTransientMessage;
  const canDeleteForEveryone = (allowDeleteForEveryone ?? isMine) && !isTransientMessage;
  const isMediaMessage = ['image', 'video', 'file', 'document'].includes(message.messageType) && Boolean(message.mediaUrl);
  const reactions = message.reactions || [];
  const myReaction = reactions.find((reaction) => getUserId(reaction.userId) === String(currentUserId));
  const reactionSummary = reactionTypes
    .map((reactionType) => ({
      type: reactionType,
      emoji: reactionEmojiMap[reactionType],
      count: reactions.filter((reaction) => (
        reaction.type === reactionType || reaction.emoji === reactionEmojiMap[reactionType]
      )).length
    }))
    .filter((reaction) => reaction.count > 0);
  const mediaSrc = message.mediaUrl?.startsWith('http') || message.mediaUrl?.startsWith('blob:')
    ? message.mediaUrl
    : `http://localhost:5000${message.mediaUrl}`;
  const fileLabel = message.fileName || message.message || 'Attachment';
  const mediaCaption = isMediaMessage && message.message && !(['file', 'document'].includes(message.messageType) && message.message === fileLabel)
    ? message.message
    : '';
  const deliveryStatus = message.status || 'sent';
  const mediaPanelClass = isMine
    ? 'bg-green-600 text-white shadow-green-900/20 ring-green-900/10'
    : 'bg-white/95 text-gray-900 shadow-sm ring-black/5';
  const mediaCaptionClass = isMine ? 'text-white' : 'text-gray-800';
  const mediaMetaClass = isMine ? 'text-white/80' : 'text-gray-500';
  const groupSeenCount = (message.seenBy || []).length;
  const groupDeliveredCount = (message.deliveredTo || []).length;
  const lifecycleLabel = isMine && message.messageType !== 'call'
    ? groupSeenCount
      ? `Seen by ${groupSeenCount} ${groupSeenCount === 1 ? 'member' : 'members'}`
      : groupDeliveredCount
        ? `Delivered to ${groupDeliveredCount} ${groupDeliveredCount === 1 ? 'member' : 'members'}`
        : deliveryStatus === 'seen'
          ? 'Seen'
          : deliveryStatus === 'delivered'
            ? 'Delivered'
            : ''
    : '';
  const updateActionMenuPosition = useCallback(() => {
    const button = actionButtonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const preferredLeft = isMine ? rect.right - ACTION_MENU_WIDTH : rect.left;
    const left = Math.min(
      Math.max(ACTION_MENU_MARGIN, preferredLeft),
      viewportWidth - ACTION_MENU_WIDTH - ACTION_MENU_MARGIN
    );
    const opensUp = rect.bottom + 220 > viewportHeight;
    const top = opensUp
      ? Math.max(ACTION_MENU_MARGIN, rect.top - ACTION_MENU_MARGIN)
      : rect.bottom + ACTION_MENU_MARGIN;

    setActionMenuPosition({ top, left });
  }, [isMine]);
  const formatDuration = (value) => {
    if (typeof value === 'string' && value.includes(':')) return value;
    const totalSeconds = Number(value || 0);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const clearCloseMenuTimer = () => {
    if (closeMenuTimerRef.current) {
      window.clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
  };
  const openInteractiveControls = () => {
    clearCloseMenuTimer();
    if (canReact) {
      setReactionPickerOpen(true);
    }
  };
  const scheduleCloseInteractiveControls = () => {
    clearCloseMenuTimer();
    closeMenuTimerRef.current = window.setTimeout(() => {
      setReactionPickerOpen(false);
      setActionMenuOpen(false);
      setReactionDetailsOpen(false);
    }, 250);
  };
  const handlePointerDown = () => {
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      setReactionPickerOpen(canReact);
      updateActionMenuPosition();
      setActionMenuOpen(canReply || canForward || canDeleteForMe || canDeleteForEveryone);
    }, 450);
  };
  const handlePointerEnd = () => {
    clearLongPressTimer();
  };
  const handleReaction = (reactionType) => {
    onReact?.(message, reactionType);
    setReactionPickerOpen(false);
  };
  const handleDelete = (deleteType) => {
    setActionMenuOpen(false);
    setReactionDetailsOpen(false);
    setReactionPickerOpen(false);
    onDelete?.(message, deleteType);
  };
  const handleReply = () => {
    setActionMenuOpen(false);
    setReactionPickerOpen(false);
    setReactionDetailsOpen(false);
    onReply?.(message);
  };
  const handleForward = () => {
    setActionMenuOpen(false);
    setReactionPickerOpen(false);
    setReactionDetailsOpen(false);
    onForward?.(message);
  };

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearCloseMenuTimer();
    };
  }, []);

  useEffect(() => {
    if (!actionMenuOpen && !reactionDetailsOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (!bubbleRef.current?.contains(target) && !actionMenuRef.current?.contains(target)) {
        setActionMenuOpen(false);
        setReactionDetailsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [actionMenuOpen, reactionDetailsOpen]);

  useEffect(() => {
    if (!actionMenuOpen) return undefined;

    updateActionMenuPosition();
    const handleViewportChange = () => updateActionMenuPosition();

    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, [actionMenuOpen, updateActionMenuPosition]);

  const actionMenu = actionMenuOpen ? createPortal(
    <div
      ref={actionMenuRef}
      className="fixed z-[9999] w-48 rounded-xl bg-white py-1 text-sm text-gray-900 shadow-2xl ring-1 ring-black/5"
      style={{
        top: `${actionMenuPosition.top}px`,
        left: `${actionMenuPosition.left}px`
      }}
      onMouseEnter={clearCloseMenuTimer}
      onMouseLeave={scheduleCloseInteractiveControls}
    >
      {canReply && (
        <button
          type="button"
          onClick={handleReply}
          className="block w-full px-3 py-2 text-left hover:bg-gray-100"
        >
          Reply
        </button>
      )}
      {canForward && (
        <button
          type="button"
          onClick={handleForward}
          className="block w-full px-3 py-2 text-left hover:bg-gray-100"
        >
          Forward Message
        </button>
      )}
      {canDeleteForMe && (
        <button
          type="button"
          onClick={() => handleDelete('forMe')}
          className="block w-full px-3 py-2 text-left hover:bg-gray-100"
        >
          Delete for me
        </button>
      )}
      {canDeleteForEveryone && (
        <button
          type="button"
          onClick={() => handleDelete('forEveryone')}
          className="block w-full px-3 py-2 text-left text-red-600 hover:bg-red-50"
        >
          Delete for everyone
        </button>
      )}
      {!canDeleteForEveryone && showDisabledDeleteForEveryone && (
        <button
          type="button"
          disabled
          className="block w-full px-3 py-2 text-left text-gray-400"
        >
          Delete for everyone
        </button>
      )}
      <button
        type="button"
        onClick={() => setActionMenuOpen(false)}
        className="block w-full px-3 py-2 text-left hover:bg-gray-100"
      >
        Cancel
      </button>
      {!canDeleteForMe && !canDeleteForEveryone && (
        <button
          type="button"
          onClick={() => setActionMenuOpen(false)}
          className="block w-full px-3 py-2 text-left hover:bg-gray-100"
        >
          Close
        </button>
      )}
    </div>,
    document.body
  ) : null;
  const mediaPreview = mediaPreviewOpen && message.messageType === 'image' ? createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4" onClick={() => setMediaPreviewOpen(false)}>
      <div className="max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <img src={mediaSrc} alt={fileLabel} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        <button
          type="button"
          onClick={() => setMediaPreviewOpen(false)}
          className="mt-3 rounded-xl bg-white px-4 py-2 font-semibold text-gray-900"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`motion-message-in relative flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        ref={bubbleRef}
        className={`group relative z-20 max-w-[75%] rounded-2xl transition ${
          highlighted ? 'ring-4 ring-brand-primary/40' : ''
        } hover:z-[80] focus-within:z-[80]`}
        onMouseEnter={openInteractiveControls}
        onMouseLeave={scheduleCloseInteractiveControls}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
      >
        <div className={`relative ${
          isMediaMessage
            ? 'w-fit max-w-full rounded-2xl text-gray-900'
            : `rounded-2xl px-4 pb-6 pt-2 shadow-sm ring-1 ring-black/5 transition-shadow ${
              message.messageType === 'call'
                ? 'border border-blue-200 bg-blue-50 text-blue-900 shadow-blue-100/70'
                : isMine ? 'bg-green-600 text-white shadow-green-900/20' : 'bg-gray-100 text-gray-900 shadow-gray-300/70'
            }`
        }`}>
          {senderLabel && (
            <div className="mb-1 pr-10 text-xs font-semibold opacity-80">
              {senderLabel}
            </div>
          )}

          {message.forwardedFrom?.messageId && (
            <div className={`mb-1 pr-10 text-xs font-semibold italic opacity-75 ${
              isMine ? 'text-white/90' : 'text-gray-600'
            }`}>
              Forwarded
            </div>
          )}

          {message.messageType === 'call' ? (
            <div className="flex items-center gap-3 pr-10">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">☎</span>
              <div>
                <p className="font-semibold">{message.message || 'Audio call'}</p>
                <p className="text-sm text-blue-700">{formatDuration(message.duration)}</p>
              </div>
            </div>
          ) : message.messageType === 'voice' && message.mediaUrl ? (
            <VoiceWaveformMessage
              src={mediaSrc}
              duration={message.duration}
              isMine={isMine}
              seed={message._id || message.mediaUrl || message.createdAt}
            />
          ) : message.messageType === 'image' && message.mediaUrl ? (
            <button type="button" onClick={() => setMediaPreviewOpen(true)} className="block overflow-hidden rounded-2xl text-left shadow-sm ring-1 ring-black/5">
              <img src={mediaSrc} alt={fileLabel} className="block max-h-72 max-w-[min(20rem,75vw)] rounded-2xl object-cover" />
            </button>
          ) : message.messageType === 'video' && message.mediaUrl ? (
            <CustomVideoMessage src={mediaSrc} label={fileLabel} />
          ) : ['file', 'document'].includes(message.messageType) && message.mediaUrl ? (
            <a href={mediaSrc} target="_blank" rel="noreferrer" className="flex w-72 max-w-[75vw] items-center gap-3 rounded-2xl bg-white p-3 text-gray-900 no-underline shadow-sm ring-1 ring-black/5">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-200 text-xl text-gray-700">📄</span>
              <span>
                <span className="block font-semibold">{fileLabel}</span>
                <span className="block text-xs opacity-75">{message.mimeType || 'File'} {formatFileSize(message.size)}</span>
              </span>
            </a>
          ) : message.mediaUrl ? (
            <a href={mediaSrc} target="_blank" rel="noreferrer" className="pr-10 underline">
              {message.message || 'Open attachment'}
            </a>
          ) : (
            <p className="whitespace-pre-wrap break-words pr-10">{message.message}</p>
          )}

          {message.repliedToMessageId && (
            <button
              type="button"
              onClick={() => onJumpToMessage?.(message.repliedToMessageId)}
              className={`mb-2 mt-1 block w-full rounded-xl border-l-4 px-3 py-2 text-left text-sm shadow-sm ${
                isMine
                  ? 'border-white/70 bg-white/15 text-white'
                  : 'border-brand-primary bg-white text-gray-800'
              }`}
            >
              <p className={`text-xs font-bold ${isMine ? 'text-white/90' : 'text-brand-primary'}`}>
                {message.repliedToSender || 'Member'}
              </p>
              <p className="mt-0.5 line-clamp-2 opacity-90">{message.repliedToPreview}</p>
            </button>
          )}

          {isMediaMessage && (
            <div className={`mt-1 w-full rounded-xl px-3 py-1.5 shadow-sm ring-1 ${mediaPanelClass}`}>
              {mediaCaption && (
                <p className={`mb-1 line-clamp-2 text-sm ${mediaCaptionClass}`}>{mediaCaption}</p>
              )}
              <div className={`flex items-center justify-end gap-1 text-[11px] font-medium ${mediaMetaClass}`}>
                <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {message.status === 'sending' && <span>· Sending...</span>}
                {message.status === 'failed' && <span>· Failed</span>}
                {isMine && !isTransientMessage && (
                  <MessageStatusTicks status={deliveryStatus} />
                )}
              </div>
            </div>
          )}

          {!isMediaMessage && (
          <p className={`absolute bottom-1.5 right-3 text-[11px] leading-none opacity-70 ${
            message.messageType === 'call' ? 'text-blue-600' : isMine ? 'text-white/80' : 'text-gray-500'
          }`}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.status === 'sending' && ' · Sending...'}
            {message.status === 'failed' && ' · Failed'}
            {isMine && !isTransientMessage && message.messageType !== 'call' && (
              <MessageStatusTicks status={deliveryStatus} />
            )}
          </p>
          )}

          {(canReply || canForward || canDeleteForMe || canDeleteForEveryone) && (
            <div className={`absolute top-1 ${isMine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'}`}>
              <button
                ref={actionButtonRef}
                type="button"
                onClick={() => {
                  clearCloseMenuTimer();
                  setActionMenuOpen((open) => {
                    const nextOpen = !open;
                    if (nextOpen) {
                      updateActionMenuPosition();
                      window.requestAnimationFrame(updateActionMenuPosition);
                    }
                    return nextOpen;
                  });
                }}
                className="rounded-full bg-white px-2 py-1 text-sm font-bold text-gray-500 opacity-0 shadow transition hover:text-gray-900 group-hover:opacity-100 focus:opacity-100"
                aria-label="Message options"
              >
                ⋯
              </button>
            </div>
          )}

          {actionMenu}
          {mediaPreview}

          {canReact && (
            <div className={`absolute bottom-full ${overlayLayers.popover} mb-2 flex gap-1 rounded-full bg-white p-1 shadow-lg transition-all duration-200 ease-out ${
              isMine ? 'right-0' : 'left-0'
            } ${reactionPickerOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
            onMouseEnter={clearCloseMenuTimer}
            onMouseLeave={scheduleCloseInteractiveControls}
            >
              {reactionTypes.map((reactionType) => {
                const isActive = myReaction?.type === reactionType;

                return (
                  <button
                    key={reactionType}
                    type="button"
                    onClick={() => handleReaction(reactionType)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-lg transition duration-150 ease-out hover:scale-110 hover:bg-gray-100 active:scale-95 ${
                      isActive ? 'motion-pop bg-green-100 ring-1 ring-green-500' : ''
                    }`}
                    aria-label={`React with ${reactionEmojiMap[reactionType]}`}
                  >
                    {reactionEmojiMap[reactionType]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {reactionSummary.length > 0 && (
          <div className={`relative mt-1 flex gap-1 text-xs ${isMine ? 'justify-end' : 'justify-start'}`}>
            <button
              type="button"
              onClick={() => {
                clearCloseMenuTimer();
                setReactionDetailsOpen((open) => !open);
              }}
              className="rounded-full bg-white px-2 py-0.5 text-gray-700 shadow-sm transition hover:bg-gray-50"
              aria-label="View reaction details"
            >
              {reactionSummary.map((reaction) => (
                <span key={reaction.type} className="mr-1 last:mr-0">
                  {reaction.emoji}{reaction.count > 1 ? reaction.count : ''}
                </span>
              ))}
            </button>

            {reactionDetailsOpen && (
              <div
                className={`absolute top-full ${overlayLayers.dropdown} mt-2 min-w-44 rounded-xl border border-gray-100 bg-white p-2 text-sm text-gray-900 shadow-xl ${
                  isMine ? 'right-0' : 'left-0'
                }`}
                onMouseEnter={clearCloseMenuTimer}
                onMouseLeave={scheduleCloseInteractiveControls}
              >
                {reactions.map((reaction, index) => (
                  <div key={`${getUserId(reaction.userId)}-${reaction.type}-${index}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
                    <span className="text-base">{getReactionEmoji(reaction)}</span>
                    <span className="font-medium">{getReactionUserName(reaction, currentUserId)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {lifecycleLabel && !reactionDetailsOpen && (
          <div className={`pointer-events-none absolute top-full ${overlayLayers.popover} mt-1 ${
            isMine ? 'right-0' : 'left-0'
          }`}>
            <span className="inline-flex whitespace-nowrap rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-gray-500 opacity-100 shadow-md ring-1 ring-gray-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {lifecycleLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
