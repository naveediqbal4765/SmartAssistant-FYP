// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
import { Trash2 } from 'lucide-react';
import FoodSearchBar from './FoodSearchBar';

const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack'
};

const mealIcons = {
  breakfast: '☀️',
  lunch: '🌤️',
  dinner: '🌙',
  snack: '🥪'
};

const getSubtotal = (logs = []) => (
  logs.reduce((totals, log) => ({
    calories: totals.calories + Number(log.calories || 0),
    protein: totals.protein + Number(log.protein || 0),
    carbs: totals.carbs + Number(log.carbs || 0),
    fat: totals.fat + Number(log.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
);

export default function MealSection({ mealType, logs = [], onFoodLogged, onDelete, onClearAll }) {
  const subtotal = getSubtotal(logs);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-brand-primary">
          <span className="mr-2" aria-hidden="true">{mealIcons[mealType] || '🍽️'}</span>
          {mealLabels[mealType] || mealType}
        </h2>
        {logs.length > 0 && (
          <button
            type="button"
            onClick={() => onClearAll(mealType)}
            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {logs.length === 0 ? (
          <p className="rounded-xl bg-gray-50 p-3 text-sm text-gray-500">
            No foods logged yet for this meal.
          </p>
        ) : (
          logs.map((log) => (
            <article key={log._id} className="border-b border-gray-100 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-800">{log.food_name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Protein {log.protein || 0}g</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Carbs {log.carbs || 0}g</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Fat {log.fat || 0}g</span>
                  </div>
                </div>
                <p className="text-sm font-semibold text-brand-primary">{Math.round(log.calories || 0)} calories</p>
                <button
                  type="button"
                  onClick={() => onDelete(log._id)}
                  className="rounded-full p-1.5 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete food log"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-2 border-t border-gray-100 pt-2 text-xs font-semibold text-gray-500">
        Meal subtotal: {Math.round(subtotal.calories)} calories | {subtotal.protein.toFixed(1)}g protein | {subtotal.carbs.toFixed(1)}g carbs | {subtotal.fat.toFixed(1)}g fat
      </div>

      <div className="mt-5">
        <FoodSearchBar mealType={mealType} onFoodLogged={onFoodLogged} />
      </div>
    </div>
  );
}
