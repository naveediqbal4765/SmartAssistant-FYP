// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
const categoryClasses = {
  mobility: 'bg-blue-100 text-blue-800',
  strength: 'bg-emerald-100 text-emerald-800',
  balance: 'bg-purple-100 text-purple-800',
  breathing: 'bg-cyan-100 text-cyan-800',
  stretching: 'bg-amber-100 text-amber-800'
};

export default function ExerciseCard({ exercise, onStart }) {
  return (
    <article className="flex h-full flex-col rounded-[1.5rem] border border-emerald-100 bg-white p-6">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-brand-primary">{exercise.name}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <span className={`rounded-full px-4 py-2 text-lg font-bold ${categoryClasses[exercise.category] || 'bg-gray-100 text-gray-800'}`}>
            {exercise.category || 'general'}
          </span>
          <span className="rounded-full bg-green-100 px-4 py-2 text-lg font-bold text-green-800">
            {exercise.difficulty || 'beginner'}
          </span>
        </div>
        <p className="mt-5 text-lg font-semibold text-gray-800">
          Target area: <span className="text-gray-950">{exercise.target_area || '--'}</span>
        </p>
        <p className="mt-3 text-lg font-semibold text-gray-800">
          Estimated duration: <span className="text-gray-950">{exercise.estimated_duration || '--'} minutes</span>
        </p>
      </div>

      <button
        type="button"
        onClick={() => onStart(exercise)}
        className="mt-6 w-full rounded-2xl bg-green-700 px-5 py-4 text-lg font-bold text-white transition hover:bg-green-800 focus:outline-none focus:ring-4 focus:ring-green-200"
      >
        Start Exercise
      </button>
    </article>
  );
}
