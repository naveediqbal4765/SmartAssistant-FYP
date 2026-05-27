const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../../middleware/auth');
const {
  getProfile,
  getLinkedSeniorProfile,
  updateProfile,
  updateLocation,
  getPrivacy,
  updatePrivacy,
  getContacts,
  addContact,
  deleteContact,
  unlinkCaregiver,
  getActivities,
  getDocuments,
  uploadDocument,
  deleteDocument,
  deleteAccount
} = require('./profile.controller');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

router.get('/profile', auth, getProfile);
router.get('/profile/:userId', auth, getLinkedSeniorProfile);
router.put('/profile', auth, updateProfile);
router.put('/location', auth, updateLocation);

router.get('/privacy', auth, getPrivacy);
router.put('/privacy', auth, updatePrivacy);

router.get('/contacts', auth, getContacts);
router.post('/contacts', auth, addContact);
router.delete('/contacts/:id', auth, deleteContact);

router.delete('/caregiver/:caregiverId', auth, unlinkCaregiver);

router.get('/activities', auth, getActivities);

router.get('/documents', auth, getDocuments);
router.get('/documents/:targetUserId', auth, getDocuments);
router.post('/documents', auth, upload.single('document'), uploadDocument);
router.delete('/documents/:id', auth, deleteDocument);

router.delete('/account', auth, deleteAccount);

module.exports = router;
