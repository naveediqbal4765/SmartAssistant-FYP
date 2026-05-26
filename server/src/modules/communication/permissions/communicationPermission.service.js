const mongoose = require('mongoose');
const User = require('../../../shared/models/User');

const ACTION_TYPES = new Set(['chat', 'call', 'voice']);

const createServiceError = (status, msg) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

const toId = (value) => String(value?._id || value || '');

const getUserById = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return User.findById(userId).select('name email role linkedSeniorId linkedCaregivers');
};

const areLinkedSeniorAndCaregiver = (senior, caregiver) => {
  return (
    senior.role === 'elder' &&
    caregiver.role === 'caregiver' &&
    toId(caregiver.linkedSeniorId) === toId(senior)
  );
};

const canCommunicate = async (sender, receiver, actionType = 'chat') => {
  if (!ACTION_TYPES.has(actionType)) {
    throw createServiceError(400, 'Invalid communication action type');
  }

  if (!sender || !receiver || toId(sender) === toId(receiver)) {
    return false;
  }

  if (sender.role === 'caregiver') {
    return areLinkedSeniorAndCaregiver(receiver, sender);
  }

  if (receiver.role === 'caregiver') {
    return sender.role === 'elder' && areLinkedSeniorAndCaregiver(sender, receiver);
  }

  if (sender.role === 'elder') {
    if (receiver.role === 'elder') {
      return true;
    }

    if (receiver.role === 'volunteer') {
      return true;
    }
  }

  if (sender.role === 'volunteer') {
    if (receiver.role === 'volunteer') {
      return true;
    }

    if (receiver.role === 'elder') {
      return true;
    }
  }

  return false;
};

const assertCanCommunicate = async (senderId, receiverId, actionType = 'chat') => {
  const [sender, receiver] = await Promise.all([
    getUserById(senderId),
    getUserById(receiverId)
  ]);

  if (!sender || !receiver) {
    throw createServiceError(404, 'User not found');
  }

  const allowed = await canCommunicate(sender, receiver, actionType);
  if (!allowed) {
    throw createServiceError(403, `Not authorized to ${actionType} this user`);
  }

  return { sender, receiver };
};

module.exports = {
  canCommunicate,
  assertCanCommunicate,
  getUserById,
  toId
};
