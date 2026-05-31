// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
// Exercise: Sit To Stand
// Camera: Side facing (full body must be visible)
// Landmarks used:
//   Left hip: 23, Right hip: 24
//   Left knee: 25, Right knee: 26
//   Left ankle: 27, Right ankle: 28
//   Left shoulder: 11, Right shoulder: 12
// Detection: Measures knee angle to detect sitting vs standing.
// Uses whichever side is more visible.
import { calculateAngle, calculatePoseScore, getLandmark } from '../poseUtils';

export const detectSitToStand = (landmarks, repState = { count: 0, phase: 'sitting' }) => {
  const leftShoulder = getLandmark(landmarks, 11);
  const rightShoulder = getLandmark(landmarks, 12);
  const leftHip = getLandmark(landmarks, 23);
  const rightHip = getLandmark(landmarks, 24);
  const leftKnee = getLandmark(landmarks, 25);
  const rightKnee = getLandmark(landmarks, 26);
  const leftAnkle = getLandmark(landmarks, 27);
  const rightAnkle = getLandmark(landmarks, 28);
  const useLeft = Number(leftShoulder?.visibility || leftHip?.visibility || 0) > Number(rightShoulder?.visibility || rightHip?.visibility || 0);
  const hip = useLeft ? leftHip : rightHip;
  const knee = useLeft ? leftKnee : rightKnee;
  const ankle = useLeft ? leftAnkle : rightAnkle;

  if (!hip || !knee || !ankle) {
    return {
      angle: 0,
      phase: repState.phase || 'sitting',
      count: repState.count || 0,
      poseScore: 0,
      side: useLeft ? 'left' : 'right'
    };
  }

  const kneeAngle = calculateAngle(hip, knee, ankle);
  let phase = repState.phase || 'sitting';
  let count = repState.count || 0;

  if (kneeAngle > 160) {
    phase = 'standing';
  } else if (kneeAngle < 110) {
    if (repState.phase === 'standing') count += 1;
    phase = 'sitting';
  }

  return {
    angle: kneeAngle,
    phase,
    count,
    poseScore: calculatePoseScore(170, kneeAngle, 15),
    side: useLeft ? 'left' : 'right'
  };
};
