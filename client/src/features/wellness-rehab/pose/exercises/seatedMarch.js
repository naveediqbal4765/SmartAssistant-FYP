// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
// Exercise: Seated March
// Camera: Front facing (full legs visible while seated)
// Landmarks used:
//   Left hip: 23, Right hip: 24
//   Left knee: 25, Right knee: 26
//   Left ankle: 27, Right ankle: 28
// Detection: Tracks alternating knee lifts by measuring
// hip flexion angle on each side independently.
import { calculateAngle, calculatePoseScore, getLandmark } from '../poseUtils';

export const detectSeatedMarch = (landmarks, repState = { count: 0, phase: 'rest' }) => {
  const leftHip = getLandmark(landmarks, 23);
  const rightHip = getLandmark(landmarks, 24);
  const leftKnee = getLandmark(landmarks, 25);
  const rightKnee = getLandmark(landmarks, 26);
  const leftAnkle = getLandmark(landmarks, 27);
  const rightAnkle = getLandmark(landmarks, 28);

  if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) {
    return {
      angle: 0,
      phase: repState.phase || 'rest',
      count: repState.count || 0,
      poseScore: 0,
      side: 'alternating'
    };
  }

  const leftAngle = calculateAngle(leftAnkle, leftKnee, leftHip);
  const rightAngle = calculateAngle(rightAnkle, rightKnee, rightHip);
  const activeAngle = Math.min(leftAngle, rightAngle);
  let phase = repState.phase || 'rest';
  let count = repState.count || 0;

  if (leftAngle < 80) {
    phase = 'left-up';
  } else if (rightAngle < 80) {
    phase = 'right-up';
  } else if (leftAngle > 100 && rightAngle > 100) {
    if (repState.phase === 'left-up' || repState.phase === 'right-up') count += 1;
    phase = 'rest';
  }

  return {
    angle: activeAngle,
    phase,
    count,
    poseScore: calculatePoseScore(70, activeAngle, 15),
    side: 'alternating'
  };
};
