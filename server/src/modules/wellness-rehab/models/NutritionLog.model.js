// Module: Wellness & Rehabilitation | Phase 0 — Foundation
const mongoose = require('mongoose');

const NutritionLogSchema = new mongoose.Schema({
  senior_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  meal_type: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true
  },
  food_name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: String,
    trim: true
  },
  calories: {
    type: Number,
    min: 0
  },
  protein: {
    type: Number,
    min: 0
  },
  carbs: {
    type: Number,
    min: 0
  },
  fat: {
    type: Number,
    min: 0
  },
  logged_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('NutritionLog', NutritionLogSchema);
