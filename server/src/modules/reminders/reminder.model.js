const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  seniorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  targetUserName: {
    type: String,
    required: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  reminderText: {
    type: String,
    trim: true
  },
  scheduledAt: {
    type: Date,
    index: true
  },
  scheduledTime: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'triggered', 'cancelled'],
    default: 'active',
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

ReminderSchema.index({ seniorId: 1, scheduledTime: 1 });
ReminderSchema.index({ userId: 1, status: 1, scheduledAt: 1 });
ReminderSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Reminder', ReminderSchema);
