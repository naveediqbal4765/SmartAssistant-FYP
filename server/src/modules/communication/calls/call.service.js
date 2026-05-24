const mongoose = require('mongoose');
const User = require('../../../shared/models/User');
const Task = require('../../../shared/models/Task');

const ACTIVE_HELP_STATUSES = ['accepted', 'in_progress', 'completed'];

const toId = (value) => String(value?._id || value || '');

const getUserById = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return User.findById(userId).select('name email role linkedSeniorId linkedCaregivers');
};

const hasVolunteerSeniorTask = async (volunteerId, seniorId) => {
  return Boolean(await Task.exists({
    volunteerId,
    userId: seniorId,
    status: { $in: ACTIVE_HELP_STATUSES }
  }));
};

const canUsersCall = async (caller, receiver) => {
  if (!caller || !receiver || toId(caller) === toId(receiver)) {
    return false;
  }

  if (caller.role === 'elder') {
    if (receiver.role === 'caregiver') {
      return (caller.linkedCaregivers || []).map(toId).includes(toId(receiver));
    }

    if (receiver.role === 'volunteer') {
      return hasVolunteerSeniorTask(toId(receiver), toId(caller));
    }

    if (receiver.role === 'elder') {
      return true;
    }
  }

  if (caller.role === 'caregiver') {
    return receiver.role === 'elder' && toId(caller.linkedSeniorId) === toId(receiver);
  }

  if (caller.role === 'volunteer') {
    return receiver.role === 'elder' && hasVolunteerSeniorTask(toId(caller), toId(receiver));
  }

  return false;
};

const assertCanCall = async (callerId, receiverId) => {
  const [caller, receiver] = await Promise.all([
    getUserById(callerId),
    getUserById(receiverId)
  ]);

  if (!caller || !receiver) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const allowed = await canUsersCall(caller, receiver);
  if (!allowed) {
    const err = new Error('Not authorized to call this user');
    err.status = 403;
    throw err;
  }

  return { caller, receiver };
};

module.exports = {
  assertCanCall
};
