const path = require('path');

const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav'
]);

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const isAllowedAudioFile = (file) => {
  if (!file) return false;

  const extension = path.extname(file.originalname || '').toLowerCase();
  return AUDIO_MIME_TYPES.has(file.mimetype) || ['.webm', '.mp3', '.wav'].includes(extension);
};

const getMediaMessageType = (file) => {
  if (!file) return '';

  const extension = path.extname(file.originalname || '').toLowerCase();
  if (IMAGE_MIME_TYPES.has(file.mimetype) || ['.jpg', '.jpeg', '.png', '.webp'].includes(extension)) {
    return 'image';
  }
  if (VIDEO_MIME_TYPES.has(file.mimetype) || ['.mp4', '.webm', '.mov'].includes(extension)) {
    return 'video';
  }
  if (FILE_MIME_TYPES.has(file.mimetype) || ['.pdf', '.doc', '.docx', '.txt'].includes(extension)) {
    return 'file';
  }
  return '';
};

const isAllowedMediaFile = (file) => Boolean(getMediaMessageType(file));

const buildAudioUploadResponse = (file) => ({
  mediaUrl: `/uploads/audio/${file.filename}`,
  filename: file.filename,
  mimetype: file.mimetype,
  size: file.size
});

const buildMediaUploadResponse = (file) => ({
  mediaUrl: `/uploads/media/${file.filename}`,
  filename: file.filename,
  fileName: file.originalname || file.filename,
  mimetype: file.mimetype,
  mimeType: file.mimetype,
  size: file.size,
  messageType: getMediaMessageType(file)
});

module.exports = {
  isAllowedAudioFile,
  isAllowedMediaFile,
  getMediaMessageType,
  buildAudioUploadResponse,
  buildMediaUploadResponse
};
