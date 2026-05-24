const ChatMessage = require('./chat.model');
const conversationService = require('./conversation.service');

const sendMessage = async (data) => {
  await conversationService.assertCanCommunicate(data.senderId, data.receiverId);

  const chatMessage = new ChatMessage({
    senderId: data.senderId,
    receiverId: data.receiverId,
    message: data.message || '',
    messageType: data.messageType || 'text',
    mediaUrl: data.mediaUrl || '',
    duration: data.duration || null
  });

  await chatMessage.save();
  await conversationService.upsertConversationForMessage(chatMessage);

  return chatMessage;
};

const getMessages = async (userId, otherUserId) => {
  await conversationService.assertCanCommunicate(userId, otherUserId);

  return ChatMessage.find({
    $or: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId }
    ]
  }).sort({ createdAt: 1 });
};

const markMessageAsRead = async () => {
  // Placeholder until read receipts are added to the message schema.
  return null;
};

module.exports = {
  sendMessage,
  getMessages,
  markMessageAsRead
};
