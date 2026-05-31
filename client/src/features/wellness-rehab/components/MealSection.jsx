// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
import FoodSearchBar from './FoodSearchBar';

const mealLabels = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack'
};

const getSubtotal = (logs = []) => (
  logs.reduce((totals, log) => ({
    calories: totals.calories + Number(log.calories || 0),
    protein: totals.protein + Number(log.protein || 0),
    carbs: totals.carbs + Number(log.carbs || 0),
    fat: totals.fat + Number(log.fat || 0)
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
);

export default function MealSection({ mealType, logs = [], onFoodLogged }) {
  const subtotal = getSubtotal(logs);

  return (
    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-3xl font-bold text-brand-primary">{mealLabels[mealType] || mealType}</h2>

      <div className="mt-5 space-y-3">
        {logs.length === 0 ? (
          <p className="rounded-2xl bg-gray-50 p-4 text-lg font-semibold text-gray-700">
            No foods logged yet for this meal.
          </p>
        ) : (
          logs.map((log) => (
            <article key={log._id} className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
              <h3 className="text-xl font-bold text-gray-950">{log.food_name}</h3>
              <div className="mt-3 grid grid-cols-2 gap-3 text-lg font-semibold text-gray-800 lg:grid-cols-4">
                <p>Calories: {Math.round(log.calories || 0)}</p>
                <p>Protein: {log.protein || 0}g</p>
                <p>Carbs: {log.carbs || 0}g</p>
                <p>Fat: {log.fat || 0}g</p>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="mt-5 rounded-2xl bg-brand-surface/40 p-4 text-lg font-bold text-brand-primary">
        Meal subtotal: {Math.round(subtotal.calories)} calories | {subtotal.protein.toFixed(1)}g protein | {subtotal.carbs.toFixed(1)}g carbs | {subtotal.fat.toFixed(1)}g fat
      </div>

      <div className="mt-5">
        <FoodSearchBar mealType={mealType} onFoodLogged={onFoodLogged} />
      </div>
    </section>
  );
}
