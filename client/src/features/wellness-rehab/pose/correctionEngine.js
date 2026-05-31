// Module: Wellness & Rehabilitation | Phase 5 — Pose Correction
// Correction Engine: generates real-time feedback messages
// based on detected angle vs target angle per exercise.
// Messages are structured for Phase 6 TTS integration.

const createMessage = (message, severity, shouldSpeak) => ({
  message,
  severity,
  shouldSpeak
});

export const getCorrectionMessage = (exerciseType, angle, phase, poseScore) => {
  switch (exerciseType) {
    case 'shoulder-raise':
      if (poseScore >= 75) return createMessage('Excellent! Hold this position.', 'good', true);
      if (angle < 45) return createMessage('Raise your arm higher.', 'error', true);
      if (angle >= 45 && angle <= 75) return createMessage('Almost there. Lift a little more.', 'warning', true);
      if (angle > 110) return createMessage('Lower your arm slightly.', 'warning', true);
      return createMessage('Good. Keep going.', 'good', false);

    case 'arm-extension':
      if (poseScore >= 75) return createMessage('Perfect extension! Well done.', 'good', true);
      if (angle < 90) return createMessage('Extend your arm further.', 'error', true);
      if (angle >= 90 && angle <= 140) return createMessage('Keep extending your arm.', 'warning', true);
      if (angle > 175) return createMessage('Do not lock your elbow.', 'warning', true);
      return createMessage('Good movement. Continue.', 'good', false);

    case 'neck-stretch':
      if (poseScore >= 75 && phase !== 'center') return createMessage('Good stretch. Hold for a moment.', 'good', true);
      if (phase === 'center' && poseScore >= 75) return createMessage('Now tilt slowly to one side.', 'good', false);
      if (poseScore < 50) return createMessage('Tilt your head gently to the side.', 'warning', true);
      return createMessage('Good. Move slowly and gently.', 'good', false);

    case 'leg-raise':
      if (poseScore >= 75) return createMessage('Great lift! Keep your leg straight.', 'good', true);
      if (phase === 'down' && poseScore < 50) return createMessage('Raise your leg higher.', 'error', true);
      if (phase === 'up' && poseScore < 50) return createMessage('Try to straighten your leg more.', 'warning', true);
      return createMessage('Good. Slow and controlled.', 'good', false);

    case 'sit-to-stand':
      if (phase === 'standing' && poseScore >= 75) return createMessage('Well done! Stand tall.', 'good', true);
      if (phase === 'sitting' && poseScore >= 75) return createMessage('Good. Now stand up slowly.', 'good', true);
      if (phase === 'standing' && poseScore < 50) return createMessage('Straighten your legs fully.', 'warning', true);
      if (phase === 'sitting' && poseScore < 50) return createMessage('Sit back down slowly and safely.', 'warning', true);
      return createMessage('Move slowly. Take your time.', 'good', false);

    case 'seated-march':
      if (phase === 'left-up' && poseScore >= 75) return createMessage('Good lift! Now the right knee.', 'good', true);
      if (phase === 'right-up' && poseScore >= 75) return createMessage('Great! Now the left knee.', 'good', true);
      if (phase === 'rest') return createMessage('Lift one knee at a time.', 'good', false);
      if (poseScore < 50) return createMessage('Lift your knee higher.', 'warning', true);
      return createMessage('Good rhythm. Keep marching.', 'good', false);

    case 'wall-push':
      if (phase === 'extended' && poseScore >= 75) return createMessage('Great push! Now bend slowly.', 'good', true);
      if (phase === 'bent' && poseScore >= 75) return createMessage('Good. Now push away from the wall.', 'good', true);
      if (angle < 70) return createMessage('Do not bend your arms too much.', 'warning', true);
      if (poseScore < 50) return createMessage('Extend your arms more.', 'warning', true);
      return createMessage('Good form. Keep pushing.', 'good', false);

    default:
      return createMessage('Keep going. You are doing well.', 'good', false);
  }
};
