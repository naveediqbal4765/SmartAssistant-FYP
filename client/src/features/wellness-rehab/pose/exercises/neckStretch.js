// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
// Exercise: Neck Stretch
// Camera: Front facing
// Landmarks used:
//   Nose: 0
//   Left ear: 7
//   Right ear: 8
//   Left shoulder: 11
//   Right shoulder: 12
// Detection: Measures head tilt angle by comparing nose position
// relative to the midpoint between both shoulders
import { calculateAngle, calculatePoseScore, getLandmark } from '../poseUtils';

export const detectNeckStretch = (landmarks, repState = { count: 0, phase: 'center' }) => {
  const nose = getLandmark(landmarks, 0);
  const leftEar = getLandmark(landmarks, 7);
  const rightEar = getLandmark(landmarks, 8);
  const leftShoulder = getLandmark(landmarks, 11);
  const rightShoulder = getLandmark(landmarks, 12);

  if (!nose || !leftEar || !rightEar || !leftShoulder || !rightShoulder) {
    return {
      angle: 0,
      phase: repState.phase || 'center',
      count: repState.count || 0,
      poseScore: 0,
      side: 'neck'
    };
  }

  const midX = (leftShoulder.x + rightShoulder.x) / 2;
  const offset = nose.x - midX;
  let phase = 'center';
  let count = repState.count || 0;

  if (offset < -0.05) {
    phase = 'left';
  } else if (offset > 0.05) {
    phase = 'right';
  }

  if ((repState.phase === 'left' || repState.phase === 'right') && phase === 'center') {
    count += 1;
  }

  const tiltAngle = calculateAngle(leftEar, nose, rightShoulder);

  return {
    angle: tiltAngle,
    phase,
    count,
    poseScore: calculatePoseScore(90, tiltAngle, 20),
    side: 'neck'
  };
};
