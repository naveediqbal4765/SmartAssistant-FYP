const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['chat', 'chat_message', 'group_message', 'task', 'system'],
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  callSessionId: {
    type: mongoose.Schema.Types.ObjectId
  },
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId
  },
  entityType: {
    type: String,
    trim: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, conversationId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, groupId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, taskId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, emergencyId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, entityType: 1, entityId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', NotificationSchema);
