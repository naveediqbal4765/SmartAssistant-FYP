// Module: Wellness & Rehabilitation | Phase 0 — Foundation
const mongoose = require('mongoose');

const WellnessExerciseSchema = new mongoose.Schema({
  session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WellnessSession',
    required: true,
    index: true
  },
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
  duration: {
    type: Number,
    min: 0
  },
  calories_burned: {
    type: Number,
    min: 0
  },
  pose_score: {
    type: Number,
    min: 0,
    max: 100
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('WellnessExercise', WellnessExerciseSchema);
