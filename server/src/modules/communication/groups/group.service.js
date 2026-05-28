const mongoose = require('mongoose');
const { Group, GroupJoinRequest, GroupMessage } = require('./group.model');
const User = require('../../../shared/models/User');

const MIN_GROUP_MEMBERS = 3;
const VALID_REACTION_TYPES = new Set(['like', 'heart', 'haha', 'sad']);
const REACTION_EMOJI_BY_TYPE = {
  like: '\u{1F44D}',
  heart: '\u2764\uFE0F',
  haha: '\u{1F602}',
  sad: '\u{1F622}'
};

const toId = (value) => String(value?._id || value || '');

const createServiceError = (status, msg) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

const assertObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createServiceError(400, `Valid ${label} is required`);
  }
};

const isGroupAdmin = (group, userId) => {
  return group.members.some((member) => (
    toId(member.userId) === toId(userId) && member.role === 'admin'
  ));
};

const isGroupMember = (group, userId) => {
  return group.members.some((member) => toId(member.userId) === toId(userId));
};

const assertMinimumGroupSize = (members) => {
  if (members.length < MIN_GROUP_MEMBERS) {
    throw createServiceError(400, 'Group must have at least 3 members');
  }
};

const getGroupOrThrow = async (groupId) => {
  assertObjectId(groupId, 'groupId');
  const group = await Group.findById(groupId);
  if (!group) throw createServiceError(404, 'Group not found');
  return group;
};

const populateGroup = (query) => {
  return query
    .populate('createdBy', 'name email role')
    .populate('members.userId', 'name email role linkedSeniorId linkedCaregivers');
};

const formatGroup = async (group, options = {}) => {
  const latestMessage = await GroupMessage.findOne({ groupId: group._id })
    .sort({ createdAt: -1 })
    .populate('senderId', 'name role');
  const pendingRequest = options.pendingRequestsByGroupId?.get(toId(group._id));

  return {
    _id: group._id,
    name: group.name,
    description: group.description,
    createdBy: group.createdBy,
    mutedFor: group.mutedFor || [],
    members: group.members,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    lastMessage: latestMessage,
    joinRequestStatus: pendingRequest ? pendingRequest.status : undefined,
    joinRequestId: pendingRequest ? pendingRequest._id : undefined
  };
};

const validateDirectAddTarget = (admin, targetUser) => {
  if (targetUser.role === 'caregiver') {
    validateCaregiverLinkBeforeAdding(admin, targetUser);
  }
};

const getDirectlyAddableUsers = async (admin, query = '', excludedIds = []) => {
  if (!['elder', 'volunteer'].includes(admin.role)) {
    throw createServiceError(403, 'Only seniors or volunteers can add group members');
  }

  const search = query.trim();
  const nameFilter = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};

  const roleFilter = admin.role === 'elder'
    ? { role: { $in: ['elder', 'volunteer', 'caregiver'] } }
    : { role: { $in: ['elder', 'volunteer'] } };

  const users = await User.find({
    _id: { $nin: excludedIds },
    ...roleFilter,
    ...nameFilter
  }).select('name email role linkedSeniorId linkedCaregivers').limit(20);

  return users.filter((targetUser) => {
    try {
      validateDirectAddTarget(admin, targetUser);
      return true;
    } catch (err) {
      return false;
    }
  });
};

const createGroup = async (user, payload) => {
  if (!user?._id) {
    throw createServiceError(401, 'Unauthorized request');
  }

  const creator = await User.findById(user._id).select('name email role linkedCaregivers');
  if (!creator) throw createServiceError(401, 'Unauthorized request');

  if (!['elder', 'volunteer'].includes(creator.role)) {
    throw createServiceError(403, 'Only seniors or volunteers can create groups');
  }

  if (!payload.name?.trim()) {
    throw createServiceError(400, 'Missing group name');
  }

  const initialMemberIds = [...new Set((payload.initialMemberIds || []).map(toId).filter(Boolean))]
    .filter((id) => id !== toId(creator._id));

  assertMinimumGroupSize([creator._id, ...initialMemberIds]);

  const initialMembers = await User.find({ _id: { $in: initialMemberIds } })
    .select('name email role linkedSeniorId linkedCaregivers');

  if (initialMembers.length !== initialMemberIds.length) {
    throw createServiceError(400, 'One or more initial members were not found');
  }

  initialMembers.forEach((targetUser) => validateDirectAddTarget(creator, targetUser));

  const group = await Group.create({
    name: payload.name.trim(),
    description: payload.description || '',
    createdBy: creator._id,
    members: [
      { userId: creator._id, role: 'admin' },
      ...initialMembers.map((member) => ({ userId: member._id, role: 'member' }))
    ]
  });

  return populateGroup(Group.findById(group._id));
};

