const mongoose = require('mongoose');
const User = require('../../shared/models/User');
const ActivityLog = require('../../shared/models/ActivityLog');
const Document = require('../../shared/models/Document');
const Task = require('../../shared/models/Task');
const { unlinkUserRelationships } = require('../../shared/links/userLinks');
const { deleteCloudinaryFile } = require('../../shared/cloudinary');

const defaultPrivacySettings = {
  showPhone: true,
  showAddress: false,
  showEmail: false,
  showDateOfBirth: false,
  showEmergencyContacts: false
};

const toId = (value) => String(value?._id || value || '');
const toRadians = (value) => (Number(value) * Math.PI) / 180;
const calculateDistanceMeters = (origin, target) => {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(target.lat - origin.lat);
  const dLng = toRadians(target.lng - origin.lng);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(target.lat);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const getPointCoordinates = (location) => {
  const [lng, lat] = location?.coordinates || [];
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude === 0 && longitude === 0) return null;
  return { lat: latitude, lng: longitude };
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
    linkedSenior = await User.findById(user.linkedSeniorId).select('name email phone location');
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
        location: user.location || null,
        linkedSeniorId: user.linkedSeniorId || null,
        linkedSenior,
        linkedCaregivers,
        privacySettings: user.privacySettings || defaultPrivacySettings
      }
    }
  };
};

const getLinkedSeniorProfile = async (user, seniorId) => {
  if (user.role !== 'caregiver' || !user.linkedSeniorId) {
    return { status: 403, body: { success: false, msg: 'Linked senior access is only available to caregivers' } };
  }

  if (String(user.linkedSeniorId) !== String(seniorId)) {
    return { status: 403, body: { success: false, msg: 'You can only view your linked senior profile' } };
  }

  const senior = await User.findOne({ _id: seniorId, role: 'elder' })
    .select('name email phone address dateOfBirth location privacySettings');

  if (!senior) {
    return { status: 404, body: { success: false, msg: 'Linked senior not found' } };
  }

  await logActivity(user._id, 'linked_senior_profile_view', `Viewed linked senior profile: ${senior._id}`);

  return {
    status: 200,
    body: {
      success: true,
      readOnly: true,
      user: {
        id: senior._id,
        name: senior.name,
        email: senior.email,
        role: senior.role,
        phone: senior.phone || '',
        address: senior.address || '',
        dateOfBirth: senior.dateOfBirth || null,
        location: senior.location || null,
        linkedSeniorId: null,
        linkedSenior: null,
        linkedCaregivers: [],
        privacySettings: senior.privacySettings || defaultPrivacySettings
      }
    }
  };
};

