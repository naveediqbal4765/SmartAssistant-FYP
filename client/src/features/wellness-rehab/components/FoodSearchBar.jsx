// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
import { useEffect, useState } from 'react';
import FoodResultCard from './FoodResultCard';
import { logNutrition, searchFood } from '../services/wellnessService';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const emptyManualForm = {
  food_name: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: ''
};

export default function FoodSearchBar({ mealType, onFoodLogged }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [searching, setSearching] = useState(false);
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setResults([]);
      setMessage('');
      return undefined;
    }

    const timeoutId = window.setTimeout(async () => {
      setSearching(true);
      setError('');

      try {
        const data = await searchFood(trimmedQuery);
        setResults(data.results || []);
        setMessage(data.message || '');
        setManualForm((current) => ({
          ...current,
          food_name: trimmedQuery
        }));
      } catch (err) {
        setError(err.message || 'Food search failed');
      } finally {
        setSearching(false);
      }
    }, 600);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const resetSearch = () => {
    setQuery('');
    setResults([]);
    setMessage('');
    setManualForm(emptyManualForm);
  };

  const getSeniorId = () => {
    const user = getCurrentUser();
    return user.id || user._id;
  };

  const submitFood = async (payload) => {
    const seniorId = getSeniorId();
    if (!seniorId) {
      setError('Unable to log food because the current user could not be found.');
      return;
    }

    setLogging(true);
    setError('');

    try {
      await logNutrition({
        senior_id: seniorId,
        meal_type: mealType,
        quantity: payload.quantity || '100g',
        ...payload
      });
      resetSearch();
      onFoodLogged?.();
    } catch (err) {
      setError(err.message || 'Failed to log food');
    } finally {
      setLogging(false);
    }
  };

  const handleSelect = (food) => {
    submitFood({
      food_name: food.food_name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat
    });
  };

  const handleManualSubmit = (event) => {
    event.preventDefault();
    submitFood({
      food_name: manualForm.food_name || query,
      quantity: 'Manual entry',
      calories: Number(manualForm.calories || 0),
      protein: Number(manualForm.protein || 0),
      carbs: Number(manualForm.carbs || 0),
      fat: Number(manualForm.fat || 0)
    });
  };

  return (
    <div className="relative">
      <label className="block text-lg font-bold text-brand-primary">
        Search for a food...
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search for a food..."
          className="mt-3 w-full rounded-2xl border border-emerald-200 bg-white px-5 py-4 text-lg font-semibold text-gray-950 outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
        />
      </label>

      {searching && (
        <p className="mt-3 text-lg font-semibold text-gray-700">Searching foods...</p>
      )}

      {error && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-lg font-semibold text-red-700">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-3">
          {results.map((food) => (
            <FoodResultCard
              key={`${food.food_name}-${food.calories}-${food.protein}`}
              food={food}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <form onSubmit={handleManualSubmit} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-lg font-bold text-amber-900">
            {message || 'No results found. Please enter nutrition values manually.'}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              value={manualForm.food_name}
              onChange={(event) => setManualForm({ ...manualForm, food_name: event.target.value })}
              placeholder="Food name"
              className="rounded-xl border border-amber-200 px-4 py-3 text-lg font-semibold"
              required
            />
            {['calories', 'protein', 'carbs', 'fat'].map((field) => (
              <input
                key={field}
                type="number"
                min="0"
                step="0.1"
                value={manualForm[field]}
                onChange={(event) => setManualForm({ ...manualForm, [field]: event.target.value })}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className="rounded-xl border border-amber-200 px-4 py-3 text-lg font-semibold"
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={logging}
            className="mt-4 w-full rounded-2xl bg-green-700 px-5 py-4 text-lg font-bold text-white transition hover:bg-green-800 disabled:opacity-60"
          >
            {logging ? 'Logging Food...' : 'Log Manually'}
          </button>
        </form>
      )}
    </div>
  );
}
