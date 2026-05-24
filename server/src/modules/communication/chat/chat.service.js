const ChatMessage = require('./chat.model');

const sendMessage = async (data) => {
  const chatMessage = new ChatMessage({
    senderId: data.senderId,
    receiverId: data.receiverId,
    message: data.message || '',
    messageType: data.messageType || 'text',
    mediaUrl: data.mediaUrl || ''
  });

  await chatMessage.save();
  return chatMessage;
};

const getMessages = async (userId, otherUserId) => {
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
