// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
const metrics = [
  { key: 'calories', label: 'Calories', unit: '', className: 'bg-amber-50 text-amber-600' },
  { key: 'protein', label: 'Protein', unit: 'g', className: 'bg-blue-50 text-blue-600' },
  { key: 'carbs', label: 'Carbs', unit: 'g', className: 'bg-emerald-50 text-emerald-600' },
  { key: 'fat', label: 'Fat', unit: 'g', className: 'bg-rose-50 text-rose-600' }
];

export default function NutritionSummaryCard({ totals = {} }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {metrics.map((metric) => (
        <article key={metric.key} className={`rounded-xl border border-gray-100 bg-white p-4 ${metric.className}`}>
          <p className="text-2xl font-bold">
            {Math.round(Number(totals[metric.key] || 0))}
            {metric.unit && <span className="text-xl"> {metric.unit}</span>}
          </p>
          <p className="mt-1 text-sm">{metric.label}</p>
        </article>
      ))}
    </div>
  );
}
