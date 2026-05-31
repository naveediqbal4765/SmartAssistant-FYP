// Module: Wellness & Rehabilitation | Phase 3 — Wellness Summary
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExerciseSuggestions from '../components/ExerciseSuggestions';
import WellnessIntelligenceCard from '../components/WellnessIntelligenceCard';
import { getNutritionLogs, getSessions } from '../services/wellnessService';

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

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
  const [nutritionTotals, setNutritionTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const seniorId = user._id || user.id;
    const todayDate = getTodayDate();

    const loadSessions = async () => {
      if (!seniorId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const sessionData = await getSessions(seniorId);
        if (!cancelled) setSessions(sessionData);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load wellness progress');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const loadNutritionTotals = async () => {
      try {
        const nutritionData = await getNutritionLogs(seniorId, todayDate);
        if (!cancelled) {
          setNutritionTotals(nutritionData.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
      } catch {
        if (!cancelled) {
          setNutritionTotals({ calories: 0, protein: 0, carbs: 0, fat: 0 });
        }
      }
    };

    loadSessions();
    if (seniorId) {
      loadNutritionTotals();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const todayCompleted = useMemo(() => {
    const todayKey = toDateKey(new Date());
    return sessions.filter((session) => (
      session.status === 'completed'
      && toDateKey(session.ended_at || session.created_at) === todayKey
    ));
  }, [sessions]);

  const summary = useMemo(() => {
    const exerciseMinutes = todayCompleted.reduce((sum, session) => sum + Number(session.duration || 0), 0);
    const caloriesBurned = todayCompleted.reduce((sum, session) => sum + Number(session.calories_burned || 0), 0);

    return {
      totalExerciseMinutes: exerciseMinutes,
      totalSessionsCompleted: todayCompleted.length,
      totalCaloriesBurned: caloriesBurned,
      totalCaloriesConsumed: nutritionTotals.calories || 0,
      totalProtein: nutritionTotals.protein || 0
    };
  }, [nutritionTotals, todayCompleted]);

  const metrics = useMemo(() => (
    [
      { label: "Today's Exercise", value: loading ? '--' : Math.round(summary.totalExerciseMinutes), helper: 'Minutes completed' },
      { label: 'Calories Burned', value: loading ? '--' : Math.round(summary.totalCaloriesBurned), helper: 'Estimated calories' },
      { label: 'Sessions', value: loading ? '--' : summary.totalSessionsCompleted, helper: 'Completed sessions' },
      { label: 'Streak', value: loading ? '--' : calculateWorkoutStreak(sessions), helper: 'Active days' }
    ]
  ), [loading, sessions, summary]);

  const nutritionMetrics = [
    { label: 'Calories', value: Math.round(nutritionTotals.calories || 0), unit: '', className: 'bg-amber-50 text-amber-800' },
    { label: 'Protein', value: Math.round(nutritionTotals.protein || 0), unit: 'g', className: 'bg-blue-50 text-blue-800' },
    { label: 'Carbs', value: Math.round(nutritionTotals.carbs || 0), unit: 'g', className: 'bg-green-50 text-green-800' },
    { label: 'Fat', value: Math.round(nutritionTotals.fat || 0), unit: 'g', className: 'bg-rose-50 text-rose-800' }
  ];

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-brand-surface px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <WellnessIntelligenceCard summary={summary} />
        <ExerciseSuggestions />

        {error && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-lg font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="rounded-[2rem] bg-white p-6">
          <div>
            <h2 className="text-3xl font-bold text-brand-primary">Nutrition Today</h2>
            <p className="mt-2 text-lg font-semibold text-gray-700">Review today&apos;s meal totals and log more food.</p>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {nutritionMetrics.map((metric) => (
              <article key={metric.label} className={`rounded-2xl p-5 ${metric.className}`}>
                <p className="text-lg font-bold">{metric.label}</p>
                <p className="mt-3 text-4xl font-bold">
                  {loading ? '--' : metric.value}
                  {metric.unit && <span className="text-xl"> {metric.unit}</span>}
                </p>
              </article>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => navigate('/wellness/library')}
            className="rounded-2xl bg-green-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-green-800"
          >
            Start Workout
          </button>
          <button
            type="button"
            onClick={() => navigate('/wellness/nutrition')}
            className="rounded-2xl bg-green-700 px-6 py-4 text-lg font-bold text-white transition hover:bg-green-800"
          >
            Log Meals
          </button>
        </div>
      </section>
    </main>
  );
}
