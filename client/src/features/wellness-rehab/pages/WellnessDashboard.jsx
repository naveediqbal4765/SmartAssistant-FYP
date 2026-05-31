// Module: Wellness & Rehabilitation | Phase 0 — Foundation
const metricCards = [
  { label: "Today's Exercise", value: '--', helper: 'Minutes completed' },
  { label: 'Calories Burned', value: '0', helper: 'Estimated calories' },
  { label: 'Sessions', value: '0', helper: 'Completed sessions' },
  { label: 'Streak', value: '0', helper: 'Active days' }
];

export default function WellnessDashboard() {
  return (
    <main className="min-h-[calc(100vh-6rem)] bg-brand-surface px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-[2rem] bg-white/95 p-6 ring-1 ring-emerald-100 sm:p-8">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand-muted">
            Phase 0 Foundation
          </p>
          <h1 className="mt-3 text-3xl font-bold text-brand-primary sm:text-4xl">
            Wellness & Rehabilitation
          </h1>
          <p className="mt-3 max-w-3xl text-lg leading-8 text-gray-700">
            Track daily movement, rehabilitation sessions, nutrition, and personalized wellness guidance.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => (
            <article
              key={card.label}
              className="rounded-[1.5rem] border border-emerald-100 bg-white p-6"
            >
              <p className="text-lg font-semibold text-brand-primary">{card.label}</p>
              <p className="mt-5 text-5xl font-bold text-gray-950">{card.value}</p>
              <p className="mt-4 text-base font-medium text-gray-700">{card.helper}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