const getMyGroups = async (userId) => {
  const groups = await populateGroup(
    Group.find({ 'members.userId': userId, hiddenFor: { $ne: userId } }).sort({ updatedAt: -1 })
  );
  return Promise.all(groups.map(formatGroup));
};

const discoverGroups = async (user) => {
  if (user.role === 'caregiver') return [];

  const groups = await populateGroup(
    Group.find({ 'members.userId': { $ne: user._id } }).sort({ updatedAt: -1 }).limit(50)
  );
  const pendingRequests = await GroupJoinRequest.find({
    userId: user._id,
    status: 'pending'
  }).select('groupId status');
  const pendingRequestsByGroupId = new Map(
    pendingRequests.map((request) => [toId(request.groupId), request])
  );

  return Promise.all(groups.map((group) => formatGroup(group, { pendingRequestsByGroupId })));
};

const getMessages = async (groupId, user) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, user._id)) {
    throw createServiceError(403, 'Only group members can read group messages');
  }

  return GroupMessage.find({ groupId })
    .where('deletedFor').ne(user._id)
    .sort({ createdAt: 1 })
    .populate('senderId', 'name email role')
    .populate('reactions.userId', 'name email role');
};

const buildGroupReplyPreview = async ({ groupId, userId, replyToMessageId }) => {
  if (!replyToMessageId) return {};
  assertObjectId(replyToMessageId, 'replyToMessageId');

  const original = await GroupMessage.findById(replyToMessageId);
  if (!original || toId(original.groupId) !== toId(groupId)) return {};

  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, userId)) {
    throw createServiceError(403, 'Only group members can reply to group messages');
  }

  const getPreview = () => {
    if (original.messageType === 'voice') return '🎤 Voice Message';
    if (original.messageType === 'image') return `🖼️ ${original.fileName || original.message || 'Image'}`;
    if (original.messageType === 'video') return `🎬 ${original.fileName || original.message || 'Video'}`;
    if (['file', 'document'].includes(original.messageType)) return `📄 ${original.fileName || original.message || 'File'}`;
    return original.message || 'Attachment';
  };
  const preview = getPreview();

  return {
    repliedToMessageId: original._id,
    repliedToPreview: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
    repliedToSender: original.senderName || 'Member'
  };
};

const normalizeForwardedFrom = (forwardedFrom) => {
  if (!forwardedFrom) return {};
  if (!forwardedFrom.messageId) return {};

  return {
    forwardedFrom: {
      messageId: forwardedFrom.messageId,
      senderId: forwardedFrom.senderId || null
    }
  };
};

const sendMessage = async (groupId, user, payload) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, user._id)) {
    throw createServiceError(403, 'Only group members can send group messages');
  }

  if (!payload.message && !payload.mediaUrl) {
    throw createServiceError(400, 'Message or media is required');
  }

  const sender = await User.findById(user._id).select('name');
  if (!sender) throw createServiceError(401, 'Unauthorized request');

  const replyFields = await buildGroupReplyPreview({
    groupId,
    userId: user._id,
    replyToMessageId: payload.repliedToMessageId
  });

  const message = await GroupMessage.create({
    groupId,
    senderId: user._id,
    senderName: sender.name || 'Member',
    message: payload.message || '',
    messageType: payload.messageType || 'text',
    mediaUrl: payload.mediaUrl || '',
    fileName: payload.fileName || '',
    mimeType: payload.mimeType || '',
    size: payload.size || null,
    ...normalizeForwardedFrom(payload.forwardedFrom),
    ...replyFields
  });

  group.updatedAt = new Date();
  await group.save();

  const populatedMessage = await GroupMessage.findById(message._id)
    .populate('senderId', 'name email role')
    .populate('reactions.userId', 'name email role');
  populatedMessage.$locals.group = group;
  return populatedMessage;
};

