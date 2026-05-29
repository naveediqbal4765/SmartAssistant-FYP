const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const AUDIO_MIME_TYPES = new Set(['audio/webm', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg']);
const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const getUploadFolder = (uploadType, file = {}) => {
  if (uploadType === 'audio') return 'smart-assistant/chat/audio';
  if (uploadType === 'profile') return 'smart-assistant/profiles';
  if (uploadType === 'document') return 'smart-assistant/chat/documents';

  if (IMAGE_MIME_TYPES.has(file.mimetype)) return 'smart-assistant/chat/images';
  if (VIDEO_MIME_TYPES.has(file.mimetype)) return 'smart-assistant/chat/videos';
  if (AUDIO_MIME_TYPES.has(file.mimetype)) return 'smart-assistant/chat/audio';
  if (DOCUMENT_MIME_TYPES.has(file.mimetype)) return 'smart-assistant/chat/documents';

  return 'smart-assistant/general';
};

const getPublicId = (req, file = {}, uploadType) => {
  const extension = path.extname(file.originalname || '');
  const baseName = path.basename(file.originalname || uploadType || 'upload', extension)
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  const userId = req.user?._id || req.user?.id || 'anonymous';

  return `${uploadType || 'upload'}-${userId}-${Date.now()}-${baseName || 'file'}`;
};

const createCloudinaryStorage = (uploadType = 'general') => new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: getUploadFolder(uploadType, file),
    public_id: getPublicId(req, file, uploadType),
    resource_type: 'auto'
  })
});

const getCloudinaryResourceType = (file = {}) => {
  if (VIDEO_MIME_TYPES.has(file.mimetype)) return 'video';
  if (AUDIO_MIME_TYPES.has(file.mimetype)) return 'video';
  if (IMAGE_MIME_TYPES.has(file.mimetype)) return 'image';
  return 'raw';
};

const deleteCloudinaryFile = async (file = {}) => {
  const publicId = file.filename || file.public_id;
  if (!publicId) return;

  try {
    if (file.mimetype) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: getCloudinaryResourceType(file)
      });
      return;
    }

    await Promise.all(['image', 'video', 'raw'].map((resourceType) => (
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
    )));
  } catch (err) {
    console.error('Cloudinary delete failed:', err);
  }
};

module.exports = {
  cloudinary,
  createCloudinaryStorage,
  deleteCloudinaryFile,
  getCloudinaryResourceType,
  getUploadFolder
};
