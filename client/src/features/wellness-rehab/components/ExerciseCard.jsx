// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import Button from '../../../components/ui/Button';
import FeatureCard from '../../../components/ui/FeatureCard';

const categoryClasses = {
  mobility: 'bg-blue-100 text-blue-700',
  strength: 'bg-red-100 text-red-700',
  balance: 'bg-purple-100 text-purple-700',
  breathing: 'bg-teal-100 text-teal-700',
  stretching: 'bg-amber-100 text-amber-700'
};

const difficultyClasses = {
  beginner: 'bg-emerald-100 text-emerald-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700'
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export default function ExerciseCard({ exercise, onStart }) {
  const difficulty = exercise.difficulty || 'beginner';
  const category = exercise.category || 'general';

  return (
    <FeatureCard className="flex flex-col gap-4 p-5 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-bold text-brand-primary">{exercise.name}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${categoryClasses[category] || 'bg-gray-100 text-gray-700'}`}>
            {capitalize(category)}
          </span>
          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${difficultyClasses[difficulty] || difficultyClasses.beginner}`}>
            {capitalize(difficulty)}
          </span>
        </div>
        <p className="mt-2 text-sm text-gray-500">
        Target Area: {exercise.target_area ? capitalize(exercise.target_area) : '--'}
        </p>
        <p className="text-sm text-gray-500">
          Duration: {exercise.estimated_duration || '--'} minutes
        </p>
      </div>

      <Button
        onClick={() => onStart(exercise)}
        size="sm"
      >
        Start Exercise
      </Button>
    </FeatureCard>
  );
}