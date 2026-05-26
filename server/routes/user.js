const express = require('express');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const Document = require('../models/Document');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Task = require('../models/Task');
const auth = require('../src/shared/jwt/authMiddleware');
const {
  resolveUploadFilePath,
  unlinkUserRelationships
} = require('../src/shared/links/userLinks');
const router = express.Router();

// Configure multer for file uploads
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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Helper function to log activities
const logActivity = async (userId, action, details = '', ipAddress = '') => {
  try {
    const log = new ActivityLog({ userId, action, details, ipAddress });
    await log.save();
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

// ========== PROFILE ROUTES ==========

// GET user profile
router.get('/profile', auth, async (req, res) => {
  try {
    // Log activity
    await logActivity(req.user._id, 'profile_view', 'Viewed profile');
    
    let linkedSenior = null;
    let linkedCaregivers = [];

    if (req.user.role === 'caregiver' && req.user.linkedSeniorId) {
      linkedSenior = await User.findById(req.user.linkedSeniorId).select('name email phone');
    }

    if (req.user.role === 'elder') {
      const caregiverIds = req.user.linkedCaregivers || [];
      if (caregiverIds.length) {
        linkedCaregivers = await User.find({
          _id: { $in: caregiverIds },
          role: 'caregiver'
        }).select('name email phone');
      }
    }

    res.json({ 
      success: true, 
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone || '',
        address: req.user.address || '',
        dateOfBirth: req.user.dateOfBirth || null,
        linkedSeniorId: req.user.linkedSeniorId || null,
        linkedSenior,
        linkedCaregivers,
        privacySettings: req.user.privacySettings || {
          showPhone: true,
          showAddress: false,
          showEmail: false,
          showDateOfBirth: false,
          showEmergencyContacts: false
        }
      }
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// UPDATE user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, address, dateOfBirth } = req.body;
    
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (address !== undefined) req.user.address = address;
    if (dateOfBirth) req.user.dateOfBirth = new Date(dateOfBirth);
    
    await req.user.save();
    
    // Log activity
    await logActivity(req.user._id, 'profile_update', 'Updated profile information');
    
    res.json({ 
      success: true, 
      msg: 'Profile updated successfully',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        phone: req.user.phone,
        address: req.user.address,
        dateOfBirth: req.user.dateOfBirth
      }
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ========== PRIVACY SETTINGS ROUTES ==========

// GET privacy settings
router.get('/privacy', auth, async (req, res) => {
  try {
    const settings = req.user.privacySettings || {
      showPhone: true,
      showAddress: false,
      showEmail: false,
      showDateOfBirth: false,
      showEmergencyContacts: false
    };
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// UPDATE privacy settings
router.put('/privacy', auth, async (req, res) => {
  try {
    const { showPhone, showAddress, showEmail, showDateOfBirth, showEmergencyContacts } = req.body;
    
    req.user.privacySettings = {
      showPhone: showPhone ?? true,
      showAddress: showAddress ?? false,
      showEmail: showEmail ?? false,
      showDateOfBirth: showDateOfBirth ?? false,
      showEmergencyContacts: showEmergencyContacts ?? false
    };
    await req.user.save();
    
    // Log activity
    await logActivity(req.user._id, 'privacy_update', 'Updated privacy settings');
    
    res.json({ success: true, msg: 'Privacy settings updated', settings: req.user.privacySettings });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ========== EMERGENCY CONTACTS ROUTES ==========

// GET emergency contacts
router.get('/contacts', auth, async (req, res) => {
  try {
    res.json({ success: true, contacts: req.user.emergencyContacts || [] });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// POST emergency contact
router.post('/contacts', auth, async (req, res) => {
  try {
    const { name, phone, relation } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, msg: 'Name and phone are required' });
    }
    
    const newContact = {
      name,
      phone,
      relation: relation || 'Other',
      priority: (req.user.emergencyContacts?.length || 0) + 1
    };
    
    req.user.emergencyContacts.push(newContact);
    await req.user.save();

    const savedContact =
      req.user.emergencyContacts[req.user.emergencyContacts.length - 1];
    
    await logActivity(req.user._id, 'contact_added', `Added ${name} as emergency contact`);
    
    res.json({ success: true, contact: savedContact });
  } catch (err) {
    console.error('Add contact error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// DELETE emergency contact
router.delete('/contacts/:id', auth, async (req, res) => {
  try {
    const contactId = req.params.id;
    req.user.emergencyContacts = req.user.emergencyContacts.filter(
      c => c._id.toString() !== contactId
    );
    await req.user.save();
    
    // Log activity
    await logActivity(req.user._id, 'contact_deleted', 'Removed an emergency contact');
    
    res.json({ success: true, msg: 'Contact deleted' });
  } catch (err) {
    console.error('Delete contact error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

router.delete('/caregiver/:caregiverId', auth, async (req, res) => {
  try {
    if (req.user.role !== 'elder') {
      return res.status(403).json({ success: false, msg: 'Only seniors can remove caregivers' });
    }

    const caregiverId = req.params.caregiverId;
    if (!/^[0-9a-fA-F]{24}$/.test(String(caregiverId || ''))) {
      return res.status(400).json({ success: false, msg: 'Invalid caregiver id' });
    }

    const linkedCaregiverIds = req.user.linkedCaregivers || [];
    const isLinked = linkedCaregiverIds.some(
      (id) => id.toString() === caregiverId
    );

    if (!isLinked) {
      return res.status(404).json({ success: false, msg: 'Caregiver is not linked to this senior' });
    }

    const caregiver = await User.findOne({ _id: caregiverId, role: 'caregiver' });
    if (!caregiver) {
      return res.status(404).json({ success: false, msg: 'Caregiver not found' });
    }

    req.user.linkedCaregivers = linkedCaregiverIds.filter(
      (id) => id.toString() !== caregiverId
    );

    if (caregiver.linkedSeniorId?.toString() === req.user._id.toString()) {
      caregiver.linkedSeniorId = null;
    }

    await caregiver.save();
    await req.user.save();

    await logActivity(req.user._id, 'caregiver_unlinked', `Removed caregiver ${caregiver.email}`);

    res.json({
      success: true,
      msg: 'Caregiver removed successfully',
      caregiverId
    });
  } catch (err) {
    console.error('Unlink caregiver error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ========== ACTIVITY LOGS ROUTES ==========

// GET activity logs
router.get('/activities', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const activities = await ActivityLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, activities });
  } catch (err) {
    console.error('Activity fetch error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ========== DOCUMENT VAULT ROUTES ==========

// GET all documents
router.get('/documents', auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json({ success: true, documents });
  } catch (err) {
    console.error('Document fetch error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// POST upload document
router.post('/documents', auth, upload.single('document'), async (req, res) => {
  try {
    const { title, type, notes } = req.body;
    
    if (!title || !req.file) {
      return res.status(400).json({ success: false, msg: 'Title and file are required' });
    }
    
    const newDocument = new Document({
      userId: req.user._id,
      title,
      type: type || 'other',
      notes: notes || '',
      fileName: req.file.filename,
      fileUrl: `/uploads/${req.file.filename}`
    });
    
    await newDocument.save();
    
    // Log activity
    await logActivity(req.user._id, 'document_uploaded', `Uploaded: ${title}`);
    
    res.json({ success: true, document: newDocument, msg: 'Document uploaded successfully' });
  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// DELETE document
router.delete('/documents/:id', auth, async (req, res) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    
    if (!document) {
      return res.status(404).json({ success: false, msg: 'Document not found' });
    }
    
    // Delete file from disk
    const filePath = resolveUploadFilePath(document.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await Document.deleteOne({ _id: req.params.id });
    
    // Log activity
    await logActivity(req.user._id, 'document_deleted', `Deleted: ${document.title}`);
    
    res.json({ success: true, msg: 'Document deleted' });
  } catch (err) {
    console.error('Document delete error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ========== ACCOUNT DELETION ==========

// DELETE user account (permanently)
router.delete('/account', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const userEmail = req.user.email;
    
    console.log(`🗑️ Account deletion requested for: ${userEmail}`);

    await unlinkUserRelationships(req.user);

    const documents = await Document.find({ userId });
    for (const doc of documents) {
      const filePath = resolveUploadFilePath(doc.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await Document.deleteMany({ userId });
    await ActivityLog.deleteMany({ userId });
    await Task.deleteMany({
      $or: [{ userId }, { volunteerId: userId }]
    });

    await User.findByIdAndDelete(userId);
    
    console.log(`✅ Account permanently deleted: ${userEmail}`);
    
    res.json({ 
      success: true, 
      msg: 'Your account has been permanently deleted. We are sad to see you go!' 
    });
  } catch (err) {
    console.error('Account deletion error:', err);
    res.status(500).json({ success: false, msg: 'Failed to delete account: ' + err.message });
  }
});

module.exports = router;