const updateGroupDetails = async (groupId, user, payload = {}) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupAdmin(group, user._id)) {
    throw createServiceError(403, 'Only group admins can update group settings');
  }

  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (!name) {
      throw createServiceError(400, 'Group name is required');
    }
    group.name = name;
  }

  if (payload.description !== undefined) {
    group.description = payload.description.trim();
  }

  group.updatedAt = new Date();
  await group.save();

  return populateGroup(Group.findById(group._id));
};

const getGroupForAdmin = async (groupId, user) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupAdmin(group, user._id)) {
    throw createServiceError(403, 'Only group admins can view group settings');
  }

  return populateGroup(Group.findById(group._id));
};

const deleteMessageForUser = async (messageId, user, deleteType = 'forEveryone') => {
  assertObjectId(messageId, 'messageId');

  const message = await GroupMessage.findById(messageId);
  if (!message) throw createServiceError(404, 'Message not found');

  const group = await getGroupOrThrow(message.groupId);
  if (!isGroupMember(group, user._id)) {
    throw createServiceError(403, 'Only group members can delete group messages');
  }

  if (deleteType === 'forMe') {
    if (!(message.deletedFor || []).some((id) => toId(id) === toId(user._id))) {
      message.deletedFor.push(user._id);
      await message.save();
    }

    return { message, group, deleteType: 'forMe' };
  }

  if (deleteType !== 'forEveryone') {
    throw createServiceError(400, 'Invalid delete type');
  }

  const ownsMessage = toId(message.senderId) === toId(user._id);
  if (!ownsMessage && !isGroupAdmin(group, user._id)) {
    throw createServiceError(403, 'Only message sender or group admin can delete this message');
  }

  await GroupMessage.deleteOne({ _id: messageId });

  return { message, group, deleteType: 'forEveryone' };
};

const applyGroupMessageReaction = async ({ messageId, userId, reactionType }) => {
  assertObjectId(messageId, 'messageId');

  if (!VALID_REACTION_TYPES.has(reactionType)) {
    throw createServiceError(400, 'Invalid reaction type');
  }

  const message = await GroupMessage.findById(messageId);
  if (!message) throw createServiceError(404, 'Message not found');

  const group = await getGroupOrThrow(message.groupId);
  if (!isGroupMember(group, userId)) {
    throw createServiceError(403, 'Only group members can react to group messages');
  }

  const reactions = message.reactions || [];
  const existingIndex = reactions.findIndex((reaction) => toId(reaction.userId) === toId(userId));

  if (existingIndex >= 0 && reactions[existingIndex].type === reactionType) {
    reactions.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    reactions[existingIndex].type = reactionType;
    reactions[existingIndex].emoji = REACTION_EMOJI_BY_TYPE[reactionType];
    reactions[existingIndex].createdAt = new Date();
  } else {
    reactions.push({
      userId,
      type: reactionType,
      emoji: REACTION_EMOJI_BY_TYPE[reactionType],
      createdAt: new Date()
    });
  }

  message.reactions = reactions;
  await message.save();

  return {
    message: await GroupMessage.findById(message._id)
      .populate('senderId', 'name email role')
      .populate('reactions.userId', 'name email role'),
    group
  };
};

const markGroupMessagesDelivered = async ({ groupId, userId, messageIds = [] }) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, userId)) {
    throw createServiceError(403, 'Only group members can update group message delivery');
  }

  const ids = [...new Set(messageIds.map(String).filter(Boolean))];
  if (!ids.length) return [];

  const deliveredAt = new Date();
  const messages = await GroupMessage.find({
    _id: { $in: ids },
    groupId,
    senderId: { $ne: userId },
    'deliveredTo.userId': { $ne: userId }
  }).select('_id groupId senderId deliveredTo seenBy');

  if (!messages.length) return [];

  await GroupMessage.updateMany(
    { _id: { $in: messages.map((message) => message._id) } },
    { $push: { deliveredTo: { userId, deliveredAt } } }
  );

  return messages.map((message) => ({
    messageId: String(message._id),
    groupId: String(message.groupId),
    senderId: message.senderId,
    userId,
    deliveredAt
  }));
};

