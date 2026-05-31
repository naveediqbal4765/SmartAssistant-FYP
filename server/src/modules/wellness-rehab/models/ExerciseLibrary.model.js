// Module: Wellness & Rehabilitation | Phase 0 — Foundation
const mongoose = require('mongoose');

const ExerciseLibrarySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['mobility', 'strength', 'balance', 'breathing', 'stretching']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced']
  },
  target_area: {
    type: String,
    trim: true
  },
  instructions: {
    type: [String],
    default: []
  },
  thumbnail: {
    type: String,
    trim: true
  },
  video_url: {
    type: String,
    trim: true
  },
  estimated_duration: {
    type: Number,
    min: 0
  }
});

module.exports = mongoose.model('ExerciseLibrary', ExerciseLibrarySchema);
