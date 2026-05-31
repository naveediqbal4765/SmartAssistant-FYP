// Module: Wellness & Rehabilitation | Phase 0 — Foundation
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

router.get('/sessions/:seniorId', auth, getSessionsBySenior);
router.post('/sessions/start', auth, startSession);
router.put('/sessions/:sessionId/complete', auth, completeSession);
router.get('/exercises/library', auth, getExerciseLibrary);
router.post('/nutrition/log', auth, logNutrition);
router.get('/nutrition/:seniorId', auth, getNutritionBySenior);
router.get('/recommendations/:seniorId', auth, getRecommendationsBySenior);

module.exports = router;
