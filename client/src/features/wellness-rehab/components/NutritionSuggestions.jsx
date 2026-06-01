// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
const suggestionStyles = {
  hydration: 'border-blue-400 bg-blue-50/30',
  info: 'border-blue-400 bg-blue-50/30',
  nutrition: 'border-emerald-400 bg-emerald-50/30',
  activity: 'border-amber-400 bg-amber-50/30',
  general: 'border-gray-300 bg-gray-50/30'
};

const suggestionTitles = {
  hydration: 'Hydration',
  info: 'Wellness Tip',
  nutrition: 'Nutrition',
  activity: 'Activity',
  general: 'General Guidance'
};

export default function NutritionSuggestions({ suggestions = [] }) {
  if (!suggestions.length) return null;

  return (
    <section>
      <div>
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.type}-${index}`}
            className={`mb-3 rounded-2xl border-l-4 bg-white p-5 shadow-sm ${suggestionStyles[suggestion.type] || suggestionStyles.general}`}
          >
            <h3 className="text-lg font-bold text-gray-800">
              {suggestion.title || suggestionTitles[suggestion.type] || suggestionTitles.general}
            </h3>
            <p className="mt-1 text-lg text-gray-600">{suggestion.message}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
