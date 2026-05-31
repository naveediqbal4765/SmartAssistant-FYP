// Module: Wellness & Rehabilitation | Phase 2 — Nutrition Tracking
const metrics = [
  { key: 'calories', label: 'Calories', unit: '', className: 'bg-amber-50 text-amber-800' },
  { key: 'protein', label: 'Protein', unit: 'g', className: 'bg-blue-50 text-blue-800' },
  { key: 'carbs', label: 'Carbs', unit: 'g', className: 'bg-green-50 text-green-800' },
  { key: 'fat', label: 'Fat', unit: 'g', className: 'bg-rose-50 text-rose-800' }
];

export default function NutritionSummaryCard({ totals = {} }) {
  return (
    <section className="rounded-[2rem] bg-white p-6">
      <h2 className="text-3xl font-bold text-brand-primary">Today's Nutrition Summary</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.key} className={`rounded-2xl p-5 ${metric.className}`}>
            <p className="text-lg font-bold">{metric.label}</p>
            <p className="mt-3 text-4xl font-bold">
              {Math.round(Number(totals[metric.key] || 0))}
              {metric.unit && <span className="text-xl"> {metric.unit}</span>}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
