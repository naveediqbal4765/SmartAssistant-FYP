// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
const ExerciseLibrary = require('../models/ExerciseLibrary.model');

const exerciseLibrarySeedData = [
  {
    name: 'Shoulder Raise',
    category: 'mobility',
    difficulty: 'beginner',
    target_area: 'shoulders',
    instructions: [
      'Sit or stand tall with your arms relaxed at your sides.',
      'Slowly raise both shoulders toward your ears without straining.',
      'Lower your shoulders gently and repeat at a comfortable pace.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 8
  },
  {
    name: 'Arm Extension',
    category: 'mobility',
    difficulty: 'beginner',
    target_area: 'arms',
    instructions: [
      'Sit upright with your feet flat on the floor.',
      'Extend one arm forward until it feels comfortably straight.',
      'Bring the arm back slowly and repeat with the other arm.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 7
  },
  {
    name: 'Neck Stretch',
    category: 'stretching',
    difficulty: 'beginner',
    target_area: 'neck',
    instructions: [
      'Sit tall and keep your shoulders relaxed.',
      'Gently tilt your head toward one shoulder until you feel a light stretch.',
      'Hold briefly, return to center, and repeat on the other side.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 5
  },
  {
    name: 'Leg Raise',
    category: 'strength',
    difficulty: 'beginner',
    target_area: 'legs',
    instructions: [
      'Sit securely in a chair with your back supported.',
      'Slowly lift one leg forward until your knee is comfortably straight.',
      'Lower the leg with control and repeat with the other leg.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 10
  },
  {
    name: 'Sit To Stand',
    category: 'strength',
    difficulty: 'beginner',
    target_area: 'full body',
    instructions: [
      'Sit near the front of a sturdy chair with feet flat on the floor.',
      'Lean forward slightly and stand up slowly using your legs.',
      'Sit back down with control and rest when needed.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 12
  },
  {
    name: 'Deep Breathing',
    category: 'breathing',
    difficulty: 'beginner',
    target_area: 'lungs',
    instructions: [
      'Sit comfortably and place one hand on your belly.',
      'Breathe in slowly through your nose for a few seconds.',
      'Breathe out gently through your mouth and relax your shoulders.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 6
  },
  {
    name: 'Seated March',
    category: 'mobility',
    difficulty: 'beginner',
    target_area: 'legs',
    instructions: [
      'Sit upright in a sturdy chair with feet flat on the floor.',
      'Lift one knee slightly as if marching in place.',
      'Lower it gently and alternate legs at a steady pace.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 9
  },
  {
    name: 'Wrist Rotation',
    category: 'mobility',
    difficulty: 'beginner',
    target_area: 'wrists',
    instructions: [
      'Hold both hands in front of you at a comfortable height.',
      'Rotate your wrists slowly in small circles.',
      'Change direction and continue without forcing the movement.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 5
  },
  {
    name: 'Ankle Circles',
    category: 'mobility',
    difficulty: 'beginner',
    target_area: 'ankles',
    instructions: [
      'Sit safely with one foot slightly lifted from the floor.',
      'Move your ankle in slow circles in one direction.',
      'Switch direction, then repeat with the other ankle.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 6
  },
  {
    name: 'Wall Push',
    category: 'strength',
    difficulty: 'beginner',
    target_area: 'arms and chest',
    instructions: [
      'Stand facing a wall with your hands placed at chest height.',
      'Bend your elbows slowly and bring your chest closer to the wall.',
      'Push back gently until your arms are straight again.'
    ],
    thumbnail: '',
    video_url: '',
    estimated_duration: 10
  }
];

const seedExerciseLibrary = async () => {
  const operations = exerciseLibrarySeedData.map((exercise) => ({
    updateOne: {
      filter: { name: exercise.name },
      update: { $setOnInsert: exercise },
      upsert: true
    }
  }));

  return ExerciseLibrary.bulkWrite(operations);
};

module.exports = {
  exerciseLibrarySeedData,
  seedExerciseLibrary
};
