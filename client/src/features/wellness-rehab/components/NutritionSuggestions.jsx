// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
const suggestionStyles = {
  hydration: 'border-blue-200 bg-blue-50 text-blue-900',
  nutrition: 'border-green-200 bg-green-50 text-green-900',
  activity: 'border-amber-200 bg-amber-50 text-amber-900',
  general: 'border-gray-200 bg-gray-50 text-gray-900'
};

const suggestionIcons = {
  hydration: '💧',
  nutrition: '🥗',
  activity: '🚶',
  general: 'ℹ️'
};

export default function NutritionSuggestions({ suggestions = [] }) {
  if (!suggestions.length) return null;

  return (
    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-3xl font-bold text-brand-primary">Nutrition Suggestions</h2>
      <div className="mt-5 space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.type}-${index}`}
            className={`rounded-2xl border p-4 text-lg font-semibold ${suggestionStyles[suggestion.type] || suggestionStyles.general}`}
          >
            <span className="mr-3 text-2xl" aria-hidden="true">
              {suggestionIcons[suggestion.type] || suggestionIcons.general}
            </span>
            {suggestion.message}
          </div>
        ))}
      </div>
    </section>
  );
}
