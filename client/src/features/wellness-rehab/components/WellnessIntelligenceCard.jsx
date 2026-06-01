// Module: Wellness & Rehabilitation | Phase 3 — Wellness Summary
// Note: Telemetry status will be added once IoT sensor module is integrated
import { CheckCircle, Dumbbell, Flame, Timer, Trophy, Utensils } from 'lucide-react';
import FeatureCard from '../../../components/ui/FeatureCard';

export default function WellnessIntelligenceCard({
  summary,
  streak = 0,
  exercisedToday = false
}) {
  const streakCardClass = exercisedToday
    ? 'border-emerald-200 bg-emerald-50 shadow-sm hover:shadow-md hover:-translate-y-0.5'
    : streak > 0
      ? 'border-amber-200 bg-amber-50 shadow-sm hover:shadow-md hover:-translate-y-0.5'
      : 'border-gray-100 bg-gray-50 shadow-sm hover:shadow-md hover:-translate-y-0.5';

  const streakValueClass = exercisedToday
    ? 'text-emerald-600'
    : streak > 0
      ? 'text-amber-600'
      : 'text-brand-primary';

  const stats = [
    {
      label: 'Exercise Minutes',
      value: Math.round(summary?.totalExerciseMinutes || 0),
      Icon: Timer,
      cardClassName: 'border-blue-100 bg-blue-50 shadow-sm hover:shadow-md hover:-translate-y-0.5',
      valueClassName: 'text-blue-600',
      iconClassName: 'text-blue-400'
    },
    {
      label: 'Sessions Today',
      value: summary?.totalSessionsCompleted || 0,
      Icon: CheckCircle,
      cardClassName: 'border-emerald-100 bg-emerald-50 shadow-sm hover:shadow-md hover:-translate-y-0.5',
      valueClassName: 'text-emerald-600',
      iconClassName: 'text-emerald-400'
    },
    {
      label: 'Calories Burned',
      value: Math.round(summary?.totalCaloriesBurned || 0),
      Icon: Flame,
      cardClassName: 'border-orange-100 bg-orange-50 shadow-sm hover:shadow-md hover:-translate-y-0.5',
      valueClassName: 'text-orange-600',
      iconClassName: 'text-orange-400'
    },
    {
      label: 'Calories Consumed',
      value: Math.round(summary?.totalCaloriesConsumed || 0),
      Icon: Utensils,
      cardClassName: 'border-amber-100 bg-amber-50 shadow-sm hover:shadow-md hover:-translate-y-0.5',
      valueClassName: 'text-amber-600',
      iconClassName: 'text-amber-400'
    },
    {
      label: 'Protein (g)',
      value: Math.round(summary?.totalProtein || 0),
      Icon: Dumbbell,
      cardClassName: 'border-purple-100 bg-purple-50 shadow-sm hover:shadow-md hover:-translate-y-0.5',
      valueClassName: 'text-purple-600',
      iconClassName: 'text-purple-400'
    },
    {
      label: 'Day Streak 🔥',
      value: streak || 0,
      Icon: Trophy,
      cardClassName: streakCardClass,
      valueClassName: streakValueClass,
      iconClassName: streakValueClass
    }
  ];

  return (
    <FeatureCard className="shadow-sm transition-shadow duration-200 hover:shadow-md">
      <h2 className="mb-4 text-xl font-bold text-brand-primary">
        Today&apos;s Wellness Summary
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className={`flex flex-col gap-1 rounded-2xl border p-4 transition-all duration-200 ${stat.cardClassName}`}
          >
            <stat.Icon
              size={20}
              className={stat.iconClassName || stat.valueClassName || 'text-brand-primary'}
              aria-hidden="true"
            />
            <p className={`text-3xl font-bold ${stat.valueClassName || 'text-brand-primary'}`}>
              {stat.value}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {stat.label}
            </p>
          </article>
        ))}
      </div>
    </FeatureCard>
  );
}