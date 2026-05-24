const path = require('path');
const User = require('../models/User');

/** Resolve stored fileUrl (/uploads/name) to absolute path on disk */
function resolveUploadFilePath(fileUrl) {
  const basename = path.basename((fileUrl || '').replace(/\\/g, '/'));
  return path.join(__dirname, '..', 'uploads', basename);
}

/** Remove bidirectional senior ↔ caregiver references before deleting a user */
async function unlinkUserRelationships(user) {
  if (!user) return;

  if (user.role === 'caregiver' && user.linkedSeniorId) {
    await User.findByIdAndUpdate(user.linkedSeniorId, {
      $pull: { linkedCaregivers: user._id }
    });
  }

  if (user.role === 'elder' && user.linkedCaregivers?.length) {
    await User.updateMany(
      { _id: { $in: user.linkedCaregivers }, linkedSeniorId: user._id },
      { $set: { linkedSeniorId: null } }
    );
  }
}

/** Ensure legacy user documents have consistent link arrays */
async function normalizeUserDocuments() {
  await User.updateMany(
    { role: 'elder', linkedCaregivers: { $exists: false } },
    { $set: { linkedCaregivers: [] } }
  );
  await User.updateMany(
    { role: 'caregiver', linkedSeniorId: { $exists: false } },
    { $set: { linkedSeniorId: null } }
  );
  await User.updateMany({}, { $unset: { documents: '' } });
}

module.exports = {
  resolveUploadFilePath,
  unlinkUserRelationships,
  normalizeUserDocuments
};
