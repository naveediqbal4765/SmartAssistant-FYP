// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '../services/wellnessService';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const calculateWorkoutStreak = (sessions = []) => {
  const completedDays = new Set(
    sessions
      .filter((session) => session.status === 'completed')
      .map((session) => toDateKey(session.ended_at || session.created_at))
      .filter(Boolean)
  );

  let streak = 0;
  const cursor = new Date();

  while (completedDays.has(toDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
};

export default function WellnessDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const user = getCurrentUser();
    const seniorId = user.id || user._id;

    const loadSessions = async () => {
      if (!seniorId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await getSessions(seniorId);
        if (!cancelled) setSessions(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load wellness progress');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const todayCompleted = sessions.filter((session) => (
      session.status === 'completed'
      && toDateKey(session.ended_at || session.created_at) === todayKey
    ));

    const exerciseMinutes = todayCompleted.reduce((sum, session) => sum + Number(session.duration || 0), 0);
    const caloriesBurned = todayCompleted.reduce((sum, session) => sum + Number(session.calories_burned || 0), 0);

    return [
      { label: "Today's Exercise", value: loading ? '--' : Math.round(exerciseMinutes), helper: 'Minutes completed' },
      { label: 'Calories Burned', value: loading ? '--' : Math.round(caloriesBurned), helper: 'Estimated calories' },
      { label: 'Sessions', value: loading ? '--' : todayCompleted.length, helper: 'Completed sessions' },
      { label: 'Streak', value: loading ? '--' : calculateWorkoutStreak(sessions), helper: 'Active days' }
    ];
  }, [loading, sessions]);

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-brand-surface px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 rounded-[2rem] bg-white/95 p-6 ring-1 ring-emerald-100 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-bold uppercase tracking-[0.18em] text-brand-muted">
              Phase 1 Fitness Tracking
            </p>
            <h1 className="mt-3 text-3xl font-bold text-brand-primary sm:text-4xl">
              Wellness & Rehabilitation
            </h1>
            <p className="mt-3 max-w-3xl text-lg leading-8 text-gray-700">
              Track daily movement, rehabilitation sessions, nutrition, and personalized wellness guidance.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/wellness/library')}
            className="rounded-2xl bg-green-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-green-800"
          >
            Start Workout
          </button>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-lg font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.5rem] border border-emerald-100 bg-white p-6"
            >
              <p className="text-lg font-semibold text-brand-primary">{card.label}</p>
              <p className="mt-5 text-5xl font-bold text-gray-950">{card.value}</p>
              <p className="mt-4 text-lg font-medium text-gray-700">{card.helper}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
