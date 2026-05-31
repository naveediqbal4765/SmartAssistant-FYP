// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration

export const getLandmark = (landmarks, index) => landmarks?.[index] || null;

export const calculateAngle = (a, b, c) => {
  if (!a || !b || !c) return 0;

  const vectorA = { x: a.x - b.x, y: a.y - b.y };
  const vectorC = { x: c.x - b.x, y: c.y - b.y };
  const directionA = Math.atan2(vectorA.y, vectorA.x);
  const directionC = Math.atan2(vectorC.y, vectorC.x);
  if (!Number.isFinite(directionA) || !Number.isFinite(directionC)) return 0;

  const dotProduct = vectorA.x * vectorC.x + vectorA.y * vectorC.y;
  const magnitudeA = Math.hypot(vectorA.x, vectorA.y);
  const magnitudeC = Math.hypot(vectorC.x, vectorC.y);
  if (!magnitudeA || !magnitudeC) return 0;

  const cosine = Math.min(1, Math.max(-1, dotProduct / (magnitudeA * magnitudeC)));
  const angle = Math.acos(cosine) * (180 / Math.PI);
  return Number(angle.toFixed(1));
};

export const calculatePoseScore = (targetAngle, detectedAngle, tolerance = 15) => {
  const difference = Math.abs(Number(targetAngle) - Number(detectedAngle));

  if (difference <= tolerance) return 100;
  if (difference <= tolerance * 2) return 75;
  if (difference <= tolerance * 3) return 50;
  return 25;
};
