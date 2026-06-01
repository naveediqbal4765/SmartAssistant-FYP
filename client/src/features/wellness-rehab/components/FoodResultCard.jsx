// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
import Button from '../../../components/ui/Button';

export default function FoodResultCard({ food, onSelect }) {
  return (
    <article className="rounded-xl border border-gray-100 bg-white p-4">
      <h4 className="text-sm font-bold text-brand-primary">{food.food_name}</h4>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
        <p>Calories: {Math.round(food.calories || 0)}</p>
        <p>Protein: {food.protein || 0}g</p>
        <p>Carbs: {food.carbs || 0}g</p>
        <p>Fat: {food.fat || 0}g</p>
      </div>
      <Button
        onClick={() => onSelect(food)}
        size="sm"
        className="mt-3 w-full"
      >
        Add to Meal
      </Button>
    </article>
  );
}
