const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const auth = require('../../../middleware/auth');
const { uploadAudio, uploadMedia } = require('./upload.controller');
const { getMediaMessageType, isAllowedAudioFile, isAllowedMediaFile } = require('./upload.service');

const router = express.Router();

const audioUploadDir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'audio');
const mediaUploadDir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'media');
fs.mkdirSync(audioUploadDir, { recursive: true });
fs.mkdirSync(mediaUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioUploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '.webm') || '.webm';
    cb(null, `voice-${req.user._id}-${Date.now()}${extension}`);
  }
});

const audioUpload = multer({
  storage,
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

const mediaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, mediaUploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '') || '';
    cb(null, `media-${req.user._id}-${Date.now()}${extension}`);
  }
});

const mediaUpload = multer({
  storage: mediaStorage,
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
router.post('/media', auth, mediaUpload.single('file'), (req, res, next) => {
  if (req.file && req.maxUploadBytes && req.file.size > req.maxUploadBytes) {
    fs.unlink(req.file.path, () => {});
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
