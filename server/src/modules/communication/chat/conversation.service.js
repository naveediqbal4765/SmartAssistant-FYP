const mongoose = require('mongoose');
const Conversation = require('./conversation.model');
const ChatMessage = require('./chat.model');
const User = require('../../../shared/models/User');
const Task = require('../../../shared/models/Task');

const ACTIVE_HELP_STATUSES = ['accepted', 'in_progress', 'completed'];

const createServiceError = (status, msg) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

const toId = (value) => String(value?._id || value);

const getUserById = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }

  return User.findById(userId).select('name email role linkedSeniorId linkedCaregivers');
};

const hasVolunteerSeniorTask = async (volunteerId, seniorId) => {
  return Boolean(await Task.exists({
    userId: seniorId,
    volunteerId,
    status: { $in: ACTIVE_HELP_STATUSES }
  }));
};

const getVolunteerIdsForSenior = async (seniorId) => {
  const tasks = await Task.find({
    userId: seniorId,
    volunteerId: { $ne: null },
    status: { $in: ACTIVE_HELP_STATUSES }
  }).select('volunteerId');

  return tasks.map((task) => task.volunteerId).filter(Boolean);
};

const canUsersCommunicate = async (sender, receiver) => {
  if (!sender || !receiver || toId(sender) === toId(receiver)) {
    return false;
  }

  if (sender.role === 'caregiver') {
    if (receiver.role === 'elder') {
      return toId(sender.linkedSeniorId) === toId(receiver);
    }

    if (receiver.role === 'volunteer' && sender.linkedSeniorId) {
      return hasVolunteerSeniorTask(toId(receiver), toId(sender.linkedSeniorId));
    }
  }

  if (sender.role === 'elder') {
    const receiverId = toId(receiver);
    const linkedCaregiverIds = (sender.linkedCaregivers || []).map(toId);

    if (receiver.role === 'caregiver') {
      return linkedCaregiverIds.includes(receiverId);
    }

    if (receiver.role === 'volunteer') {
      return hasVolunteerSeniorTask(receiverId, toId(sender));
    }

    if (receiver.role === 'elder') {
      return true;
    }
  }

  if (sender.role === 'volunteer') {
    if (receiver.role === 'elder') {
      return hasVolunteerSeniorTask(toId(sender), toId(receiver));
    }

    if (receiver.role === 'volunteer') {
      return true;
    }

    if (receiver.role === 'caregiver' && receiver.linkedSeniorId) {
      return hasVolunteerSeniorTask(toId(sender), toId(receiver.linkedSeniorId));
    }
  }

  return false;
};

const assertCanCommunicate = async (senderId, receiverId) => {
  const [sender, receiver] = await Promise.all([
    getUserById(senderId),
    getUserById(receiverId)
  ]);

  if (!sender || !receiver) {
    throw createServiceError(404, 'User not found');
  }

  const allowed = await canUsersCommunicate(sender, receiver);
  if (!allowed) {
    throw createServiceError(403, 'Not authorized to start this conversation');
  }

  return { sender, receiver };
};

const findConversation = (userId, otherUserId) => {
  return Conversation.findOne({
    participants: { $all: [userId, otherUserId], $size: 2 }
  });
};

const addParticipant = (participantMap, user) => {
  if (!user) return;
  participantMap.set(toId(user), user);
};

const getAllowedParticipants = async (user) => {
  const participantMap = new Map();

  if (user.role === 'caregiver' && user.linkedSeniorId) {
    const [senior, volunteerIds] = await Promise.all([
      User.findOne({ _id: user.linkedSeniorId, role: 'elder' })
        .select('name email role phone avatar'),
      getVolunteerIdsForSenior(user.linkedSeniorId)
    ]);

    const volunteers = await User.find({ _id: { $in: volunteerIds }, role: 'volunteer' })
      .select('name email role phone avatar');

    addParticipant(participantMap, senior);
    volunteers.forEach((volunteer) => addParticipant(participantMap, volunteer));
  }

  if (user.role === 'elder') {
    const [caregivers, volunteerTasks] = await Promise.all([
      User.find({ _id: { $in: user.linkedCaregivers || [] }, role: 'caregiver' })
        .select('name email role phone avatar'),
      Task.find({
        userId: user._id,
        volunteerId: { $ne: null },
        status: { $in: ACTIVE_HELP_STATUSES }
      })
        .populate('volunteerId', 'name email role phone avatar')
        .select('volunteerId')
    ]);

    caregivers.forEach((caregiver) => addParticipant(participantMap, caregiver));
    volunteerTasks.forEach((task) => addParticipant(participantMap, task.volunteerId));
  }

  if (user.role === 'volunteer') {
    const tasks = await Task.find({
      volunteerId: user._id,
      status: { $in: ACTIVE_HELP_STATUSES }
    })
      .populate('userId', 'name email role phone avatar')
      .select('userId');

    tasks.forEach((task) => addParticipant(participantMap, task.userId));
  }

  return Array.from(participantMap.values());
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyUserSearch = (users, query) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  return users.filter((user) => {
    const searchable = `${user.name || ''} ${user.email || ''} ${user.role || ''}`.toLowerCase();
    return searchable.includes(normalizedQuery);
  });
};

const formatSearchUser = (user) => ({
  _id: user._id,
  name: user.name,
  role: user.role,
  avatar: user.avatar || ''
});

