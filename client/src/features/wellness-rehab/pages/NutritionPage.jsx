// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MealSection from '../components/MealSection';
import NutritionSuggestions from '../components/NutritionSuggestions';
import NutritionSummaryCard from '../components/NutritionSummaryCard';
import { getNutritionLogs, getNutritionSuggestions } from '../services/wellnessService';

const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];

const emptyNutritionData = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
  totals: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  }
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

export default function NutritionPage() {
  const navigate = useNavigate();
  const [nutritionData, setNutritionData] = useState(emptyNutritionData);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNutrition = useCallback(async () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const seniorId = user._id || user.id;
    const todayDate = getTodayDate();

    if (!seniorId) {
      setError('Unable to load nutrition data because the current user could not be found.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const logs = await getNutritionLogs(seniorId, todayDate);
      setNutritionData(logs);
    } catch (err) {
      setError(err.message || 'Failed to load nutrition data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNutrition();
  }, [loadNutrition]);

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const seniorId = user._id || user.id;
        if (!seniorId) {
          setSuggestions([]);
          return;
        }

        const nextSuggestions = await getNutritionSuggestions(seniorId);
        setSuggestions(nextSuggestions);
      } catch (err) {
        setSuggestions([]);
      }
    };

    loadSuggestions();
  }, []);

  return (
    <main className="min-h-[calc(100vh-6rem)] bg-brand-surface px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[2rem] bg-white p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-lg font-bold uppercase tracking-[0.16em] text-brand-muted">Nutrition Tracking</p>
            <h1 className="mt-2 text-4xl font-bold text-brand-primary">Log Meals</h1>
            <p className="mt-3 text-lg leading-8 text-gray-700">
              Search foods, enter meals, and review today&apos;s nutrition totals.
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
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-lg font-semibold text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-[2rem] bg-white p-6 text-lg font-bold text-gray-700">
            Loading nutrition data...
          </div>
        ) : (
          <>
            <NutritionSummaryCard totals={nutritionData.totals} />
            <NutritionSuggestions suggestions={suggestions} />
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {mealTypes.map((mealType) => (
                <MealSection
                  key={mealType}
                  mealType={mealType}
                  logs={nutritionData[mealType]}
                  onFoodLogged={loadNutrition}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
