// Module: Wellness & Rehabilitation | Phase 3 — Wellness Summary
// Note: Telemetry status will be added once IoT sensor module is integrated

export default function WellnessIntelligenceCard({ summary }) {
  const stats = [
    {
      label: 'Total Exercise Minutes',
      value: Math.round(summary?.totalExerciseMinutes || 0),
      className: 'bg-emerald-50 text-emerald-800'
    },
    {
      label: 'Sessions Completed',
      value: summary?.totalSessionsCompleted || 0,
      className: 'bg-blue-50 text-blue-800'
    },
    {
      label: 'Calories Burned from Exercise',
      value: Math.round(summary?.totalCaloriesBurned || 0),
      className: 'bg-amber-50 text-amber-800'
    },
    {
      label: 'Calories Consumed from Meals',
      value: Math.round(summary?.totalCaloriesConsumed || 0),
      className: 'bg-orange-50 text-orange-800'
    },
    {
      label: 'Protein Today',
      value: `${Math.round(summary?.totalProtein || 0)}g`,
      className: 'bg-indigo-50 text-indigo-800'
    }
  ];

  return (
    <section className="rounded-[2rem] bg-white p-6">
      <div>
        <h2 className="text-3xl font-bold text-brand-primary">Today&apos;s Wellness Summary</h2>
        <p className="mt-2 text-lg font-semibold text-gray-700">
          A simple view of today&apos;s exercise and nutrition progress.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <article key={stat.label} className={`rounded-2xl p-5 ${stat.className}`}>
            <p className="text-lg font-bold">{stat.label}</p>
            <p className="mt-3 text-4xl font-bold text-gray-950">{stat.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
