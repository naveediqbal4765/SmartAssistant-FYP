// Module: Wellness & Rehabilitation | Phase 3 — Telemetry Intelligence
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useVitalsSource from '../../health/iot/hooks/useVitalsSource';
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

export default function ActiveSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const seniorId = getSeniorId();
  const { vitalsSnapshot } = useVitalsSource(seniorId);
  const session = location.state?.session || null;
  const exercise = location.state?.exercise || null;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [summarySession, setSummarySession] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timerId);
  }, []);

  const exerciseName = useMemo(() => (
    exercise?.name || session?.exercise_type || 'Active Exercise'
  ), [exercise, session]);

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
      const updatedSession = await completeSession(session._id, {
        duration: Number(durationMinutes.toFixed(1)),
        calories_burned: caloriesBurned,
        avg_pose_score: 0
      });
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
    <main className="min-h-[calc(100vh-6rem)] bg-brand-surface px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-4xl">
        <div className="rounded-[2rem] bg-white p-6 text-center sm:p-8">
          <p className="text-lg font-bold uppercase tracking-[0.16em] text-brand-muted">Active Session</p>
          <h1 className="mt-3 text-4xl font-bold text-brand-primary">{exerciseName}</h1>
          <p className="mt-6 text-lg font-semibold text-gray-700">Session Timer</p>
          <p className="mt-3 text-6xl font-bold tracking-wider text-gray-950">{formatTimer(elapsedSeconds)}</p>
        </div>

        {safetyWarning && (
          <div className={`mt-6 rounded-[1.5rem] border-4 p-5 text-2xl font-bold ${
            safetyWarning.tone === 'danger'
              ? 'border-red-500 bg-red-100 text-red-900'
              : 'border-amber-500 bg-amber-100 text-amber-900'
          }`}
          >
            {safetyWarning.message}
          </div>
        )}

        <div className="mt-6">
          <RestTimer />
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-lg font-semibold text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleComplete}
          disabled={completing}
          className="mt-6 w-full rounded-[1.5rem] bg-green-700 px-6 py-5 text-2xl font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
        >
          {completing ? 'Completing Session...' : 'Complete Session'}
        </button>
      </section>

      <SessionSummary session={summarySession} onClose={closeSummary} />
    </main>
  );
}
