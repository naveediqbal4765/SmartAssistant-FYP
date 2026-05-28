const mongoose = require('mongoose');
const Conversation = require('./conversation.model');
const ChatMessage = require('./chat.model');
const User = require('../../../shared/models/User');
const {
  assertCanCommunicate,
  canCommunicate,
  getUserById,
  toId
} = require('../permissions/communicationPermission.service');

const createServiceError = (status, msg) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

const findConversation = (userId, otherUserId) => {
  return Conversation.findOne({
    participants: { $all: [userId, otherUserId], $size: 2 }
  });
};

const findReusableConversation = (userId, otherUserId) => {
  return Conversation.findOne({
    participants: { $all: [userId, otherUserId], $size: 2 },
    hiddenFor: { $ne: userId }
  }).sort({ updatedAt: -1 });
};

const addParticipant = (participantMap, user) => {
  if (!user) return;
  participantMap.set(toId(user), user);
};

const filterAllowedParticipants = async (currentUser, participants) => {
  const allowedParticipants = [];

  for (const participant of participants) {
    if (await canCommunicate(currentUser, participant, 'chat')) {
      allowedParticipants.push(participant);
    }
  }

  return allowedParticipants;
};

const getAllowedParticipants = async (user) => {
  const participantMap = new Map();

  if (user.role === 'caregiver' && user.linkedSeniorId) {
    const senior = await User.findOne({ _id: user.linkedSeniorId, role: 'elder' })
      .select('name email role phone avatar');
    addParticipant(participantMap, senior);
  }

  if (user.role === 'elder') {
    const [caregivers, seniors, volunteers] = await Promise.all([
      User.find({
        role: 'caregiver',
        $or: [
          { _id: { $in: user.linkedCaregivers || [] } },
          { linkedSeniorId: user._id }
        ]
      }).select('name email role phone avatar linkedSeniorId'),
      User.find({ _id: { $ne: user._id }, role: 'elder' })
        .select('name email role phone avatar'),
      User.find({ role: 'volunteer' })
        .select('name email role phone avatar')
    ]);

    caregivers.forEach((caregiver) => addParticipant(participantMap, caregiver));
    seniors.forEach((senior) => addParticipant(participantMap, senior));
    volunteers.forEach((volunteer) => addParticipant(participantMap, volunteer));
  }

  if (user.role === 'volunteer') {
    const [seniors, volunteers] = await Promise.all([
      User.find({ role: 'elder' }).select('name email role phone avatar'),
      User.find({ _id: { $ne: user._id }, role: 'volunteer' })
        .select('name email role phone avatar')
    ]);

    seniors.forEach((senior) => addParticipant(participantMap, senior));
    volunteers.forEach((volunteer) => addParticipant(participantMap, volunteer));
  }

  return filterAllowedParticipants(user, Array.from(participantMap.values()));
};

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

  if (currentUser.role === 'elder' || currentUser.role === 'volunteer') {
    const allowedParticipants = await getAllowedParticipants(currentUser);
    allowedParticipants.forEach((participant) => addParticipant(participantMap, participant));
  }

  const allowedParticipants = await filterAllowedParticipants(
    currentUser,
    Array.from(participantMap.values())
  );

  return applyUserSearch(allowedParticipants, normalizedQuery)
    .map(formatSearchUser)
    .slice(0, 10);
};

const upsertConversationForMessage = async (message) => {
  const participants = [message.senderId, message.receiverId];
  const now = message.createdAt || new Date();

  const existingConversation = await findReusableConversation(message.senderId, message.receiverId);

  if (existingConversation) {
    existingConversation.lastMessage = message._id;
    existingConversation.lastMessageAt = now;
    existingConversation.updatedAt = now;
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

  const existingConversation = await findReusableConversation(userId, participantId);
  if (existingConversation) {
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

  const conversations = await Conversation.find({ participants: userId, hiddenFor: { $ne: userId } })
    .populate('participants', 'name email role phone linkedSeniorId linkedCaregivers isOnline lastSeenAt')
    .populate('lastMessage')
    .sort({ lastMessageAt: -1, updatedAt: -1 });

  const visibleConversations = [];

  for (const conversation of conversations) {
    const participant = conversation.participants.find(
      (user) => toId(user) !== toId(userId)
    );

    if (!participant) continue;

    const allowed = await canCommunicate(
      conversation.participants.find((user) => toId(user) === toId(userId)),
      participant,
      'chat'
    );

    if (!allowed) continue;

    visibleConversations.push({
      id: conversation._id,
      participant,
      lastMessage: conversation.lastMessage,
      lastMessageAt: conversation.lastMessageAt,
      updatedAt: conversation.updatedAt
    });
  }

  return visibleConversations;
};

const formatConversationForUser = async (conversation, userId) => {
  const participant = conversation.participants.find(
    (user) => toId(user) !== toId(userId)
  );
  const currentUser = conversation.participants.find(
    (user) => toId(user) === toId(userId)
  );

  if (!participant || !currentUser) {
    throw createServiceError(403, 'Not authorized to view this conversation');
  }

  const allowed = await canCommunicate(currentUser, participant, 'chat');
  if (!allowed) {
    throw createServiceError(403, 'Not authorized to view this conversation');
  }

  return {
    id: conversation._id,
    participant,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    updatedAt: conversation.updatedAt
  };
};

const getConversationById = async (userId, conversationId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throw createServiceError(400, 'Valid conversation id is required');
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    participants: userId,
    hiddenFor: { $ne: userId }
  })
    .populate('participants', 'name email role phone linkedSeniorId linkedCaregivers isOnline lastSeenAt')
    .populate('lastMessage');

  if (!conversation) {
    throw createServiceError(404, 'Conversation not found');
  }

  return formatConversationForUser(conversation, userId);
};

const resolveConversation = async (userId, { conversationId, fromUserId, toUserId } = {}) => {
  if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
    try {
      return await getConversationById(userId, conversationId);
    } catch (err) {
      if (![403, 404].includes(err.status)) {
        throw err;
      }
    }
  }

  const otherUserId = [fromUserId, toUserId]
    .map(toId)
    .find((candidateId) => candidateId && candidateId !== toId(userId));

  if (!otherUserId || !mongoose.Types.ObjectId.isValid(otherUserId)) {
    throw createServiceError(400, 'Valid conversation participant is required');
  }

  const conversation = await createConversation(userId, otherUserId);
  const populatedConversation = await Conversation.findById(conversation._id)
    .populate('participants', 'name email role phone linkedSeniorId linkedCaregivers isOnline lastSeenAt')
    .populate('lastMessage');

  return formatConversationForUser(populatedConversation, userId);
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

  await ChatMessage.updateMany(
    {
      $or: [
        { senderId: conversation.participants[0], receiverId: conversation.participants[1] },
        { senderId: conversation.participants[1], receiverId: conversation.participants[0] }
      ]
    },
    { $addToSet: { deletedFor: userId } }
  );

  return conversation;
};

module.exports = {
  assertCanCommunicate,
  upsertConversationForMessage,
  getConversations,
  getConversationById,
  resolveConversation,
  searchUsers,
  findConversation,
  createConversation,
  hideConversationForUser
};
