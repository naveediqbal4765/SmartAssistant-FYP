const mongoose = require('mongoose');
const ChatMessage = require('./chat.model');
const chatService = require('./chat.service');
const { emitItemReactionUpdated, emitMessageDeleted, emitNewMessage } = require('../sockets/socket.manager');
const notificationService = require('../notifications/notification.service');

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const buildNotificationContent = async ({ chatMessage, senderName, receiverId, message }) => {
  if (!chatMessage.repliedToMessageId) {
    return {
      title: `New message from ${senderName}`,
      message: message || 'Sent an attachment'
    };
  }

  const originalMessage = await ChatMessage.findById(chatMessage.repliedToMessageId).select('senderId');
  if (originalMessage && String(originalMessage.senderId) === String(receiverId)) {
    return {
      title: `${senderName} replied to you`,
      message: message || chatMessage.repliedToPreview || 'Sent a reply'
    };
  }

  return {
    title: `New message from ${senderName}`,
    message: message || 'Sent an attachment'
  };
};

const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, messageType, mediaUrl, duration, repliedToMessageId } = req.body;

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
      duration,
      repliedToMessageId
    });

    emitNewMessage(chatMessage);

    try {
      const conversationId = chatMessage.$locals?.conversation?._id;
      const notificationContent = await buildNotificationContent({
        chatMessage,
        senderName: req.user.name || 'Someone',
        receiverId,
        message
      });
      await notificationService.createNotification({
        userId: receiverId,
        type: 'chat_message',
        title: notificationContent.title,
        message: notificationContent.message,
        conversationId,
        messageId: chatMessage._id,
        entityType: 'chat_message',
        entityId: chatMessage._id,
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
    const deleteType = req.body?.deleteType || 'forEveryone';

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized delete request' });
    }

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, msg: 'Valid message id is required' });
    }

    const { message, deleteType: resolvedDeleteType } = await chatService.deleteMessageForUser(messageId, req.user._id, deleteType);
    if (resolvedDeleteType === 'forEveryone') {
      emitMessageDeleted({
        userId: message.senderId,
        messageId,
        chatType: 'private',
        deleteType: resolvedDeleteType
      });
      emitMessageDeleted({
        userId: message.receiverId,
        messageId,
        chatType: 'private',
        deleteType: resolvedDeleteType
      });
    } else {
      emitMessageDeleted({
        userId: req.user._id,
        messageId,
        chatType: 'private',
        deleteType: resolvedDeleteType
      });
    }

    return res.json({ success: true, msg: 'Message deleted successfully', messageId, deleteType: resolvedDeleteType });
  } catch (err) {
    console.error('Delete chat message error:', err);
    return res.status(err.status || 500).json({ success: false, msg: err.status ? err.message : 'Server error' });
  }
};

const reactToMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { reactionType } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized reaction request' });
    }

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, msg: 'Valid message id is required' });
    }

    const message = await chatService.applyMessageReaction({
      messageId,
      userId: req.user._id,
      reactionType,
      expectedMessageType: 'text'
    });

    emitItemReactionUpdated({
      message,
      itemType: 'message',
      updatedBy: req.user._id
    });

    return res.json({ success: true, itemType: 'message', itemId: message._id, reactions: message.reactions });
  } catch (err) {
    console.error('React to message error:', err);
    return res.status(err.status || 500).json({ success: false, msg: err.status ? err.message : 'Server error' });
  }
};

const reactToVoiceNote = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { reactionType } = req.body;

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized reaction request' });
    }

    if (!messageId || !isValidObjectId(messageId)) {
      return res.status(400).json({ success: false, msg: 'Valid voice note id is required' });
    }

    const message = await chatService.applyMessageReaction({
      messageId,
      userId: req.user._id,
      reactionType,
      expectedMessageType: 'voice'
    });

    emitItemReactionUpdated({
      message,
      itemType: 'voiceNote',
      updatedBy: req.user._id
    });

    return res.json({ success: true, itemType: 'voiceNote', itemId: message._id, reactions: message.reactions });
  } catch (err) {
    console.error('React to voice note error:', err);
    return res.status(err.status || 500).json({ success: false, msg: err.status ? err.message : 'Server error' });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  deleteMessage,
  reactToMessage,
  reactToVoiceNote
};