const markGroupMessagesSeen = async ({ groupId, userId, messageIds = [] }) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, userId)) {
    throw createServiceError(403, 'Only group members can update group message seen status');
  }

  const ids = [...new Set(messageIds.map(String).filter(Boolean))];
  if (!ids.length) return [];

  const seenAt = new Date();
  const messages = await GroupMessage.find({
    _id: { $in: ids },
    groupId,
    senderId: { $ne: userId },
    'seenBy.userId': { $ne: userId }
  }).select('_id groupId senderId deliveredTo seenBy');

  if (!messages.length) return [];

  await GroupMessage.updateMany(
    { _id: { $in: messages.map((message) => message._id) } },
    { $push: { seenBy: { userId, seenAt } } }
  );

  return messages.map((message) => ({
    messageId: String(message._id),
    groupId: String(message.groupId),
    senderId: message.senderId,
    userId,
    seenAt
  }));
};

const requestToJoin = async (groupId, user) => {
  if (user.role === 'caregiver') {
    throw createServiceError(403, 'Caregivers cannot request to join groups');
  }

  const group = await getGroupOrThrow(groupId);
  if (isGroupMember(group, user._id)) {
    throw createServiceError(400, 'Already a group member');
  }

  const existing = await GroupJoinRequest.findOne({
    groupId,
    userId: user._id,
    status: 'pending'
  });
  if (existing) {
    const populatedExisting = await existing.populate('userId', 'name email role');
    populatedExisting.$locals.group = group;
    return populatedExisting;
  }

  const request = await GroupJoinRequest.create({ groupId, userId: user._id });
  const populatedRequest = await request.populate('userId', 'name email role');
  populatedRequest.$locals.group = group;
  return populatedRequest;
};

const cancelJoinRequest = async (groupId, user) => {
  if (user.role === 'caregiver') {
    throw createServiceError(403, 'Caregivers cannot manage group join requests');
  }

  const group = await getGroupOrThrow(groupId);
  const request = await GroupJoinRequest.findOneAndDelete({
    groupId,
    userId: user._id,
    status: 'pending'
  }).populate('userId', 'name email role');

  if (!request) {
    throw createServiceError(404, 'Pending join request not found');
  }

  request.$locals.group = group;
  return request;
};

const getRequests = async (groupId, user) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupAdmin(group, user._id)) {
    throw createServiceError(403, 'Only group admins can view requests');
  }

  return GroupJoinRequest.find({ groupId, status: 'pending' })
    .sort({ createdAt: -1 })
    .populate('userId', 'name email role');
};

const updateRequest = async (requestId, user, status) => {
  assertObjectId(requestId, 'requestId');
  const request = await GroupJoinRequest.findById(requestId);
  if (!request) throw createServiceError(404, 'Join request not found');
  if (request.status !== 'pending') {
    throw createServiceError(400, 'Only pending join requests can be updated');
  }

  const group = await getGroupOrThrow(request.groupId);
  if (!isGroupAdmin(group, user._id)) {
    throw createServiceError(403, 'Only group admins can manage requests');
  }

  request.status = status;
  await request.save();

  if (status === 'approved' && !isGroupMember(group, request.userId)) {
    group.members.push({ userId: request.userId, role: 'member' });
    group.hiddenFor = (group.hiddenFor || []).filter((id) => toId(id) !== toId(request.userId));
    group.mutedFor = (group.mutedFor || []).filter((id) => toId(id) !== toId(request.userId));
    group.updatedAt = new Date();
    await group.save();
  }

  return request.populate('userId', 'name email role');
};

const validateCaregiverLinkBeforeAdding = (admin, targetUser) => {
  if (targetUser.role !== 'caregiver') return;

  const linkedCaregivers = (admin.linkedCaregivers || []).map(toId);
  if (admin.role !== 'elder' || !linkedCaregivers.includes(toId(targetUser))) {
    throw createServiceError(403, 'Only a linked senior can directly add this caregiver');
  }
};

const directAddMember = async (groupId, userId, admin) => {
  const group = await getGroupOrThrow(groupId);
  assertObjectId(userId, 'userId');
  const adminUser = await User.findById(admin._id).select('name email role linkedCaregivers');
  if (!adminUser) throw createServiceError(404, 'Admin user not found');

  if (!isGroupAdmin(group, adminUser._id)) {
    throw createServiceError(403, 'Only group admins can add members');
  }

  const targetUser = await User.findById(userId).select('name email role linkedSeniorId linkedCaregivers');
  if (!targetUser) throw createServiceError(404, 'User not found');

  validateDirectAddTarget(adminUser, targetUser);

  if (isGroupMember(group, targetUser._id)) {
    return populateGroup(Group.findById(group._id));
  }

  group.members.push({ userId: targetUser._id, role: 'member' });
  group.hiddenFor = (group.hiddenFor || []).filter((id) => toId(id) !== toId(targetUser._id));
  group.mutedFor = (group.mutedFor || []).filter((id) => toId(id) !== toId(targetUser._id));
  group.updatedAt = new Date();
  await group.save();

  return populateGroup(Group.findById(group._id));
};

