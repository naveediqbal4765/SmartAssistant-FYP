import { useEffect, useRef, useState } from 'react';
import { overlayLayers } from '../../../../components/ui/overlayLayers';
import { reactionEmojiMap, reactionTypes } from '../utils/reactionEmojiMap';

const getUserId = (value) => String(value?._id || value || '');

const getReactionUserName = (reaction, currentUserId) => {
  if (getUserId(reaction.userId) === String(currentUserId)) return 'You';
  return reaction.userId?.name || 'Member';
};

export default function MessageBubble({
  message,
  currentUserId,
  onDelete,
  onReact,
  onReply,
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
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [reactionDetailsOpen, setReactionDetailsOpen] = useState(false);
  const senderId = String(message.senderId?._id || message.senderId);
  const isMine = senderId === String(currentUserId);
  const canReact = !message.status && (message.messageType === 'text' || message.messageType === 'voice');
  const canReply = !message.status && (message.messageType === 'text' || message.messageType === 'voice');
  const canDeleteForMe = (allowDeleteForMe ?? true) && !message.status;
  const canDeleteForEveryone = (allowDeleteForEveryone ?? isMine) && !message.status;
  const reactions = message.reactions || [];
  const myReaction = reactions.find((reaction) => getUserId(reaction.userId) === String(currentUserId));
  const reactionSummary = reactionTypes
    .map((reactionType) => ({
      type: reactionType,
      count: reactions.filter((reaction) => reaction.type === reactionType).length
    }))
    .filter((reaction) => reaction.count > 0);
  const mediaSrc = message.mediaUrl?.startsWith('http') || message.mediaUrl?.startsWith('blob:')
    ? message.mediaUrl
    : `http://localhost:5000${message.mediaUrl}`;
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
      setActionMenuOpen(canReply || canDeleteForMe || canDeleteForEveryone);
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

  useEffect(() => {
    return () => {
      clearLongPressTimer();
      clearCloseMenuTimer();
    };
  }, []);

  useEffect(() => {
    if (!actionMenuOpen && !reactionDetailsOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!bubbleRef.current?.contains(event.target)) {
        setActionMenuOpen(false);
        setReactionDetailsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [actionMenuOpen, reactionDetailsOpen]);

  return (
    <div className={`motion-message-in relative flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        ref={bubbleRef}
        className={`group relative z-20 max-w-[75%] rounded-2xl transition ${
          highlighted ? 'ring-4 ring-brand-primary/40' : ''
        } hover:z-50`}
        onMouseEnter={openInteractiveControls}
        onMouseLeave={scheduleCloseInteractiveControls}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onPointerLeave={handlePointerEnd}
      >
        <div className={`relative rounded-2xl px-4 pb-6 pt-2 ${
          message.messageType === 'call'
            ? 'bg-blue-50 text-blue-900 border border-blue-200'
            : isMine ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}>
          {senderLabel && (
            <div className="mb-1 pr-10 text-xs font-semibold opacity-80">
              {senderLabel}
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
            <div className="pr-10">
              <p className="mb-2 font-semibold">Voice note{message.duration ? ` · ${message.duration}s` : ''}</p>
              <audio controls src={mediaSrc} className="max-w-full" />
            </div>
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

          <p className={`absolute bottom-1.5 right-3 text-[11px] leading-none opacity-70 ${
            message.messageType === 'call' ? 'text-blue-600' : isMine ? 'text-green-50' : 'text-gray-500'
          }`}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.status === 'sending' && ' · Sending...'}
            {message.status === 'failed' && ' · Failed'}
          </p>

          {(canReact || canReply || canDeleteForMe || canDeleteForEveryone) && (
            <div className={`absolute top-1 ${isMine ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1'}`}>
              <button
                type="button"
                onClick={() => {
                  clearCloseMenuTimer();
                  setActionMenuOpen((open) => !open);
                }}
                className="rounded-full bg-white px-2 py-1 text-sm font-bold text-gray-500 opacity-0 shadow transition hover:text-gray-900 group-hover:opacity-100 focus:opacity-100"
                aria-label="Message options"
              >
                ⋯
              </button>
            </div>
          )}

          {actionMenuOpen && (
            <div className={`absolute top-8 ${overlayLayers.dropdown} w-48 rounded-xl bg-white py-1 text-sm text-gray-900 shadow-lg ${
              isMine ? 'right-0' : 'left-0'
            }`}
            onMouseEnter={clearCloseMenuTimer}
            onMouseLeave={scheduleCloseInteractiveControls}
            >
              {canReact && (
                <button
                  type="button"
                  onClick={() => setReactionPickerOpen((open) => !open)}
                  className="block w-full px-3 py-2 text-left hover:bg-gray-100"
                >
                  React
                </button>
              )}
              {canReply && (
                <button
                  type="button"
                  onClick={handleReply}
                  className="block w-full px-3 py-2 text-left hover:bg-gray-100"
                >
                  Reply
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
            </div>
          )}

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
                  {reactionEmojiMap[reaction.type]}{reaction.count > 1 ? reaction.count : ''}
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
                    <span className="text-base">{reactionEmojiMap[reaction.type]}</span>
                    <span className="font-medium">{getReactionUserName(reaction, currentUserId)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
