const mongoose = require('mongoose');
const chatService = require('./chat.service');
const { emitMessageDeleted, emitNewMessage } = require('../sockets/socket.manager');
const notificationService = require('../notifications/notification.service');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, messageType, mediaUrl, duration } = req.body;

    if (!receiverId || !isValidObjectId(receiverId)) {
      return res.status(400).json({ success: false, msg: 'Valid receiverId is required' });
    }

    if (!message && !mediaUrl) {
      return res.status(400).json({ success: false, msg: 'Message or media is required' });
    }

    const chatMessage = await chatService.sendMessage({
      senderId: req.user._id,
      receiverId,
      message,
      messageType,
      mediaUrl,
      duration
    });

    emitNewMessage(chatMessage);

    try {
      const conversationId = chatMessage.$locals?.conversation?._id;
      await notificationService.createNotification({
        userId: receiverId,
        type: 'chat_message',
        title: `New message from ${req.user.name || 'Someone'}`,
        message: message || 'Sent an attachment',
        conversationId,
        fromUserId: req.user._id,
        toUserId: receiverId
      });
    } catch (notificationErr) {
      console.error('Chat notification failed:', notificationErr.message);
    }

    return res.status(201).json({ success: true, message: chatMessage });
  } catch (err) {
    console.error('Send chat message error:', err);
    return res.status(err.status || 500).json({ success: false, msg: err.status ? err.message : 'Server error' });
  }
};

const getMessages = async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    if (!otherUserId || !isValidObjectId(otherUserId)) {
      return res.status(400).json({ success: false, msg: 'Valid userId is required' });
    }

    const messages = await chatService.getMessages(req.user._id, otherUserId);

    return res.json({ success: true, messages });
  } catch (err) {
    console.error('Fetch chat messages error:', err);
    return res.status(err.status || 500).json({ success: false, msg: err.status ? err.message : 'Server error' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized delete request' });
    }

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, msg: 'Valid message id is required' });
    }

    await chatService.deleteMessageForUser(messageId, req.user._id);
    emitMessageDeleted({
      userId: req.user._id,
      messageId,
      chatType: 'private'
    });

    return res.json({ success: true, msg: 'Message deleted successfully', messageId });
  } catch (err) {
    console.error('Delete chat message error:', err);
    return res.status(err.status || 500).json({ success: false, msg: err.status ? err.message : 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  deleteMessage
};
