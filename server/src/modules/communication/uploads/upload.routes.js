const express = require('express');
const multer = require('multer');
const auth = require('../../../middleware/auth');
const { createCloudinaryStorage, deleteCloudinaryFile } = require('../../../shared/cloudinary');
const { uploadAudio, uploadMedia } = require('./upload.controller');
const { getMediaMessageType, isAllowedAudioFile, isAllowedMediaFile } = require('./upload.service');

const router = express.Router();

const audioUpload = multer({
  storage: createCloudinaryStorage('audio'),
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedAudioFile(file)) {
      return cb(new Error('Only webm, mp3, and wav audio files are allowed'));
    }
    return cb(null, true);
  }
});

const mediaUpload = multer({
  storage: createCloudinaryStorage('media'),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedMediaFile(file)) {
      return cb(new Error('Only supported image, video, PDF, Word, and text files are allowed'));
    }

    const messageType = getMediaMessageType(file);
    const maxBytesByType = {
      image: 8 * 1024 * 1024,
      video: 50 * 1024 * 1024,
      file: 15 * 1024 * 1024
    };

    req.maxUploadBytes = maxBytesByType[messageType] || 15 * 1024 * 1024;
    return cb(null, true);
  }
});

router.post('/audio', auth, audioUpload.single('audio'), uploadAudio);
router.post('/media', auth, mediaUpload.single('file'), async (req, res, next) => {
  if (req.file && req.maxUploadBytes && req.file.size > req.maxUploadBytes) {
    await deleteCloudinaryFile(req.file);
    return res.status(400).json({ success: false, msg: 'File is too large for this media type' });
  }
  return uploadMedia(req, res, next);
});

router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ success: false, msg: err.message || 'Upload failed' });
  }
  return next();
});

module.exports = router;
