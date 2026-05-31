// Module: Wellness & Rehabilitation | Phase 0 — Foundation
const mongoose = require('mongoose');

const AIRecommendationsSchema = new mongoose.Schema({
  senior_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recommendation_type: {
    type: String,
    enum: ['exercise', 'nutrition', 'rest', 'hydration']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    enum: ['telemetry', 'history', 'manual']
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AIRecommendations', AIRecommendationsSchema);