const searchUsers = async (userId, query = '') => {
  const currentUser = await getUserById(userId);
  if (!currentUser) {
    throw createServiceError(404, 'User not found');
  }

  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const participantMap = new Map();

  if (currentUser.role === 'caregiver') {
    const allowedParticipants = await getAllowedParticipants(currentUser);
    allowedParticipants.forEach((participant) => addParticipant(participantMap, participant));
  }

  if (currentUser.role === 'elder') {
    const [allowedParticipants, peerSeniors] = await Promise.all([
      getAllowedParticipants(currentUser),
      User.find({
        _id: { $ne: currentUser._id },
        role: 'elder',
        $or: [
          { name: { $regex: escapeRegex(normalizedQuery), $options: 'i' } },
          { email: { $regex: escapeRegex(normalizedQuery), $options: 'i' } }
        ]
      }).select('name email role avatar')
    ]);

    allowedParticipants.forEach((participant) => addParticipant(participantMap, participant));
    peerSeniors.forEach((senior) => addParticipant(participantMap, senior));
  }

  if (currentUser.role === 'volunteer') {
    const [allowedParticipants, peerVolunteers] = await Promise.all([
      getAllowedParticipants(currentUser),
      User.find({
        _id: { $ne: currentUser._id },
        role: 'volunteer',
        $or: [
          { name: { $regex: escapeRegex(normalizedQuery), $options: 'i' } },
          { email: { $regex: escapeRegex(normalizedQuery), $options: 'i' } }
        ]
      }).select('name email role avatar')
    ]);

    allowedParticipants.forEach((participant) => addParticipant(participantMap, participant));
    peerVolunteers.forEach((volunteer) => addParticipant(participantMap, volunteer));
  }

  return applyUserSearch(Array.from(participantMap.values()), normalizedQuery)
    .map(formatSearchUser)
    .slice(0, 10);
};

const upsertConversationForMessage = async (message) => {
  const participants = [message.senderId, message.receiverId];
  const now = message.createdAt || new Date();

  const existingConversation = await findConversation(message.senderId, message.receiverId);

  if (existingConversation) {
    existingConversation.lastMessage = message._id;
    existingConversation.lastMessageAt = now;
    existingConversation.updatedAt = now;
    existingConversation.hiddenFor = (existingConversation.hiddenFor || []).filter((userId) => (
      !participants.map(toId).includes(toId(userId))
    ));
    return existingConversation.save();
  }

  return Conversation.create({
    participants,
    lastMessage: message._id,
    lastMessageAt: now,
    updatedAt: now,
    createdAt: now
  });
};

const createConversation = async (userId, participantId) => {
  await assertCanCommunicate(userId, participantId);

  const existingConversation = await findConversation(userId, participantId);
  if (existingConversation) {
    existingConversation.hiddenFor = (existingConversation.hiddenFor || []).filter((hiddenUserId) => (
      toId(hiddenUserId) !== toId(userId)
    ));
    existingConversation.updatedAt = new Date();
    await existingConversation.save();
    return existingConversation;
  }

  const now = new Date();
  return Conversation.create({
    participants: [userId, participantId],
    lastMessage: null,
    lastMessageAt: null,
    createdAt: now,
    updatedAt: now
  });
};

const getConversations = async (userId) => {
  const currentUser = await getUserById(userId);
  if (!currentUser) {
    throw createServiceError(404, 'User not found');
  }

  const [conversations, allowedParticipants] = await Promise.all([
    Conversation.find({ participants: userId, hiddenFor: { $ne: userId } })
      .populate('participants', 'name email role phone linkedSeniorId linkedCaregivers')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1, updatedAt: -1 }),
    getAllowedParticipants(currentUser)
  ]);

  const visibleConversations = [];
  const visibleParticipantIds = new Set();

  for (const conversation of conversations) {
    const participant = conversation.participants.find(
      (user) => toId(user) !== toId(userId)
    );

    if (!participant) continue;

    const allowed = await canUsersCommunicate(
      conversation.participants.find((user) => toId(user) === toId(userId)),
      participant
    );

    if (!allowed) continue;

    visibleParticipantIds.add(toId(participant));

    visibleConversations.push({
      id: conversation._id,
      participant,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      updatedAt: conversation.updatedAt
    });
  }

  for (const participant of allowedParticipants) {
    if (visibleParticipantIds.has(toId(participant))) continue;

    visibleConversations.push({
      id: `new-${toId(participant)}`,
      participant,
      lastMessage: null,
      lastMessageAt: null,
      updatedAt: null
    });
  }

  return visibleConversations;
};

const hideConversationForUser = async (conversationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw createServiceError(400, 'Valid conversation id is required');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw createServiceError(404, 'Conversation not found');
  }

  const isParticipant = conversation.participants.map(toId).includes(toId(userId));
  if (!isParticipant) {
    throw createServiceError(403, 'Not authorized to delete this conversation');
  }

  await Conversation.updateOne(
    { _id: conversationId },
    { $addToSet: { hiddenFor: userId } },
    { runValidators: false }
  );

  return conversation;
};

const hardDeleteConversation = async (conversationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw createServiceError(400, 'Valid conversation id is required');
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw createServiceError(404, 'Conversation not found');
  }

  const participantIds = conversation.participants.map(toId);
  if (!participantIds.includes(toId(userId))) {
    throw createServiceError(403, 'Not authorized to delete this conversation');
  }

  await ChatMessage.deleteMany({
    $or: [
      { senderId: conversation.participants[0], receiverId: conversation.participants[1] },
      { senderId: conversation.participants[1], receiverId: conversation.participants[0] }
    ]
  });
  await Conversation.deleteOne({ _id: conversationId });

  return conversation;
};

module.exports = {
  assertCanCommunicate,
  upsertConversationForMessage,
  getConversations,
  searchUsers,
  findConversation,
  createConversation,
  hideConversationForUser,
  hardDeleteConversation
};
