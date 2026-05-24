const profileService = require('./profile.service');

// Controllers are intentionally thin; profile rules and data access live in profile.service.
const getProfile = async (req, res) => {
  try {
    const result = await profileService.getProfile(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Profile fetch error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const result = await profileService.updateProfile(req.user, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Profile update error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getPrivacy = async (req, res) => {
  try {
    const result = await profileService.getPrivacy(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const updatePrivacy = async (req, res) => {
  try {
    const result = await profileService.updatePrivacy(req.user, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getContacts = async (req, res) => {
  try {
    const result = await profileService.getContacts(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const addContact = async (req, res) => {
  try {
    const result = await profileService.addContact(req.user, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Add contact error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const deleteContact = async (req, res) => {
  try {
    const result = await profileService.deleteContact(req.user, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Delete contact error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getActivities = async (req, res) => {
  try {
    const result = await profileService.getActivities(req.user, req.query);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Activity fetch error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getDocuments = async (req, res) => {
  try {
    const result = await profileService.getDocuments(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Document fetch error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const uploadDocument = async (req, res) => {
  try {
    const result = await profileService.uploadDocument(req.user, req.body, req.file);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Document upload error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const result = await profileService.deleteDocument(req.user, req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Document delete error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const result = await profileService.deleteAccount(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Account deletion error:', err);
    return res.status(500).json({ success: false, msg: 'Failed to delete account: ' + err.message });
  }
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
