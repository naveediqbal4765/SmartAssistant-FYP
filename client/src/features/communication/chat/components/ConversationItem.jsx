import { useRef, useState } from 'react';

const SWIPE_THRESHOLD_PX = 48;

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

export default function ConversationItem({ conversation, active, onSelect, onDelete }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const swipedRef = useRef(false);
  const participant = conversation.participant || {};
  const lastMessage = conversation.lastMessage || {};
  const preview = lastMessage.message || lastMessage.mediaUrl || 'No messages yet';
  const canDelete = !String(conversation.id || '').startsWith('new-') && !String(conversation.id || '').startsWith('search-');

  const handlePointerUp = (event) => {
    if (swipeStartX === null || !canDelete) return;

    const deltaX = event.clientX - swipeStartX;
    if (deltaX <= -SWIPE_THRESHOLD_PX) {
      setDeleteOpen(true);
      swipedRef.current = true;
    } else if (deltaX >= SWIPE_THRESHOLD_PX / 2) {
      setDeleteOpen(false);
      swipedRef.current = false;
    }

    setSwipeStartX(null);
  };

  const handleSelect = () => {
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }

    if (deleteOpen) {
      setDeleteOpen(false);
      return;
    }

    onSelect?.(conversation);
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    onDelete?.(conversation);
    setDeleteOpen(false);
  };

  return (
    <div
      className="relative overflow-visible border-b border-gray-100 last:border-b-0"
    >
      {canDelete && (
        <div className="absolute inset-y-1 right-0 flex w-28 items-center justify-center overflow-hidden rounded-2xl bg-red-600 shadow-sm">
          <button
            type="button"
            onClick={handleDelete}
            className="h-full w-full text-sm font-semibold text-white"
          >
            Delete
          </button>
        </div>
      )}
      <button
        type="button"
        onPointerDown={(event) => setSwipeStartX(event.clientX)}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setSwipeStartX(null)}
        onClick={handleSelect}
        className={`motion-interactive relative w-full touch-pan-y rounded-2xl p-4 text-left transition-all duration-200 ease-in-out hover:bg-gray-50 hover:shadow-md ${
          deleteOpen ? '-translate-x-28' : 'translate-x-0'
        } ${active ? 'z-10 scale-[1.01] bg-gray-100 shadow-lg shadow-gray-200/70' : 'bg-white shadow-none'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">{participant.name || 'Unknown user'}</p>
            <p className="text-sm text-gray-500 capitalize">{participant.role || ''}</p>
            <p className="text-sm text-gray-700 mt-1 line-clamp-1">{preview}</p>
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatTime(conversation.lastMessageAt || conversation.updatedAt)}
          </span>
        </div>
      </button>
    </div>
  );
}
