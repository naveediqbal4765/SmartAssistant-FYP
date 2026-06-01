// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
const express = require('express');
const auth = require('../../../middleware/auth');
const {
  getSessionsBySenior,
  startSession,
  completeSession,
  getStreak,
  getExerciseLibrary,
  searchFood,
  logNutrition,
  getNutritionBySenior,
  deleteNutritionLog,
  clearNutritionLogs,
  getRecommendationsBySenior
} = require('../controllers/wellness.controller');

const router = express.Router();

router.get('/exercises/library', getExerciseLibrary);
router.get('/food/search', searchFood);
router.post('/sessions/start', auth, startSession);
router.put('/sessions/:sessionId/complete', auth, completeSession);
router.get('/sessions/:seniorId', auth, getSessionsBySenior);
router.get('/streak/:seniorId', auth, getStreak);
router.post('/nutrition/log', auth, logNutrition);
router.delete('/nutrition/log/:logId', auth, deleteNutritionLog);
router.delete('/nutrition/clear/:seniorId', auth, clearNutritionLogs);
router.get('/nutrition/:seniorId', auth, getNutritionBySenior);
router.get('/recommendations/:seniorId', auth, getRecommendationsBySenior);

module.exports = router;
