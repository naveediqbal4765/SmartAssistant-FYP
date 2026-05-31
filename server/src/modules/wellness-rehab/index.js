// Module: Wellness & Rehabilitation | Phase 0 — Foundation
const router = require('./routes/wellness.routes');
const WellnessSession = require('./models/WellnessSession.model');
const WellnessExercise = require('./models/WellnessExercise.model');
const ExerciseLibrary = require('./models/ExerciseLibrary.model');
const NutritionLog = require('./models/NutritionLog.model');
const AIRecommendations = require('./models/AIRecommendations.model');

module.exports = {
  router,
  models: {
    WellnessSession,
    WellnessExercise,
    ExerciseLibrary,
    NutritionLog,
    AIRecommendations
  }
};
