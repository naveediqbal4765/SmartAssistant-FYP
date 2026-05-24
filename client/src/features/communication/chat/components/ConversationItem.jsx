const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

export default function ConversationItem({ conversation, active, onSelect, onDelete }) {
  const participant = conversation.participant || {};
  const lastMessage = conversation.lastMessage || {};
  const preview = lastMessage.message || lastMessage.mediaUrl || 'No messages yet';

  return (
    <div
      className={`w-full text-left p-4 border-b transition-colors hover:bg-gray-50 ${active ? 'bg-green-50 ring-2 ring-inset ring-green-500' : ''}`}
    >
      <button
        type="button"
        onClick={() => onSelect?.(conversation)}
        className="w-full text-left"
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
      {!String(conversation.id || '').startsWith('new-') && !String(conversation.id || '').startsWith('search-') && (
        <button
          type="button"
          onClick={() => onDelete?.(conversation)}
          className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
        >
          Delete conversation
        </button>
      )}
    </div>
  );
}
