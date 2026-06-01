// Module: Wellness & Rehabilitation | Phase 3 — Wellness Summary
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Dumbbell, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import FeaturePage from '../../../components/ui/FeaturePage';
import LoadingState from '../../../components/ui/LoadingState';
import WellnessIntelligenceCard from '../components/WellnessIntelligenceCard';
import {
  getNutritionLogs,
  getNutritionSuggestions,
  getSessions,
  getStreak
} from '../services/wellnessService';

const toDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const suggestedExercises = [
  {
    title: 'Shoulder Raise',
    description: 'Gentle shoulder mobility to keep your joints flexible and reduce stiffness.',
    icon: '🏋️'
  },
  {
    title: 'Deep Breathing',
    description: 'Calm breathing exercise to improve oxygen levels and reduce stress.',
    icon: '🌬️'
  },
  {
    title: 'Seated March',
    description: 'Light leg movement while seated to boost circulation and energy.',
    icon: '🚶'
  },
  {
    title: 'Neck Stretch',
    description: 'Slow gentle neck stretch to relieve tension and improve posture.',
    icon: '🧘'
  }
];

const suggestedMeals = [
  {
    title: 'Breakfast',
    suggestion: 'Oatmeal with fruits and a glass of milk',
    icon: '☀️',
    tip: 'High in fiber and protein to start your day strong.'
  },
  {
    title: 'Lunch',
    suggestion: 'Grilled chicken with vegetables and brown rice',
    icon: '🌤️',
    tip: 'Balanced meal with lean protein and complex carbs.'
  },
  {
    title: 'Dinner',
    suggestion: 'Lentil soup with whole grain bread',
    icon: '🌙',
    tip: 'Light and nutritious — easy to digest before sleep.'
  },
  {
    title: 'Snack',
    suggestion: 'A handful of mixed nuts or a banana',
    icon: '🥜',
    tip: 'Quick energy boost between meals.'
  }
];

export default function WellnessDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [nutritionTotals, setNutritionTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [nutritionSuggestions, setNutritionSuggestions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [exercisedToday, setExercisedToday] = useState(false);
  const [loading, setLoading] = useState(true);

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
      try {
        const sessionData = await getSessions(seniorId);
        if (!cancelled) setSessions(sessionData);
      } catch {
        if (!cancelled) setSessions([]);
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

    const loadStreak = async () => {
      try {
        const streakData = await getStreak(seniorId);
        if (!cancelled) {
          setStreak(Number(streakData.streak || 0));
          setExercisedToday(Boolean(streakData.exercisedToday));
        }
      } catch {
        if (!cancelled) {
          setStreak(0);
          setExercisedToday(false);
        }
      }
    };

    const loadNutritionSuggestions = async () => {
      try {
        const nextSuggestions = await getNutritionSuggestions(seniorId);
        if (!cancelled) setNutritionSuggestions(nextSuggestions);
      } catch {
        if (!cancelled) setNutritionSuggestions([]);
      }
    };

    loadSessions();
    if (seniorId) {
      loadNutritionTotals();
      loadStreak();
      loadNutritionSuggestions();
    }

    return () => { cancelled = true; };
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

  const shouldShowStreakBanner = !exercisedToday && new Date().getUTCHours() >= 18;

  return (
    <FeaturePage
      title="Wellness & Rehabilitation"
      description="Track your exercises, nutrition, and daily wellness."
      backLabel="Back to Dashboard"
      onBack={() => navigate('/dashboard')}
      maxWidth="max-w-6xl"
    >
      {loading ? (
        <LoadingState label="Loading wellness dashboard..." />
      ) : (
        <div className="space-y-5">

          {/* Streak Banner */}
          {shouldShowStreakBanner && (
            <div className={`rounded-2xl border p-5 shadow-sm transition-shadow hover:shadow-md ${
              streak > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-blue-200 bg-blue-50'
            }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl" aria-hidden="true">
                  {streak > 0 ? '⚠️' : '💪'}
                </span>
                <div>
                  <p className={`text-lg font-semibold ${
                    streak > 0 ? 'text-amber-800' : 'text-blue-800'
                  }`}
                  >
                    {streak > 0
                      ? `You haven't exercised today! Don't break your ${streak} day streak!`
                      : 'Start your streak today! Every journey begins with a single step.'}
                  </p>
                  <Button
                    onClick={() => navigate('/wellness/library')}
                    className="mt-2"
                    size="sm"
                  >
                    {streak > 0 ? 'Start Workout Now' : 'Start First Workout'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Wellness Summary Card */}
          <div className="rounded-2xl shadow-sm transition-shadow hover:shadow-md">
            <WellnessIntelligenceCard
              summary={summary}
              streak={streak}
              exercisedToday={exercisedToday}
            />
          </div>
          <p className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
            <span>ℹ️</span>
            Personalised exercise and nutrition plans will be available after the IoT Health Sensor module is integrated.
          </p>
          {/* Exercise Section */}
          <button
            type="button"
            onClick={() => navigate('/wellness/library')}
            className="group block w-full rounded-2xl border border-gray-200 bg-white/90 p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Dumbbell size={24} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-brand-primary">
                    Today&apos;s Exercises
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Suggested workouts for you. Tap any to start.
                  </p>
                </div>
              </div>
              <ChevronRight
                size={22}
                className="shrink-0 text-emerald-700 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>

            <div className="space-y-2">
              {suggestedExercises.map((card) => (
                <div
                  key={card.title}
                  className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 shadow-sm transition-all duration-150 hover:bg-emerald-100 hover:shadow-md hover:-translate-y-0.5"
                  onClick={(event) => {
                    event.stopPropagation();
                    navigate(`/wellness/library?start=${encodeURIComponent(card.title)}`);
                  }}
                  role="button"
                  tabIndex={-1}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden="true">{card.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{card.title}</p>
                      <p className="text-xs text-emerald-700">{card.description}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-emerald-500" aria-hidden="true" />
                </div>
              ))}
            </div>

          </button>

          {/* Nutrition Section */}
          <button
            type="button"
            onClick={() => navigate('/wellness/nutrition')}
            className="group block w-full rounded-2xl border border-gray-200 bg-white/90 p-6 text-left shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Utensils size={24} aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-brand-primary">
                    Suggested Meals Today
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Healthy meal ideas for today. Tap to log your food.
                  </p>
                </div>
              </div>
              <ChevronRight
                size={22}
                className="shrink-0 text-blue-700 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </div>

            <div className="space-y-2">
              {suggestedMeals.map((meal) => (
                <div
                  key={meal.title}
                  className="flex items-center justify-between rounded-xl bg-blue-50 p-3 shadow-sm transition-all duration-150 hover:bg-blue-100 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl" aria-hidden="true">{meal.icon}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{meal.title}</p>
                      <p className="text-xs text-blue-700">{meal.suggestion}</p>
                      <p className="text-xs text-gray-400">{meal.tip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {nutritionSuggestions.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50/80 p-3">
                <span aria-hidden="true">
                  {nutritionSuggestions[0].type === 'hydration'
                    ? '💧'
                    : nutritionSuggestions[0].type === 'nutrition'
                      ? '🥗'
                      : nutritionSuggestions[0].type === 'activity'
                        ? '🚶'
                        : 'ℹ️'}
                </span>
                <p className="text-sm font-semibold text-blue-800">
                  {nutritionSuggestions[0].message}
                </p>
              </div>
            )}

          </button>

        </div>
      )}
    </FeaturePage>
  );
}