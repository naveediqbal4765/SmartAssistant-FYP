// Module: Wellness & Rehabilitation | Phase 5 — Pose Correction
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import FeatureCard from '../../../components/ui/FeatureCard';
import FeaturePage from '../../../components/ui/FeaturePage';
import StatusAlert from '../../../components/ui/StatusAlert';
import useVitalsSource from '../../health/iot/hooks/useVitalsSource';
import CameraPermissionScreen from '../components/CameraPermissionScreen';
import PoseCamera from '../components/PoseCamera';
import RepCounter from '../components/RepCounter';
import RestTimer from '../components/RestTimer';
import SessionSummary from '../components/SessionSummary';
import { completeSession } from '../services/wellnessService';

const formatTimer = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const getSeniorId = () => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user._id || user.id || '';
  } catch {
    return '';
  }
};

const getStoredSessionData = () => {
  try {
    return JSON.parse(sessionStorage.getItem('activeWellnessSession') || '{}');
  } catch {
    return {};
  }
};

const getExerciseType = (exerciseName) => {
  if (exerciseName === 'Shoulder Raise') return 'shoulder-raise';
  if (exerciseName === 'Arm Extension') return 'arm-extension';
  if (exerciseName === 'Neck Stretch') return 'neck-stretch';
  if (exerciseName === 'Leg Raise') return 'leg-raise';
  if (exerciseName === 'Sit To Stand') return 'sit-to-stand';
  if (exerciseName === 'Seated March') return 'seated-march';
  if (exerciseName === 'Wall Push') return 'wall-push';
  return null;
};

export default function ActiveSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const seniorId = getSeniorId();
  const { vitalsSnapshot } = useVitalsSource(seniorId);
  const storedSessionData = useMemo(() => getStoredSessionData(), []);
  const session = location.state?.session || storedSessionData.session || null;
  const exercise = location.state?.exercise || storedSessionData.exercise || null;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [cameraPermission, setCameraPermission] = useState('pending');
  const [poseResult, setPoseResult] = useState({ count: 0, poseScore: 0, angle: 0, phase: '' });
  const [poseScoreTotals, setPoseScoreTotals] = useState({ total: 0, samples: 0 });
  const [totalCorrections, setTotalCorrections] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [summarySession, setSummarySession] = useState(null);
  const [error, setError] = useState('');

  const exerciseName = useMemo(() => (
    exercise?.name || session?.exercise_type || 'Active Exercise'
  ), [exercise, session]);

  const exerciseType = useMemo(() => getExerciseType(exerciseName), [exerciseName]);

  useEffect(() => {
    if (session || exercise) {
      sessionStorage.setItem('activeWellnessSession', JSON.stringify({ session, exercise }));
    }
  }, [exercise, session]);

  useEffect(() => {
    if (exerciseType && cameraPermission === 'pending') return undefined;

    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [cameraPermission, exerciseType]);

  const safetyWarning = useMemo(() => {
    const vitals = vitalsSnapshot?.vitals;
    if (!vitals) return null;

    if (vitals.oxygenLevel < 95) {
      return {
        tone: 'danger',
        message: 'Your oxygen level is low. Stop exercise immediately.'
      };
    }

    if (vitals.heartRate > 100) {
      return {
        tone: 'danger',
        message: 'Your heart rate is high. Consider stopping and resting.'
      };
    }

    if (vitals.temperature >= 37.5) {
      return {
        tone: 'warning',
        message: 'You have a fever. It is recommended to stop exercising.'
      };
    }

    return null;
  }, [vitalsSnapshot]);

  const handlePoseResult = useCallback((result) => {
    setPoseResult({
      count: result.count || 0,
      poseScore: result.poseScore || 0,
      angle: result.angle || 0,
      phase: result.phase || ''
    });

    if (result.poseScore > 0) {
      setPoseScoreTotals((current) => ({
        total: current.total + result.poseScore,
        samples: current.samples + 1
      }));
    }

    if (result.correctionCount > totalCorrections) {
      setTotalCorrections(result.correctionCount);
    }
  }, [totalCorrections]);

  const handleComplete = async () => {
    if (!session?._id) {
      setError('No active session was found. Please start a new exercise.');
      return;
    }

    const durationMinutes = Math.max(1 / 60, elapsedSeconds / 60);
    const caloriesBurned = Number((durationMinutes * 4).toFixed(1));

    setCompleting(true);
    setError('');

    try {
      const avgPoseScore = poseScoreTotals.samples > 0
        ? Number((poseScoreTotals.total / poseScoreTotals.samples).toFixed(1))
        : Number((poseResult.poseScore || 0).toFixed(1));
      const updatedSession = await completeSession(session._id, {
        duration: Number(durationMinutes.toFixed(1)),
        calories_burned: caloriesBurned,
        avg_pose_score: avgPoseScore,
        corrections_count: totalCorrections
      });
      sessionStorage.removeItem('activeWellnessSession');
      setSummarySession(updatedSession);
    } catch (err) {
      setError(err.message || 'Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  const closeSummary = () => {
    setSummarySession(null);
    navigate('/wellness');
  };

  return (
    <>
      {exerciseType && cameraPermission === 'pending' && createPortal(
        <CameraPermissionScreen
          exerciseName={exerciseName}
          onBack={() => navigate('/wellness/library')}
          onAllow={() => setCameraPermission('granted')}
          onDecline={() => setCameraPermission('declined')}
        />,
        document.body
      )}

      <FeaturePage
        title={exerciseName || 'Active Session'}
        description="Follow the on-screen guidance carefully."
        backLabel="Back to Library"
        onBack={() => navigate('/wellness/library')}
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          <FeatureCard className="p-5 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-muted">Session Timer</h2>
            <p className="mt-3 text-5xl font-bold tracking-wider text-gray-950">{formatTimer(elapsedSeconds)}</p>
          </FeatureCard>

          {exerciseType && cameraPermission === 'granted' && (
            <>
              <PoseCamera exerciseType={exerciseType} onPoseResult={handlePoseResult} />
              <RepCounter
                count={poseResult.count}
                poseScore={poseResult.poseScore}
                angle={poseResult.angle}
                phase={poseResult.phase}
                correctionsCount={totalCorrections}
              />
            </>
          )}

          {safetyWarning && (
            <FeatureCard variant={safetyWarning.tone === 'danger' ? 'danger' : 'warning'}>
              <p className="text-lg font-bold">{safetyWarning.message}</p>
            </FeatureCard>
          )}

          <RestTimer />

          {error && <StatusAlert variant="error">{error}</StatusAlert>}

          <Button
            onClick={handleComplete}
            disabled={completing}
            size="lg"
            className="w-full"
          >
            {completing ? 'Completing Session...' : 'Complete Session'}
          </Button>
        </div>

        <SessionSummary session={summarySession} onClose={closeSummary} />
      </FeaturePage>
    </>
  );
}