// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
const WellnessSession = require('../models/WellnessSession.model');
const ExerciseLibrary = require('../models/ExerciseLibrary.model');
const NutritionLog = require('../models/NutritionLog.model');
const Telemetry = require('../../health/telemetry/telemetry.model');
const { seedExerciseLibrary } = require('../seeders/exerciseLibrary.seed');
const foodSearchService = require('../services/foodSearch.service');

const emptyNutritionGroups = () => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
  totals: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }
});

const toDateRange = (dateKey) => {
  const normalizedDate = dateKey || new Date().toISOString().slice(0, 10);
  const start = new Date(`${normalizedDate}T00:00:00.000Z`);
  const end = new Date(`${normalizedDate}T23:59:59.999Z`);

  return { normalizedDate, start, end };
};

const roundOne = (value) => Number(Number(value || 0).toFixed(1));

const getTelemetryValue = (telemetry, key) => {
  if (!telemetry) return undefined;
  if (telemetry[key] !== undefined) return telemetry[key];
  if (telemetry.vitals?.[key] !== undefined) return telemetry.vitals[key];
  if (telemetry.data?.[key] !== undefined) return telemetry.data[key];
  if (telemetry.payload?.[key] !== undefined) return telemetry.payload[key];
  return undefined;
};

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
    const { duration, calories_burned, avg_pose_score, corrections_count } = req.body;

    const session = await WellnessSession.findByIdAndUpdate(
      req.params.sessionId,
      {
        status: 'completed',
        ended_at: new Date(),
        duration,
        calories_burned,
        avg_pose_score,
        corrections_count: corrections_count || 0
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

const searchFood = async (req, res) => {
  try {
    const results = await foodSearchService.searchFood(req.query.name);
    if (!results.length) {
      return res.json({
        success: true,
        results: [],
        message: 'No results found. Please enter nutrition values manually.'
      });
    }

    return res.json({
      success: true,
      results
    });
  } catch (err) {
    console.error('Food search error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const logNutrition = async (req, res) => {
  try {
    const {
      senior_id,
      meal_type,
      food_name,
      quantity,
      calories,
      protein,
      carbs,
      fat
    } = req.body;

    if (!senior_id || !meal_type || !food_name) {
      return res.status(400).json({ success: false, msg: 'Senior id, meal type, and food name are required' });
    }

    const nutritionLog = await NutritionLog.create({
      senior_id,
      meal_type,
      food_name,
      quantity: quantity || '',
      calories: roundOne(calories),
      protein: roundOne(protein),
      carbs: roundOne(carbs),
      fat: roundOne(fat)
    });

    return res.status(201).json({
      success: true,
      nutritionLog
    });
  } catch (err) {
    console.error('Nutrition log error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getNutritionBySenior = async (req, res) => {
  try {
    const { normalizedDate, start, end } = toDateRange(req.query.date);
    const logs = await NutritionLog.find({
      senior_id: req.params.seniorId,
      logged_at: { $gte: start, $lt: end }
    }).sort({ logged_at: 1 });

    const grouped = emptyNutritionGroups();
    logs.forEach((log) => {
      const mealType = log.meal_type;
      if (grouped[mealType]) grouped[mealType].push(log);

      grouped.totals.calories += Number(log.calories || 0);
      grouped.totals.protein += Number(log.protein || 0);
      grouped.totals.carbs += Number(log.carbs || 0);
      grouped.totals.fat += Number(log.fat || 0);
    });

    grouped.totals = {
      calories: roundOne(grouped.totals.calories),
      protein: roundOne(grouped.totals.protein),
      carbs: roundOne(grouped.totals.carbs),
      fat: roundOne(grouped.totals.fat)
    };

    return res.json({
      success: true,
      date: normalizedDate,
      ...grouped
    });
  } catch (err) {
    console.error('Nutrition history error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getRecommendationsBySenior = async (req, res) => {
  try {
    const latestTelemetry = await Telemetry.findOne({ userId: req.params.seniorId })
      .sort({ recordedAt: -1, createdAt: -1 })
      .lean();
    const suggestions = [];

    if (!latestTelemetry) {
      suggestions.push({
        type: 'general',
        message: 'Stay hydrated and eat balanced meals throughout the day.'
      });
    } else {
      const heartRate = Number(getTelemetryValue(latestTelemetry, 'heartRate'));
      const oxygenLevel = Number(getTelemetryValue(latestTelemetry, 'oxygenLevel'));
      const temperature = Number(getTelemetryValue(latestTelemetry, 'temperature'));
      const activityStatus = getTelemetryValue(latestTelemetry, 'activityStatus');

      if (heartRate > 100) {
        suggestions.push({ type: 'hydration', message: 'Your heart rate is elevated. Drink water and avoid caffeine.' });
      }

      if (heartRate < 55) {
        suggestions.push({ type: 'nutrition', message: 'Low heart rate detected. Eat a light balanced meal.' });
      }

      if (oxygenLevel < 95) {
        suggestions.push({ type: 'nutrition', message: 'Low oxygen detected. Avoid heavy meals and stay upright.' });
      }

      if (temperature >= 37.5) {
        suggestions.push({ type: 'hydration', message: 'Slight fever detected. Increase fluid intake.' });
      }

      if (activityStatus === 'Sedentary' || activityStatus === 'Resting') {
        suggestions.push({ type: 'activity', message: 'You have been inactive. Consider a light snack and short walk.' });
      }

      if (!suggestions.length) {
        suggestions.push({
          type: 'general',
          message: 'Stay hydrated and eat balanced meals throughout the day.'
        });
      }
    }

    suggestions.push(
      { type: 'hydration', message: 'Drink at least 8 glasses of water today.' },
      { type: 'nutrition', message: 'Include fruits and vegetables in every meal.' }
    );

    return res.json({
      success: true,
      suggestions
    });
  } catch (err) {
    console.error('Nutrition suggestions error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

module.exports = {
  getSessionsBySenior,
  startSession,
  completeSession,
  getExerciseLibrary,
  searchFood,
  logNutrition,
  getNutritionBySenior,
  getRecommendationsBySenior
};
