export const getMessageId = (message) => String(message?._id || message?.clientId || '');

export const getSenderName = (message, currentUserId, fallback = 'Member') => {
  const senderId = String(message?.senderId?._id || message?.senderId || '');
  if (senderId && senderId === String(currentUserId)) return 'You';
  return message?.senderName || message?.senderId?.name || fallback;
};

export const getReplyPreviewText = (message) => {
  if (!message) return '';
  if (message.messageType === 'voice') return '🎤 Voice Message';
  if (message.messageType === 'image') return `🖼️ ${message.fileName || message.message || 'Image'}`;
  if (message.messageType === 'video') return `🎬 ${message.fileName || message.message || 'Video'}`;
  if (['file', 'document'].includes(message.messageType)) return `📄 ${message.fileName || message.message || 'File'}`;
  return message.message || 'Attachment';
};

export const buildReplyTarget = (message, currentUserId, fallbackName) => {
  if (!message || ['sending', 'failed'].includes(message.status) || message.messageType === 'call') return null;

  const preview = getReplyPreviewText(message);
  return {
    messageId: getMessageId(message),
    senderName: getSenderName(message, currentUserId, fallbackName),
    preview: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
    messageType: message.messageType || 'text',
    mediaUrl: message.mediaUrl || '',
    fileName: message.fileName || ''
  };
};
