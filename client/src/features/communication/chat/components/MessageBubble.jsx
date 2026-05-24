export default function MessageBubble({ message, currentUserId, onDelete }) {
  const senderId = String(message.senderId?._id || message.senderId);
  const isMine = senderId === String(currentUserId);
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

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
        message.messageType === 'call'
          ? 'bg-blue-50 text-blue-900 border border-blue-200'
          : isMine ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'
      }`}>
        {message.messageType === 'call' ? (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100">☎</span>
            <div>
              <p className="font-semibold">{message.message || 'Audio call'}</p>
              <p className="text-sm text-blue-700">{formatDuration(message.duration)}</p>
            </div>
          </div>
        ) : message.messageType === 'voice' && message.mediaUrl ? (
          <div>
            <p className="mb-2 font-semibold">Voice note{message.duration ? ` · ${message.duration}s` : ''}</p>
            <audio controls src={mediaSrc} className="max-w-full" />
          </div>
        ) : message.mediaUrl ? (
          <a href={mediaSrc} target="_blank" rel="noreferrer" className="underline">
            {message.message || 'Open attachment'}
          </a>
        ) : (
          <p>{message.message}</p>
        )}
        <p className={`text-xs mt-1 ${message.messageType === 'call' ? 'text-blue-500' : isMine ? 'text-green-100' : 'text-gray-500'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.status === 'sending' && ' · Sending...'}
          {message.status === 'failed' && ' · Failed to send'}
        </p>
        {isMine && !message.status && (
          <button
            type="button"
            onClick={() => onDelete?.(message)}
            className={`mt-1 text-xs font-semibold underline ${isMine ? 'text-green-100 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
