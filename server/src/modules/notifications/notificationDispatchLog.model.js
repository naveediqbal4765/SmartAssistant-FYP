const mongoose = require('mongoose');

const NotificationDispatchLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  type: {
    type: String,
    default: null
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  error: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

NotificationDispatchLogSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('NotificationDispatchLog', NotificationDispatchLogSchema);
