// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseCard from '../components/ExerciseCard';
import { getExerciseLibrary, startSession } from '../services/wellnessService';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

export default function ExerciseLibraryPage() {
  const navigate = useNavigate();
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

  const handleStart = async (exercise) => {
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
  };

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-brand-surface px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-bold uppercase tracking-[0.16em] text-brand-muted">Exercise Library</p>
            <h1 className="mt-2 text-3xl font-bold text-brand-primary sm:text-4xl">Choose an Exercise</h1>
            <p className="mt-3 text-lg leading-8 text-gray-700">
              Select a safe beginner-friendly activity and start tracking your wellness session.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/wellness')}
            className="rounded-2xl border border-brand-primary px-5 py-4 text-lg font-bold text-brand-primary transition hover:bg-brand-primary hover:text-white"
          >
            Back to Dashboard
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-lg font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6 rounded-[1.5rem] bg-white p-6 text-lg font-semibold text-gray-700">
            Loading exercises...
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
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
      </section>
    </main>
  );
}
