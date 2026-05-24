export default function MessageBubble({ message, currentUserId }) {
  const senderId = String(message.senderId?._id || message.senderId);
  const isMine = senderId === String(currentUserId);
  const mediaSrc = message.mediaUrl?.startsWith('http') || message.mediaUrl?.startsWith('blob:')
    ? message.mediaUrl
    : `http://localhost:5000${message.mediaUrl}`;

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${isMine ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
        {message.messageType === 'voice' && message.mediaUrl ? (
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
        <p className={`text-xs mt-1 ${isMine ? 'text-green-100' : 'text-gray-500'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.status === 'sending' && ' · Sending...'}
          {message.status === 'failed' && ' · Failed to send'}
        </p>
      </div>
    </div>
  );
}
