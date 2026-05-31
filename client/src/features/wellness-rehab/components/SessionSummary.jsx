// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
const formatDuration = (minutes = 0) => `${Math.max(0, Number(minutes || 0)).toFixed(1)} minutes`;

export default function SessionSummary({ session, onClose }) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4">
      <section className="w-full max-w-lg rounded-[2rem] bg-white p-7 text-center">
        <p className="text-lg font-bold uppercase tracking-[0.16em] text-brand-muted">Session Complete</p>
        <h2 className="mt-3 text-3xl font-bold text-brand-primary">{session.exercise_type}</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-5">
            <p className="text-lg font-semibold text-emerald-800">Duration Completed</p>
            <p className="mt-2 text-3xl font-bold text-gray-950">{formatDuration(session.duration)}</p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-5">
            <p className="text-lg font-semibold text-amber-800">Calories Burned</p>
            <p className="mt-2 text-3xl font-bold text-gray-950">{Math.round(session.calories_burned || 0)}</p>
          </div>
        </div>
        <p className="mt-6 text-2xl font-bold text-green-800">Great job! Keep it up!</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-2xl bg-green-700 px-5 py-4 text-lg font-bold text-white transition hover:bg-green-800"
        >
          Close
        </button>
      </section>
    </div>
  );
}
