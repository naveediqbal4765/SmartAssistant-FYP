const fs = require('fs');
const User = require('../../shared/models/User');
const ActivityLog = require('../../shared/models/ActivityLog');
const Document = require('../../shared/models/Document');
const Task = require('../../shared/models/Task');
const {
  resolveUploadFilePath,
  unlinkUserRelationships
} = require('../../shared/utils/userLinks');

const defaultPrivacySettings = {
  showPhone: true,
  showAddress: false,
  showEmail: false,
  showDateOfBirth: false,
  showEmergencyContacts: false
};

const logActivity = async (userId, action, details = '', ipAddress = '') => {
  try {
    const log = new ActivityLog({ userId, action, details, ipAddress });
    await log.save();
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

const getProfile = async (user) => {
  await logActivity(user._id, 'profile_view', 'Viewed profile');

  let linkedSenior = null;
  let linkedCaregivers = [];

  if (user.role === 'caregiver' && user.linkedSeniorId) {
    linkedSenior = await User.findById(user.linkedSeniorId).select('name email phone');
  }

  if (user.role === 'elder') {
    const caregiverIds = user.linkedCaregivers || [];
    if (caregiverIds.length) {
      linkedCaregivers = await User.find({
        _id: { $in: caregiverIds },
        role: 'caregiver'
      }).select('name email phone');
    }
  }

  const caregiverLinkActive =
    user.role === 'elder' &&
    user.caregiverLinkCode?.code &&
    user.caregiverLinkCode?.expiresAt &&
    new Date(user.caregiverLinkCode.expiresAt) > new Date();

  return {
    status: 200,
    body: {
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: user.dateOfBirth || null,
        linkedSeniorId: user.linkedSeniorId || null,
        linkedSenior,
        linkedCaregivers,
        caregiverLinkCode: caregiverLinkActive
          ? {
              expiresAt: user.caregiverLinkCode.expiresAt,
              hint: 'Check your email for the 6-digit code (refreshed each login).'
            }
          : null,
        privacySettings: user.privacySettings || defaultPrivacySettings
      }
    }
  };
};

const updateProfile = async (user, payload) => {
  const { name, phone, address, dateOfBirth } = payload;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (address !== undefined) user.address = address;
  if (dateOfBirth) user.dateOfBirth = new Date(dateOfBirth);

  await user.save();
  await logActivity(user._id, 'profile_update', 'Updated profile information');

  return {
    status: 200,
    body: {
      success: true,
      msg: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        dateOfBirth: user.dateOfBirth
      }
    }
  };
};

const getPrivacy = async (user) => ({
  status: 200,
  body: { success: true, settings: user.privacySettings || defaultPrivacySettings }
});

const updatePrivacy = async (user, payload) => {
  const { showPhone, showAddress, showEmail, showDateOfBirth, showEmergencyContacts } = payload;

  user.privacySettings = {
    showPhone: showPhone ?? true,
    showAddress: showAddress ?? false,
    showEmail: showEmail ?? false,
    showDateOfBirth: showDateOfBirth ?? false,
    showEmergencyContacts: showEmergencyContacts ?? false
  };
  await user.save();

  await logActivity(user._id, 'privacy_update', 'Updated privacy settings');

  return {
    status: 200,
    body: { success: true, msg: 'Privacy settings updated', settings: user.privacySettings }
  };
};

const getContacts = async (user) => ({
  status: 200,
  body: { success: true, contacts: user.emergencyContacts || [] }
});

const addContact = async (user, payload) => {
  const { name, phone, relation } = payload;

  if (!name || !phone) {
    return { status: 400, body: { success: false, msg: 'Name and phone are required' } };
  }

  const newContact = {
    name,
    phone,
    relation: relation || 'Other',
    priority: (user.emergencyContacts?.length || 0) + 1
  };

  user.emergencyContacts.push(newContact);
  await user.save();

  const savedContact = user.emergencyContacts[user.emergencyContacts.length - 1];

  await logActivity(user._id, 'contact_added', `Added ${name} as emergency contact`);

  return { status: 200, body: { success: true, contact: savedContact } };
};

const deleteContact = async (user, contactId) => {
  user.emergencyContacts = user.emergencyContacts.filter(
    c => c._id.toString() !== contactId
  );
  await user.save();

  await logActivity(user._id, 'contact_deleted', 'Removed an emergency contact');

  return { status: 200, body: { success: true, msg: 'Contact deleted' } };
};

const getActivities = async (user, query) => {
  const limit = parseInt(query.limit) || 50;
  const activities = await ActivityLog.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  return { status: 200, body: { success: true, activities } };
};

const getDocuments = async (user) => {
  const documents = await Document.find({ userId: user._id })
    .sort({ createdAt: -1 });

  return { status: 200, body: { success: true, documents } };
};

const uploadDocument = async (user, payload, file) => {
  const { title, type, notes } = payload;

  if (!title || !file) {
    return { status: 400, body: { success: false, msg: 'Title and file are required' } };
  }

  const newDocument = new Document({
    userId: user._id,
    title,
    type: type || 'other',
    notes: notes || '',
    fileName: file.filename,
    fileUrl: `/uploads/${file.filename}`
  });

  await newDocument.save();

  await logActivity(user._id, 'document_uploaded', `Uploaded: ${title}`);

  return {
    status: 200,
    body: { success: true, document: newDocument, msg: 'Document uploaded successfully' }
  };
};

const deleteDocument = async (user, documentId) => {
  const document = await Document.findOne({ _id: documentId, userId: user._id });

  if (!document) {
    return { status: 404, body: { success: false, msg: 'Document not found' } };
  }

  const filePath = resolveUploadFilePath(document.fileUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await Document.deleteOne({ _id: documentId });

  await logActivity(user._id, 'document_deleted', `Deleted: ${document.title}`);

  return { status: 200, body: { success: true, msg: 'Document deleted' } };
};

const deleteAccount = async (user) => {
  const userId = user._id;
  const userEmail = user.email;

  console.log(`🗑️ Account deletion requested for: ${userEmail}`);

  await unlinkUserRelationships(user);

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

  return {
    status: 200,
    body: {
      success: true,
      msg: 'Your account has been permanently deleted. We are sad to see you go!'
    }
  };
};

module.exports = {
  getProfile,
  updateProfile,
  getPrivacy,
  updatePrivacy,
  getContacts,
  addContact,
  deleteContact,
  getActivities,
  getDocuments,
  uploadDocument,
  deleteDocument,
  deleteAccount
};