const getPublicVolunteerProfile = async (user, volunteerId) => {
  if (user.role !== 'elder') {
    return { status: 403, body: { success: false, msg: 'Volunteer profile view is only available to seniors' } };
  }

  if (!mongoose.Types.ObjectId.isValid(volunteerId)) {
    return { status: 400, body: { success: false, msg: 'Valid volunteer id is required' } };
  }

  const [volunteer, completedTasks, seniorIds] = await Promise.all([
    User.findOne({ _id: volunteerId, role: 'volunteer' })
      .select('name role avatar profilePicture isOnline lastSeenAt createdAt location'),
    Task.countDocuments({
      $or: [{ assignedVolunteerId: volunteerId }, { volunteerId }],
      status: { $in: ['verified_completed', 'completed', 'closed'] }
    }),
    Task.distinct('userId', {
      $or: [{ assignedVolunteerId: volunteerId }, { volunteerId }],
      status: { $in: ['verified_completed', 'completed', 'closed'] }
    })
  ]);

  const seniorLocation = getPointCoordinates(user.location);
  const volunteerLocation = getPointCoordinates(volunteer?.location);

  if (!volunteer || !seniorLocation || !volunteerLocation) {
    return { status: 404, body: { success: false, msg: 'Profile not available' } };
  }

  const distanceMeters = calculateDistanceMeters(seniorLocation, volunteerLocation);
  if (distanceMeters > 10000) {
    return { status: 404, body: { success: false, msg: 'Profile not available' } };
  }

  await logActivity(user._id, 'volunteer_profile_view', `Viewed volunteer profile: ${volunteer._id}`);

  return {
    status: 200,
    body: {
      success: true,
      volunteer: {
        id: volunteer._id,
        name: volunteer.name,
        role: volunteer.role,
        avatar: volunteer.avatar || volunteer.profilePicture || '',
        availabilityStatus: volunteer.isOnline ? 'active' : 'inactive',
        lastSeenAt: volunteer.lastSeenAt || null,
        tasksCompletedCount: completedTasks,
        seniorsHelpedCount: seniorIds.map(toId).filter(Boolean).length,
        joinedAt: volunteer.createdAt,
        distance: {
          meters: Math.round(distanceMeters),
          km: Number((distanceMeters / 1000).toFixed(2))
        }
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

const unlinkCaregiver = async (user, caregiverId) => {
  if (!user || user.role !== 'elder') {
    return { status: 403, body: { success: false, msg: 'Only seniors can remove caregivers' } };
  }

  if (!/^[0-9a-fA-F]{24}$/.test(String(caregiverId || ''))) {
    return { status: 400, body: { success: false, msg: 'Invalid caregiver id' } };
  }

  const linkedCaregiverIds = user.linkedCaregivers || [];
  const isLinked = linkedCaregiverIds.some(
    (id) => id.toString() === caregiverId
  );

  if (!isLinked) {
    return { status: 404, body: { success: false, msg: 'Caregiver is not linked to this senior' } };
  }

  const caregiver = await User.findOne({ _id: caregiverId, role: 'caregiver' });
  if (!caregiver) {
    return { status: 404, body: { success: false, msg: 'Caregiver not found' } };
  }

  user.linkedCaregivers = linkedCaregiverIds.filter(
    (id) => id.toString() !== caregiverId
  );

  if (caregiver.linkedSeniorId?.toString() === user._id.toString()) {
    caregiver.linkedSeniorId = null;
  }

  await caregiver.save();
  await user.save();

  await logActivity(user._id, 'caregiver_unlinked', `Removed caregiver ${caregiver.email}`);

  return {
    status: 200,
    body: {
      success: true,
      msg: 'Caregiver removed successfully',
      caregiverId
    }
  };
};

const getActivities = async (user, query) => {
  const limit = parseInt(query.limit) || 50;
  const activities = await ActivityLog.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(limit);

  return { status: 200, body: { success: true, activities } };
};

const resolveVaultSubject = (user, targetUserId) => {
  const subjectUserId = targetUserId || user._id;
  const subjectId = String(subjectUserId);
  const userId = String(user._id);

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return { allowed: false };
  }

  if (user.role === 'elder' && subjectId === userId) {
    return { allowed: true, subjectUserId };
  }

  if (user.role === 'caregiver' && user.linkedSeniorId && subjectId === String(user.linkedSeniorId)) {
    return { allowed: true, subjectUserId, readOnly: true };
  }

  return { allowed: false };
};

const getDocuments = async (user, targetUserId = null) => {
  const vaultSubject = resolveVaultSubject(user, targetUserId);
  if (!vaultSubject.allowed) {
    return { status: 403, body: { success: false, msg: 'You do not have access to this Digital Health Vault' } };
  }

  const documents = await Document.find({ userId: vaultSubject.subjectUserId })
    .sort({ createdAt: -1 });

  return {
    status: 200,
    body: {
      success: true,
      documents,
      subjectUserId: vaultSubject.subjectUserId,
      readOnly: Boolean(vaultSubject.readOnly)
    }
  };
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
    fileUrl: file.path
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

  await deleteCloudinaryFile({ filename: document.fileName });

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
    await deleteCloudinaryFile({ filename: doc.fileName });
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
  getLinkedSeniorProfile,
  getPublicVolunteerProfile,
  updateProfile,
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
};
