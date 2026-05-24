const path = require('path');

const AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav'
]);

const isAllowedAudioFile = (file) => {
  if (!file) return false;

  const extension = path.extname(file.originalname || '').toLowerCase();
  return AUDIO_MIME_TYPES.has(file.mimetype) || ['.webm', '.mp3', '.wav'].includes(extension);
};

const buildAudioUploadResponse = (file) => ({
  mediaUrl: `/uploads/audio/${file.filename}`,
  filename: file.filename,
  mimetype: file.mimetype,
  size: file.size
});

module.exports = {
  isAllowedAudioFile,
  buildAudioUploadResponse
};
