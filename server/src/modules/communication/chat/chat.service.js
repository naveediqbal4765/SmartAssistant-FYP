const ChatMessage = require('./chat.model');
const conversationService = require('./conversation.service');
const User = require('../../../shared/models/User');

const VALID_REACTION_TYPES = new Set(['like', 'heart', 'haha', 'sad']);

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
  const preview = original.messageType === 'voice'
    ? '🎤 Voice Message'
    : (original.message || 'Attachment');

  return {
    repliedToMessageId: original._id,
    repliedToPreview: preview.length > 120 ? `${preview.slice(0, 117)}...` : preview,
    repliedToSender: originalSender?.name || 'Member'
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
    duration: data.duration || null,
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

  if (message.messageType !== expectedMessageType) {
    const err = new Error(expectedMessageType === 'voice' ? 'Voice note not found' : 'Text message not found');
    err.status = 404;
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
    message.reactions[existingIndex].createdAt = new Date();
  } else {
    message.reactions.push({
      userId,
      type: reactionType,
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

module.exports = {
  sendMessage,
  getMessages,
  deleteMessageForUser,
  applyMessageReaction,
  markMessageAsRead
};