const removeMember = async (groupId, userId, admin) => {
  const group = await getGroupOrThrow(groupId);
  assertObjectId(userId, 'userId');

  if (toId(userId) === toId(admin._id)) {
    throw createServiceError(400, 'Use Exit Group to leave your own group');
  }

  if (!isGroupAdmin(group, admin._id)) {
    throw createServiceError(403, 'Only group admins can remove members');
  }

  const targetMember = group.members.find((member) => toId(member.userId) === toId(userId));
  if (!targetMember) throw createServiceError(404, 'Member not found');

  const adminCount = group.members.filter((member) => member.role === 'admin').length;
  if (targetMember.role === 'admin' && adminCount <= 1) {
    throw createServiceError(400, 'Cannot remove the last group admin');
  }

  if (group.members.length - 1 < MIN_GROUP_MEMBERS) {
    throw createServiceError(400, 'Group must have at least 3 members');
  }

  group.members = group.members.filter((member) => toId(member.userId) !== toId(userId));
  group.hiddenFor = [...new Set([...(group.hiddenFor || []).map(toId), toId(userId)])];
  group.mutedFor = (group.mutedFor || []).filter((id) => toId(id) !== toId(userId));
  group.updatedAt = new Date();
  await group.save();

  return populateGroup(Group.findById(group._id));
};

const exitGroup = async (groupId, userId) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, userId)) {
    throw createServiceError(403, 'Only group members can exit this group');
  }

  const exitingMember = group.members.find((member) => toId(member.userId) === toId(userId));
  group.members = group.members.filter((member) => toId(member.userId) !== toId(userId));
  group.hiddenFor = [...new Set([...(group.hiddenFor || []).map(toId), toId(userId)])];
  group.mutedFor = (group.mutedFor || []).filter((id) => toId(id) !== toId(userId));

  if (exitingMember?.role === 'admin' && group.members.length && !group.members.some((member) => member.role === 'admin')) {
    group.members[0].role = 'admin';
  }

  group.updatedAt = new Date();
  await group.save();

  return group;
};

const setGroupMutedForUser = async (groupId, userId, muted = true) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, userId)) {
    throw createServiceError(403, 'Only group members can mute this group');
  }

  await Group.updateOne(
    { _id: groupId },
    muted
      ? { $addToSet: { mutedFor: userId } }
      : { $pull: { mutedFor: userId } },
    { runValidators: false }
  );

  return populateGroup(Group.findById(groupId));
};

const hideGroupForUser = async (groupId, userId) => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupMember(group, userId)) {
    throw createServiceError(403, 'Not authorized to delete this group conversation');
  }

  await Group.updateOne(
    { _id: groupId },
    { $addToSet: { hiddenFor: userId } },
    { runValidators: false }
  );

  return group;
};

const searchAddableUsers = async (groupId, admin, query = '') => {
  const group = await getGroupOrThrow(groupId);
  if (!isGroupAdmin(group, admin._id)) {
    throw createServiceError(403, 'Only group admins can search members');
  }

  const memberIds = group.members.map((member) => toId(member.userId));
  return getDirectlyAddableUsers(admin, query, memberIds);
};

module.exports = {
  createGroup,
  getMyGroups,
  discoverGroups,
  getMessages,
  sendMessage,
  updateGroupDetails,
  getGroupForAdmin,
  deleteMessageForUser,
  applyGroupMessageReaction,
  markGroupMessagesDelivered,
  markGroupMessagesSeen,
  requestToJoin,
  cancelJoinRequest,
  getRequests,
  updateRequest,
  directAddMember,
  removeMember,
  exitGroup,
  setGroupMutedForUser,
  hideGroupForUser,
  searchAddableUsers,
  searchInitialMembers: (user, query) => getDirectlyAddableUsers(user, query, [user._id]),
  validateCaregiverLinkBeforeAdding
};
