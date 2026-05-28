export default function ReplyPreview({ replyTo, onCancel }) {
  if (!replyTo) return null;

  const mediaSrc = replyTo.mediaUrl?.startsWith('http') || replyTo.mediaUrl?.startsWith('blob:')
    ? replyTo.mediaUrl
    : replyTo.mediaUrl ? `http://localhost:5000${replyTo.mediaUrl}` : '';
  const isImage = replyTo.messageType === 'image' && mediaSrc;
  const isVideo = replyTo.messageType === 'video';
  const isFile = ['file', 'document'].includes(replyTo.messageType);

  return (
    <div className="mb-3 rounded-xl border-l-4 border-brand-primary bg-gray-50 px-4 py-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-primary">
            Replying to {replyTo.senderName}
          </p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            {isImage && (
              <img src={mediaSrc} alt="" className="h-10 w-10 rounded-lg object-cover" />
            )}
            {isVideo && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-lg">🎬</span>
            )}
            {isFile && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-200 text-lg">📄</span>
            )}
            <p className="truncate text-sm text-gray-700">{replyTo.preview}</p>
          </div>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-2 py-1 text-sm font-bold text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
          aria-label="Cancel reply"
        >
          ×
        </button>
      </div>
    </div>
  );
}
