const mongoose = require('mongoose');
const chatService = require('./chat.service');
const { emitNewMessage } = require('../sockets/socket.manager');
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
      await notificationService.createNotification({
        userId: receiverId,
        type: 'chat',
        title: `New message from ${req.user.name || 'Someone'}`,
        message: message || 'Sent an attachment'
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

module.exports = {
  sendMessage,
  getMessages
};
