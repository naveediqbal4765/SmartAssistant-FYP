// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmptyState from '../../../components/ui/EmptyState';
import FeaturePage from '../../../components/ui/FeaturePage';
import LoadingState from '../../../components/ui/LoadingState';
import StatusAlert from '../../../components/ui/StatusAlert';
import ExerciseCard from '../components/ExerciseCard';
import { getExerciseLibrary, startSession } from '../services/wellnessService';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoStart = searchParams.get('start');
  const autoStartedRef = useRef(false);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadExercises = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getExerciseLibrary();
        if (!cancelled) setExercises(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load exercises');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadExercises();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = useCallback(async (exercise) => {
    const user = getCurrentUser();
    const seniorId = user.id || user._id;

    if (!seniorId) {
      setError('Unable to start session because the current user could not be found.');
      return;
    }

    setStartingId(exercise._id || exercise.name);
    setError('');

    try {
      const session = await startSession({
        senior_id: seniorId,
        exercise_type: exercise.name
      });

      navigate('/wellness/session/active', {
        state: {
          session,
          exercise
        }
      });
    } catch (err) {
      setError(err.message || 'Failed to start exercise');
      setStartingId('');
    }
  }, [navigate]);

  useEffect(() => {
    if (autoStartedRef.current || loading || !autoStart || !exercises.length) return;

    const exercise = exercises.find((item) => (
      item.name?.toLowerCase() === autoStart.toLowerCase()
    ));
    autoStartedRef.current = true;

    if (exercise) {
      handleStart(exercise);
    }
  }, [autoStart, exercises, handleStart, loading]);

  return (
    <FeaturePage
      title="Exercise Library"
      description="Choose a safe beginner-friendly exercise."
      backLabel="Back to Wellness"
      onBack={() => navigate('/wellness')}
    >
      {error && <StatusAlert variant="error">{error}</StatusAlert>}

      {loading ? (
        <LoadingState label="Loading exercises..." />
      ) : exercises.length === 0 ? (
        <EmptyState
          title="No exercises available"
          description="Please try again later."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {exercises.map((exercise) => (
            <ExerciseCard
              key={exercise._id || exercise.name}
              exercise={exercise}
              onStart={handleStart}
            />
          ))}
        </div>
      )}

      {startingId && (
        <p className="mt-5 text-lg font-bold text-brand-primary">Starting exercise...</p>
      )}
    </FeaturePage>
  );
}
