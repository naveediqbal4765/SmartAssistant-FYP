const ChatMessage = require('./chat.model');
const conversationService = require('./conversation.service');
const User = require('../../../shared/models/User');

const VALID_REACTION_TYPES = new Set(['like', 'heart', 'haha', 'sad']);
const REACTION_EMOJI_BY_TYPE = {
  like: '\u{1F44D}',
  heart: '\u2764\uFE0F',
  haha: '\u{1F602}',
  sad: '\u{1F622}'
};

const getActionTypeForMessage = (messageType = 'text') => {
  if (messageType === 'voice') return 'voice';
  if (messageType === 'call') return 'call';
  return 'chat';
};

const buildReplyPreview = async ({ replyToMessageId, senderId, receiverId }) => {
  if (!replyToMessageId) return {};

  const original = await ChatMessage.findById(replyToMessageId);
  if (!original) return {};

  const isParticipant = [original.senderId, original.receiverId].some((id) => String(id) === String(senderId))
    && [original.senderId, original.receiverId].some((id) => String(id) === String(receiverId));
  if (!isParticipant || original.messageType === 'call') return {};

  const originalSender = await User.findById(original.senderId).select('name');
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
    repliedToSender: originalSender?.name || 'Member'
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

const sendMessage = async (data) => {
  const messageType = data.messageType || 'text';
  await conversationService.assertCanCommunicate(
    data.senderId,
    data.receiverId,
    getActionTypeForMessage(messageType)
  );

  const replyFields = await buildReplyPreview({
    replyToMessageId: data.repliedToMessageId,
    senderId: data.senderId,
    receiverId: data.receiverId
  });

  const chatMessage = new ChatMessage({
    senderId: data.senderId,
    receiverId: data.receiverId,
    message: data.message || '',
    messageType,
    mediaUrl: data.mediaUrl || '',
    fileName: data.fileName || '',
    mimeType: data.mimeType || '',
    size: data.size || null,
    duration: data.duration || null,
    deletedFor: data.deletedFor || [],
    ...normalizeForwardedFrom(data.forwardedFrom),
    ...replyFields
  });

  await chatMessage.save();
  const conversation = await conversationService.upsertConversationForMessage(chatMessage);
  chatMessage.$locals.conversation = conversation;

  return chatMessage;
};

const getMessages = async (userId, otherUserId) => {
  await conversationService.assertCanCommunicate(userId, otherUserId);

  return ChatMessage.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId }
    ],
    deletedFor: { $ne: userId }
  })
    .sort({ createdAt: 1 })
    .populate('reactions.userId', 'name email role');
};

const deleteMessageForUser = async (messageId, userId, deleteType = 'forEveryone') => {
  const message = await ChatMessage.findById(messageId);
  if (!message) {
    const err = new Error('Message not found');
    err.status = 404;
    throw err;
  }

  const isSender = String(message.senderId) === String(userId);
  const isParticipant = [message.senderId, message.receiverId].some((id) => String(id) === String(userId));

  if (!isParticipant) {
    const err = new Error('Unauthorized delete request');
    err.status = 403;
    throw err;
  }

  if (deleteType === 'forMe') {
    if (!(message.deletedFor || []).some((id) => String(id) === String(userId))) {
      message.deletedFor.push(userId);
      await message.save();
    }

    return { message, deleteType: 'forMe' };
  }

  if (deleteType !== 'forEveryone') {
    const err = new Error('Invalid deleteType');
    err.status = 400;
    throw err;
  }

  if (!isSender) {
    const err = new Error('Only the sender can delete this message for everyone');
    err.status = 403;
    throw err;
  }

  await ChatMessage.deleteOne({ _id: messageId });

  return { message, deleteType: 'forEveryone' };
};

const applyMessageReaction = async ({ messageId, userId, reactionType, expectedMessageType }) => {
  if (!VALID_REACTION_TYPES.has(reactionType)) {
    const err = new Error('Invalid reactionType');
    err.status = 400;
    throw err;
  }

  const message = await ChatMessage.findById(messageId);
  if (!message) {
    const err = new Error('Message not found');
    err.status = 404;
    throw err;
  }

  if (expectedMessageType && message.messageType !== expectedMessageType) {
    const err = new Error(expectedMessageType === 'voice' ? 'Voice note not found' : 'Text message not found');
    err.status = 404;
    throw err;
  }

  if (!expectedMessageType && message.messageType === 'call') {
    const err = new Error('Cannot react to call logs');
    err.status = 400;
    throw err;
  }

  const isParticipant = [message.senderId, message.receiverId].some((id) => String(id) === String(userId));
  if (!isParticipant) {
    const err = new Error('Unauthorized reaction request');
    err.status = 403;
    throw err;
  }

  const existingIndex = (message.reactions || []).findIndex((reaction) => (
    String(reaction.userId) === String(userId)
  ));

  if (existingIndex >= 0 && message.reactions[existingIndex].type === reactionType) {
    message.reactions.splice(existingIndex, 1);
  } else if (existingIndex >= 0) {
    message.reactions[existingIndex].type = reactionType;
    message.reactions[existingIndex].emoji = REACTION_EMOJI_BY_TYPE[reactionType];
    message.reactions[existingIndex].createdAt = new Date();
  } else {
    message.reactions.push({
      userId,
      type: reactionType,
      emoji: REACTION_EMOJI_BY_TYPE[reactionType],
      createdAt: new Date()
    });
  }

  await message.save();
  return ChatMessage.findById(message._id).populate('reactions.userId', 'name email role');
};

const markMessageAsRead = async () => {
  // Placeholder until read receipts are added to the message schema.
  return null;
};

const markMessagesDelivered = async ({ userId, messageIds = [] }) => {
  const ids = [...new Set(messageIds.map(String).filter(Boolean))];
  if (!ids.length) return [];

  const deliveredAt = new Date();
  await ChatMessage.updateMany(
    {
      _id: { $in: ids },
      receiverId: userId,
      status: { $ne: 'seen' }
    },
    {
      $set: {
        status: 'delivered',
        deliveredAt
      }
    }
  );

  return ChatMessage.find({ _id: { $in: ids }, receiverId: userId })
    .select('_id senderId receiverId status deliveredAt seenAt');
};

const markMessagesSeen = async ({ userId, otherUserId, messageIds = [] }) => {
  const filter = {
    receiverId: userId,
    senderId: otherUserId,
    status: { $ne: 'seen' }
  };

  if (messageIds.length) {
    filter._id = { $in: [...new Set(messageIds.map(String).filter(Boolean))] };
  }

  const seenAt = new Date();
  const messages = await ChatMessage.find(filter).select('_id senderId receiverId');
  if (!messages.length) return [];

  await ChatMessage.updateMany(
    { _id: { $in: messages.map((message) => message._id) } },
    {
      $set: {
        status: 'seen',
        deliveredAt: seenAt,
        seenAt
      }
    }
  );

  return messages.map((message) => ({
    _id: message._id,
    senderId: message.senderId,
    receiverId: message.receiverId,
    status: 'seen',
    deliveredAt: seenAt,
    seenAt
  }));
};

module.exports = {
  sendMessage,
  getMessages,
  deleteMessageForUser,
  applyMessageReaction,
  markMessageAsRead,
  markMessagesDelivered,
  markMessagesSeen
};
