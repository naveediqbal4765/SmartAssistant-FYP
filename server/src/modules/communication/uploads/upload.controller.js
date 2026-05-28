const uploadService = require('./upload.service');

const uploadAudio = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, msg: 'Audio file is required' });
  }

  return res.status(201).json({
    success: true,
    audio: uploadService.buildAudioUploadResponse(req.file)
  });
};

const uploadMedia = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, msg: 'Media file is required' });
  }

  return res.status(201).json({
    success: true,
    media: uploadService.buildMediaUploadResponse(req.file)
  });
};

module.exports = {
  uploadAudio,
  uploadMedia
};
