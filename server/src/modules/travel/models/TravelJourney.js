const mongoose = require('mongoose');

const TravelJourneySchema = new mongoose.Schema({
  seniorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  pickup: {
    address: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },

  destination: {
    address: { type: String, required: true },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },

  route: {
    geometry: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString'
      },
      coordinates: {
        type: [[Number]], // Array of [longitude, latitude]
        required: true
      }
    },
    distanceMeters: {
      type: Number,
      required: true,
      min: 0
    },
    estimatedDurationSeconds: {
      type: Number,
      required: true,
      min: 0
    }
  },

  status: {
    type: String,
    enum: ['planned', 'active', 'completed', 'cancelled'],
    default: 'planned',
    index: true
  },

  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: null
    }
  },

  lastLocationUpdateAt: {
    type: Date,
    default: null
  },

  caregiverLocationConsent: {
    type: Boolean,
    default: false
  },

  startedAt: {
    type: Date,
    default: null
  },

  completedAt: {
    type: Date,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Users who have hidden this journey from their history view
  // Journey is never deleted, only hidden per-user
  historyHiddenBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

// Indexes for efficient queries
TravelJourneySchema.index({ seniorId: 1, status: 1 });
TravelJourneySchema.index({ seniorId: 1, createdAt: -1 });
TravelJourneySchema.index({ 'pickup.coordinates': '2dsphere' });
TravelJourneySchema.index({ 'destination.coordinates': '2dsphere' });

// Partial unique index: only one active journey per senior at a time
TravelJourneySchema.index(
  { seniorId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' },
    name: 'one_active_journey_per_senior'
  }
);

module.exports = mongoose.model('TravelJourney', TravelJourneySchema);
