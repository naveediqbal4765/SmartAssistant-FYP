const User = require('../models/User');
const { resolveUploadFilePath } = require('../helpers/uploadPaths');

const unlinkUserRelationships = async (user) => {
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
};

const normalizeUserDocuments = async () => {
  await User.updateMany(
    { role: 'elder', linkedCaregivers: { $exists: false } },
    { $set: { linkedCaregivers: [] } }
  );
  await User.updateMany(
    { role: 'caregiver', linkedSeniorId: { $exists: false } },
    { $set: { linkedSeniorId: null } }
  );
  await User.updateMany({}, { $unset: { documents: '' } });
};

module.exports = {
  resolveUploadFilePath,
  unlinkUserRelationships,
  normalizeUserDocuments
};
