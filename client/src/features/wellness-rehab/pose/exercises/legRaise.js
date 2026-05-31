// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
// Exercise: Leg Raise
// Camera: Side facing (either side)
// Landmarks used:
//   Left hip: 23, Right hip: 24
//   Left knee: 25, Right knee: 26
//   Left ankle: 27, Right ankle: 28
// Detection: Measures hip flexion angle to detect leg raise
// while lying down. Uses whichever side is more visible.
import { calculateAngle, calculatePoseScore, getLandmark } from '../poseUtils';

export const detectLegRaise = (landmarks, repState = { count: 0, phase: 'down' }) => {
  const leftShoulder = getLandmark(landmarks, 11);
  const rightShoulder = getLandmark(landmarks, 12);
  const leftHip = getLandmark(landmarks, 23);
  const rightHip = getLandmark(landmarks, 24);
  const leftKnee = getLandmark(landmarks, 25);
  const rightKnee = getLandmark(landmarks, 26);
  const leftAnkle = getLandmark(landmarks, 27);
  const rightAnkle = getLandmark(landmarks, 28);
  const useLeft = Number(leftHip?.visibility || 0) > Number(rightHip?.visibility || 0);
  const shoulder = useLeft ? leftShoulder : rightShoulder;
  const hip = useLeft ? leftHip : rightHip;
  const knee = useLeft ? leftKnee : rightKnee;
  const ankle = useLeft ? leftAnkle : rightAnkle;

  if (!shoulder || !hip || !knee || !ankle) {
    return {
      angle: 0,
      phase: repState.phase || 'down',
      count: repState.count || 0,
      poseScore: 0,
      side: useLeft ? 'left' : 'right'
    };
  }

  const hipAngle = calculateAngle(shoulder, hip, knee);
  let phase = repState.phase || 'down';
  let count = repState.count || 0;

  if (hipAngle < 120) {
    phase = 'up';
  } else if (hipAngle > 150) {
    if (repState.phase === 'up') count += 1;
    phase = 'down';
  }

  return {
    angle: hipAngle,
    phase,
    count,
    poseScore: calculatePoseScore(90, hipAngle, 15),
    side: useLeft ? 'left' : 'right'
  };
};
