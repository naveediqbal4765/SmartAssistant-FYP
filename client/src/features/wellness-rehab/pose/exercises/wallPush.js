// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
// Exercise: Wall Push
// Camera: Side facing
// Landmarks used:
//   Left shoulder: 11, Right shoulder: 12
//   Left elbow: 13, Right elbow: 14
//   Left wrist: 15, Right wrist: 16
// Detection: Measures elbow angle to detect push (extension)
// and return (flexion). Uses whichever side is more visible.
import { calculateAngle, calculatePoseScore, getLandmark } from '../poseUtils';

export const detectWallPush = (landmarks, repState = { count: 0, phase: 'bent' }) => {
  const leftShoulder = getLandmark(landmarks, 11);
  const rightShoulder = getLandmark(landmarks, 12);
  const leftElbow = getLandmark(landmarks, 13);
  const rightElbow = getLandmark(landmarks, 14);
  const leftWrist = getLandmark(landmarks, 15);
  const rightWrist = getLandmark(landmarks, 16);
  const useLeft = Number(leftShoulder?.visibility || leftElbow?.visibility || 0) > Number(rightShoulder?.visibility || rightElbow?.visibility || 0);
  const shoulder = useLeft ? leftShoulder : rightShoulder;
  const elbow = useLeft ? leftElbow : rightElbow;
  const wrist = useLeft ? leftWrist : rightWrist;

  if (!shoulder || !elbow || !wrist) {
    return {
      angle: 0,
      phase: repState.phase || 'bent',
      count: repState.count || 0,
      poseScore: 0,
      side: useLeft ? 'left' : 'right'
    };
  }

  const elbowAngle = calculateAngle(shoulder, elbow, wrist);
  let phase = repState.phase || 'bent';
  let count = repState.count || 0;

  if (elbowAngle > 150) {
    phase = 'extended';
  } else if (elbowAngle < 90) {
    if (repState.phase === 'extended') count += 1;
    phase = 'bent';
  }

  return {
    angle: elbowAngle,
    phase,
    count,
    poseScore: calculatePoseScore(160, elbowAngle, 15),
    side: useLeft ? 'left' : 'right'
  };
};
