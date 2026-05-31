// Module: Wellness & Rehabilitation | Phase 5 — Pose Correction
import { useEffect, useRef, useState } from 'react';
import { getCorrectionMessage } from '../pose/correctionEngine';
import usePoseLandmarker from '../pose/usePoseLandmarker';
import { detectArmExtension } from '../pose/exercises/armExtension';
import { detectLegRaise } from '../pose/exercises/legRaise';
import { detectNeckStretch } from '../pose/exercises/neckStretch';
import { detectSeatedMarch } from '../pose/exercises/seatedMarch';
import { detectShoulderRaise } from '../pose/exercises/shoulderRaise';
import { detectSitToStand } from '../pose/exercises/sitToStand';
import { detectWallPush } from '../pose/exercises/wallPush';

const SKELETON_PAIRS = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24]
];

const getInitialRepState = (exerciseType) => {
  const phaseByExercise = {
    'arm-extension': 'bent',
    'neck-stretch': 'center',
    'leg-raise': 'down',
    'sit-to-stand': 'sitting',
    'seated-march': 'rest',
    'wall-push': 'bent'
  };

  return {
    count: 0,
    phase: phaseByExercise[exerciseType] || 'down'
  };
};

const detectExercise = (exerciseType, landmarks, repState) => {
  switch (exerciseType) {
    case 'arm-extension':
      return detectArmExtension(landmarks, repState);
    case 'neck-stretch':
      return detectNeckStretch(landmarks, repState);
    case 'leg-raise':
      return detectLegRaise(landmarks, repState);
    case 'sit-to-stand':
      return detectSitToStand(landmarks, repState);
    case 'seated-march':
      return detectSeatedMarch(landmarks, repState);
    case 'wall-push':
      return detectWallPush(landmarks, repState);
    case 'shoulder-raise':
    default:
      return detectShoulderRaise(landmarks, repState);
  }
};

const getSkeletonColor = (poseScore) => {
  if (poseScore >= 75) return '#16a34a';
  if (poseScore >= 50) return '#f59e0b';
  if (poseScore > 0) return '#dc2626';
  return '#16a34a';
};

const getOverlayColor = (severity) => {
  if (severity === 'warning') return 'rgba(245, 158, 11, 0.85)';
  if (severity === 'error') return 'rgba(220, 38, 38, 0.85)';
  return 'rgba(22, 163, 74, 0.85)';
};

const drawCorrectionOverlay = (context, canvas, correction) => {
  if (!correction?.message) return;

  context.fillStyle = getOverlayColor(correction.severity);
  context.fillRect(0, canvas.height - 70, canvas.width, 70);
  context.font = 'bold 22px sans-serif';
  context.fillStyle = '#ffffff';
  context.textAlign = 'center';
  context.fillText(correction.message, canvas.width / 2, canvas.height - 28);
};

const drawSkeleton = (canvas, video, landmarks, poseScore = 0, correction = null) => {
  const context = canvas.getContext('2d');
  if (!context) return;

  canvas.width = video.videoWidth || video.clientWidth;
  canvas.height = video.videoHeight || video.clientHeight;
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (!landmarks?.length) {
    drawCorrectionOverlay(context, canvas, correction);
    return;
  }

  const skeletonColor = getSkeletonColor(poseScore);
  context.strokeStyle = skeletonColor;
  context.lineWidth = 5;
  context.fillStyle = skeletonColor;

  SKELETON_PAIRS.forEach(([startIndex, endIndex]) => {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];
    if (!start || !end) return;

    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.stroke();
  });

  landmarks.forEach((landmark) => {
    context.beginPath();
    context.arc(landmark.x * canvas.width, landmark.y * canvas.height, 5, 0, 2 * Math.PI);
    context.fill();
  });

  drawCorrectionOverlay(context, canvas, correction);
};

export default function PoseCamera({ exerciseType, onPoseResult }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const streamRef = useRef(null);
  const repStateRef = useRef(getInitialRepState(exerciseType));
  const onPoseResultRef = useRef(onPoseResult);
  const lastCorrectionTime = useRef(0);
  const lastMessage = useRef('');
  const correctionRef = useRef({ message: '', severity: 'good' });
  const correctionCountRef = useRef(0);
  const { poseLandmarker, isLoading, error } = usePoseLandmarker();
  const [cameraError, setCameraError] = useState('');
  const [correction, setCorrection] = useState({
    message: '',
    severity: 'good'
  });
  const [correctionCount, setCorrectionCount] = useState(0);

  useEffect(() => {
    onPoseResultRef.current = onPoseResult;
  }, [onPoseResult]);

  useEffect(() => {
    repStateRef.current = getInitialRepState(exerciseType);
    lastCorrectionTime.current = 0;
    lastMessage.current = '';
    correctionRef.current = { message: '', severity: 'good' };
    correctionCountRef.current = 0;
  }, [exerciseType]);

  useEffect(() => {
    if (!poseLandmarker || isLoading || error) return undefined;
    let cancelled = false;
    const video = videoRef.current;

    const detectFrame = () => {
      const currentVideo = videoRef.current;
      const canvas = canvasRef.current;

      if (cancelled) return;

      if (!currentVideo || !canvas || currentVideo.readyState < 2) {
        animationRef.current = window.requestAnimationFrame(detectFrame);
        return;
      }

      const result = poseLandmarker.detectForVideo(currentVideo, performance.now());
      const landmarks = result?.landmarks?.[0];

      if (landmarks) {
        const detection = detectExercise(exerciseType, landmarks, repStateRef.current);
        const now = Date.now();
        const timeSinceLast = now - lastCorrectionTime.current;

        if (timeSinceLast >= 2500) {
          const feedback = getCorrectionMessage(
            exerciseType,
            detection.angle,
            detection.phase,
            detection.poseScore
          );

          if (feedback.message !== lastMessage.current) {
            const nextCorrection = { message: feedback.message, severity: feedback.severity };
            setCorrection(nextCorrection);
            correctionRef.current = nextCorrection;
            lastMessage.current = feedback.message;

            if (feedback.severity === 'error' || feedback.severity === 'warning') {
              correctionCountRef.current += 1;
              setCorrectionCount(correctionCountRef.current);
            }
          }

          lastCorrectionTime.current = now;
        }

        repStateRef.current = {
          count: detection.count,
          phase: detection.phase
        };
        onPoseResultRef.current?.({
          ...detection,
          correctionCount: correctionCountRef.current
        });
        drawSkeleton(canvas, currentVideo, landmarks, detection.poseScore, correctionRef.current);
      } else {
        drawSkeleton(canvas, currentVideo, [], 0, correctionRef.current);
      }

      animationRef.current = window.requestAnimationFrame(detectFrame);
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        video.onloadeddata = () => {
          if (!cancelled) {
            video.play();
            animationRef.current = window.requestAnimationFrame(detectFrame);
          }
        };
      } catch {
        if (!cancelled) setCameraError('Camera access failed. You can continue without pose detection.');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [error, exerciseType, isLoading, poseLandmarker]);

  if (isLoading) {
    return (
      <div className="rounded-[2rem] bg-white p-8 text-center text-2xl font-bold text-brand-primary">
        Initializing pose detection...
      </div>
    );
  }

  if (error || cameraError) {
    return (
      <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center text-2xl font-bold text-amber-900">
        {cameraError || 'Camera access failed. You can continue without pose detection.'}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] bg-gray-950">
      <div className="relative aspect-video w-full">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          aria-label="Live camera preview for exercise pose detection"
        />
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        />
        <div className="sr-only" aria-live="polite">
          {correction.message}
          {correctionCount}
        </div>
      </div>
    </section>
  );
}
