// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
export default function FoodResultCard({ food, onSelect }) {
  return (
    <article className="rounded-2xl border border-emerald-100 bg-white p-4">
      <h4 className="text-xl font-bold text-brand-primary">{food.food_name}</h4>
      <div className="mt-3 grid grid-cols-2 gap-3 text-lg font-semibold text-gray-800 lg:grid-cols-4">
        <p>Calories: {Math.round(food.calories || 0)}</p>
        <p>Protein: {food.protein || 0}g</p>
        <p>Carbs: {food.carbs || 0}g</p>
        <p>Fat: {food.fat || 0}g</p>
      </div>
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="mt-4 w-full rounded-2xl bg-green-700 px-5 py-3 text-lg font-bold text-white transition hover:bg-green-800"
      >
        Add to Meal
      </button>
    </article>
  );
}
