// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
const router = require('./routes/wellness.routes');
const WellnessSession = require('./models/WellnessSession.model');
const WellnessExercise = require('./models/WellnessExercise.model');
const ExerciseLibrary = require('./models/ExerciseLibrary.model');
const NutritionLog = require('./models/NutritionLog.model');
const AIRecommendations = require('./models/AIRecommendations.model');
const { seedExerciseLibrary } = require('./seeders/exerciseLibrary.seed');

module.exports = {
  router,
  models: {
    WellnessSession,
    WellnessExercise,
    ExerciseLibrary,
    NutritionLog,
    AIRecommendations
  },
  seeders: {
    seedExerciseLibrary
  }
};
