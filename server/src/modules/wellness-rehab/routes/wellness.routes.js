// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
const express = require('express');
const auth = require('../../../middleware/auth');
const {
  getSessionsBySenior,
  startSession,
  completeSession,
  getExerciseLibrary,
  logNutrition,
  getNutritionBySenior,
  getRecommendationsBySenior
} = require('../controllers/wellness.controller');

const router = express.Router();

router.get('/exercises/library', getExerciseLibrary);
router.post('/sessions/start', auth, startSession);
router.put('/sessions/:sessionId/complete', auth, completeSession);
router.get('/sessions/:seniorId', auth, getSessionsBySenior);
router.post('/nutrition/log', auth, logNutrition);
router.get('/nutrition/:seniorId', auth, getNutritionBySenior);
router.get('/recommendations/:seniorId', auth, getRecommendationsBySenior);

module.exports = router;
