const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  message: {
    type: String,
    default: ''
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'video', 'file', 'document', 'voice', 'call'],
    default: 'text'
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  mimeType: {
    type: String,
    default: ''
  },
  size: {
    type: Number,
    default: null
  },
  duration: {
    type: Number,
    default: null
  },
  repliedToMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatMessage'
  },
  repliedToPreview: {
    type: String,
    default: ''
  },
  repliedToSender: {
    type: String,
    default: ''
  },
  forwardedFrom: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  deletedFor: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: []
  },
  reactions: {
    type: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      type: {
        type: String,
        enum: ['like', 'heart', 'haha', 'sad'],
        required: true
      },
      emoji: {
        type: String,
        default: ''
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent',
    index: true
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  seenAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

ChatMessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
ChatMessageSchema.index({ receiverId: 1, senderId: 1, createdAt: 1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
