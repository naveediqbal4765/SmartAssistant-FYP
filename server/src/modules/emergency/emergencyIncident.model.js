const mongoose = require('mongoose');

const EmergencyIncidentSchema = new mongoose.Schema({
  seniorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  seniorName: {
    type: String,
    default: 'Senior'
  },
  message: {
    type: String,
    required: true
  },
  location: {
    lat: Number,
    lng: Number
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'ACCEPTED'],
    default: 'ACTIVE',
    index: true
  },
  acceptedVolunteer: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    name: {
      type: String,
      default: null
    },
    acceptedAt: {
      type: Date,
      default: null
    }
  },
  recipients: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: String
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('EmergencyIncident', EmergencyIncidentSchema);
