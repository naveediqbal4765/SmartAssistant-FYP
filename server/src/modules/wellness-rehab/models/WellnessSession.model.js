// Module: Wellness & Rehabilitation | Phase 0 — Foundation
const mongoose = require('mongoose');

const WellnessSessionSchema = new mongoose.Schema({
  senior_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  exercise_type: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  started_at: {
    type: Date,
    default: Date.now
  },
  ended_at: {
    type: Date
  },
  duration: {
    type: Number,
    min: 0
  },
  calories_burned: {
    type: Number,
    min: 0
  },
  avg_pose_score: {
    type: Number,
    min: 0,
    max: 100
  },
  corrections_count: {
    type: Number,
    default: 0,
    min: 0
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WellnessSession', WellnessSessionSchema);
