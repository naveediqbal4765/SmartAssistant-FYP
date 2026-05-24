const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const auth = require('../../../middleware/auth');
const { uploadAudio } = require('./upload.controller');
const { isAllowedAudioFile } = require('./upload.service');

const router = express.Router();

const audioUploadDir = path.join(__dirname, '..', '..', '..', '..', 'uploads', 'audio');
fs.mkdirSync(audioUploadDir, { recursive: true });

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

router.post('/audio', auth, audioUpload.single('audio'), uploadAudio);

module.exports = router;
