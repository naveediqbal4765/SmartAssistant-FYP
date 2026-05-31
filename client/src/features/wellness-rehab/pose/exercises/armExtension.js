// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
import { calculateAngle, calculatePoseScore, getLandmark } from '../poseUtils';

export const detectArmExtension = (landmarks, repState = { count: 0, phase: 'bent' }) => {
  const leftShoulder = getLandmark(landmarks, 11);
  const leftElbow = getLandmark(landmarks, 13);
  const leftWrist = getLandmark(landmarks, 15);
  const rightShoulder = getLandmark(landmarks, 12);
  const rightElbow = getLandmark(landmarks, 14);
  const rightWrist = getLandmark(landmarks, 16);

  const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
  const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
  const avgAngle = Number(((leftAngle + rightAngle) / 2).toFixed(1));
  let phase = repState.phase || 'bent';
  let count = repState.count || 0;

  if (avgAngle > 150) {
    phase = 'extended';
  } else if (avgAngle < 90) {
    if (repState.phase === 'extended') count += 1;
    phase = 'bent';
  }

  return {
    angle: avgAngle,
    phase,
    count,
    poseScore: calculatePoseScore(170, avgAngle, 15),
    side: 'both'
  };
};
