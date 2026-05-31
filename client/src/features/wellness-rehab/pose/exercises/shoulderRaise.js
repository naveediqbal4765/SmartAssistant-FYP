// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
import { calculateAngle, calculatePoseScore, getLandmark } from '../poseUtils';

export const detectShoulderRaise = (landmarks, repState = { count: 0, phase: 'down' }) => {
  const leftShoulder = getLandmark(landmarks, 11);
  const leftElbow = getLandmark(landmarks, 13);
  const leftHip = getLandmark(landmarks, 23);
  const rightShoulder = getLandmark(landmarks, 12);
  const rightElbow = getLandmark(landmarks, 14);
  const rightHip = getLandmark(landmarks, 24);

  const leftAngle = calculateAngle(leftHip, leftShoulder, leftElbow);
  const rightAngle = calculateAngle(rightHip, rightShoulder, rightElbow);
  const avgAngle = Number(((leftAngle + rightAngle) / 2).toFixed(1));
  let phase = repState.phase || 'down';
  let count = repState.count || 0;

  if (avgAngle > 80) {
    phase = 'up';
  } else if (avgAngle < 30) {
    if (repState.phase === 'up') count += 1;
    phase = 'down';
  }

  return {
    angle: avgAngle,
    phase,
    count,
    poseScore: calculatePoseScore(90, avgAngle, 15),
    side: 'both'
  };
};
