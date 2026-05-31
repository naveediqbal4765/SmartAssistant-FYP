// Module: Wellness & Rehabilitation | Phase 3 — Static Suggestions
// Note: Will be replaced with telemetry-based suggestions once IoT sensor module is integrated
import { useNavigate } from 'react-router-dom';

const borderClasses = {
  info: 'border-blue-500 bg-blue-50',
  success: 'border-green-500 bg-green-50'
};

const suggestions = [
  {
    type: 'info',
    title: 'Morning Mobility',
    message: 'Start your day with gentle mobility exercises to keep your joints flexible.',
    pills: ['Shoulder Raise', 'Neck Stretch', 'Ankle Circles']
  },
  {
    type: 'success',
    title: 'Breathing Exercise',
    message: 'Deep breathing exercises help improve oxygen levels and reduce stress.',
    pills: ['Deep Breathing']
  },
  {
    type: 'info',
    title: 'Stay Active',
    message: 'Light activity throughout the day keeps your energy levels stable.',
    pills: ['Seated March', 'Wrist Rotation', 'Wall Push']
  }
];

export default function ExerciseSuggestions() {
  const navigate = useNavigate();

  return (
    <section className="space-y-4">
      <div className="rounded-[1.5rem] bg-gray-100 p-5 text-lg font-semibold text-gray-700">
        <span className="mr-2" aria-hidden="true">ℹ️</span>
        Personalized suggestions will be available once your health device is connected.
      </div>
      {suggestions.map((suggestion, index) => (
        <article
          key={`${suggestion.title}-${index}`}
          className={`rounded-[1.5rem] border-l-8 p-6 ${borderClasses[suggestion.type] || borderClasses.info}`}
        >
          <h2 className="text-2xl font-bold text-gray-950">{suggestion.title}</h2>
          <p className="mt-3 text-lg font-semibold leading-8 text-gray-800">{suggestion.message}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            {suggestion.pills.map((exerciseName) => (
              <button
                key={exerciseName}
                type="button"
                onClick={() => navigate('/wellness/library')}
                className="rounded-full bg-white px-5 py-3 text-lg font-bold text-brand-primary ring-1 ring-brand-primary transition hover:bg-brand-primary hover:text-white"
              >
                {exerciseName}
              </button>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}
