const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  volunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedVolunteerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedVolunteerName: {
    type: String,
    default: '',
    trim: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['medical', 'grocery', 'transport', 'household', 'companionship', 'emergency', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  location: {
    address: String,
    lat: Number,
    lng: Number,
    googleMapsUrl: String,
    coordinates: {
      lat: Number,
    lng: Number
    }
  },
  pickupLocation: {
    address: { type: String, default: '' },
    lat: Number,
    lng: Number,
    googleMapsUrl: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  dropLocation: {
    address: { type: String, default: '' },
    lat: Number,
    lng: Number,
    googleMapsUrl: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  ignoredBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: [
      'pending',
      'accepted',
      'in_progress',
      'completed_pending_verification',
      'verified_completed',
      'completed',
      'verified',
      'closed',
      'cancelled'
    ],
    default: 'pending'
  },
  scheduledTime: {
    type: Date,
    default: null
  },
  completionProof: {
    photo: String,
    note: String,
    completedAt: Date
  },
  verification: {
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      default: '',
      trim: true
    },
    verifiedAt: {
      type: Date,
      default: null
    }
  },
  stateTimestamps: {
    pendingAt: Date,
    acceptedAt: Date,
    inProgressAt: Date,
    completedAt: Date,
    verifiedAt: Date,
    closedAt: Date,
    cancelledAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ status: 1, createdAt: -1 });
TaskSchema.index({ volunteerId: 1 });
TaskSchema.index({ assignedVolunteerId: 1 });
TaskSchema.index({ ignoredBy: 1 });

module.exports = mongoose.model('Task', TaskSchema);