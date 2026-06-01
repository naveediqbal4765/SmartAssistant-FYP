// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import Button from '../../../components/ui/Button';

const formatDuration = (minutes = 0) => `${Math.max(0, Number(minutes || 0)).toFixed(1)} minutes`;

export default function SessionSummary({ session, onClose }) {
  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <section className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-brand-primary">Session Complete</h2>
        <p className="mb-4 text-sm text-gray-500">{session.exercise_type}</p>
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-2xl font-bold text-brand-primary">{formatDuration(session.duration)}</p>
            <p className="mt-1 text-sm text-gray-500">Duration Completed</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
            <p className="text-2xl font-bold text-brand-primary">{Math.round(session.calories_burned || 0)}</p>
            <p className="mt-1 text-sm text-gray-500">Calories Burned</p>
          </div>
        </div>
        <p className="mb-4 text-center text-sm font-semibold text-emerald-600">Great job! Keep it up!</p>
        <Button
          onClick={onClose}
          size="sm"
          className="w-full"
        >
          Close
        </Button>
      </section>
    </div>
  );
}
