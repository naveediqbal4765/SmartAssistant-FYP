const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  hiddenFor: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, enum: ['admin', 'member'], default: 'member' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const GroupJoinRequestSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  createdAt: { type: Date, default: Date.now }
});

const GroupMessageSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true, trim: true },
  message: { type: String, default: '' },
  messageType: { type: String, enum: ['text', 'voice'], default: 'text' },
  mediaUrl: { type: String, default: '' },
  deletedFor: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] },
  createdAt: { type: Date, default: Date.now, index: true }
});

GroupSchema.index({ 'members.userId': 1 });
GroupJoinRequestSchema.index({ groupId: 1, userId: 1, status: 1 });
GroupMessageSchema.index({ groupId: 1, createdAt: 1 });

const Group = mongoose.model('Group', GroupSchema);
const GroupJoinRequest = mongoose.model('GroupJoinRequest', GroupJoinRequestSchema);
const GroupMessage = mongoose.model('GroupMessage', GroupMessageSchema);

module.exports = {
  Group,
  GroupJoinRequest,
  GroupMessage
};
