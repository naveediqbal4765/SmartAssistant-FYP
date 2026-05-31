// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
const WellnessSession = require('../models/WellnessSession.model');
const ExerciseLibrary = require('../models/ExerciseLibrary.model');
const { seedExerciseLibrary } = require('../seeders/exerciseLibrary.seed');

const getSessionsBySenior = async (req, res) => {
  try {
    const sessions = await WellnessSession.find({ senior_id: req.params.seniorId })
      .sort({ created_at: -1 });

    return res.json({
      success: true,
      sessions
    });
  } catch (err) {
    console.error('Fetch wellness sessions error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const startSession = async (req, res) => {
  try {
    const { senior_id, exercise_type } = req.body;

    if (!senior_id || !exercise_type) {
      return res.status(400).json({ success: false, msg: 'Senior id and exercise type are required' });
    }

    const session = await WellnessSession.create({
      senior_id,
      exercise_type,
      status: 'active'
    });

    return res.status(201).json({
      success: true,
      session
    });
  } catch (err) {
    console.error('Start wellness session error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const completeSession = async (req, res) => {
  try {
    const { duration, calories_burned, avg_pose_score } = req.body;

    const session = await WellnessSession.findByIdAndUpdate(
      req.params.sessionId,
      {
        status: 'completed',
        ended_at: new Date(),
        duration,
        calories_burned,
        avg_pose_score
      },
      { new: true, runValidators: true }
    );

    if (!session) {
      return res.status(404).json({ success: false, msg: 'Wellness session not found' });
    }

    return res.json({
      success: true,
      session
    });
  } catch (err) {
    console.error('Complete wellness session error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getExerciseLibrary = async (req, res) => {
  try {
    await seedExerciseLibrary();
    const exercises = await ExerciseLibrary.find().sort({ name: 1 });
    return res.json({
      success: true,
      exercises
    });
  } catch (err) {
    console.error('Fetch exercise library error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const logNutrition = (req, res) => {
  // TODO: Implement nutrition logging in a later phase.
  return res.status(201).json({
    success: true,
    msg: 'Nutrition log endpoint ready',
    nutritionLog: null
  });
};

const getNutritionBySenior = (req, res) => {
  // TODO: Implement nutrition history in a later phase.
  return res.json({
    success: true,
    msg: 'Nutrition history endpoint ready',
    seniorId: req.params.seniorId,
    nutritionLogs: []
  });
};

const getRecommendationsBySenior = (req, res) => {
  // TODO: Implement recommendations in a later phase.
  return res.json({
    success: true,
    msg: 'AI recommendations endpoint ready',
    seniorId: req.params.seniorId,
    recommendations: []
  });
};

module.exports = {
  getSessionsBySenior,
  startSession,
  completeSession,
  getExerciseLibrary,
  logNutrition,
  getNutritionBySenior,
  getRecommendationsBySenior
};
