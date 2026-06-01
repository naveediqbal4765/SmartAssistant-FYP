// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
import FeatureCard from '../../../components/ui/FeatureCard';

const getScoreConfig = (poseScore) => {
  if (poseScore >= 75) return {
    bar: 'bg-emerald-500',
    glow: 'shadow-[0_0_8px_2px_rgba(52,211,153,0.4)]',
    track: 'bg-emerald-100',
    label: 'Good Form',
    labelClass: 'text-emerald-600'
  };
  if (poseScore >= 50) return {
    bar: 'bg-amber-400',
    glow: 'shadow-[0_0_8px_2px_rgba(251,191,36,0.4)]',
    track: 'bg-amber-100',
    label: 'Needs Work',
    labelClass: 'text-amber-600'
  };
  return {
    bar: 'bg-red-500',
    glow: 'shadow-[0_0_8px_2px_rgba(239,68,68,0.4)]',
    track: 'bg-red-100',
    label: 'Poor Form',
    labelClass: 'text-red-600'
  };
};

const getPhaseBadge = (phase) => {
  const badges = {
    center: { label: 'Center Position', className: 'bg-gray-100 text-gray-800' },
    left: { label: 'Left Tilt', className: 'bg-green-100 text-green-800' },
    right: { label: 'Right Tilt', className: 'bg-green-100 text-green-800' },
    down: { label: 'Return Position', className: 'bg-gray-100 text-gray-800' },
    up: { label: 'Good Position', className: 'bg-green-100 text-green-800' },
    sitting: { label: 'Sitting', className: 'bg-gray-100 text-gray-800' },
    standing: { label: 'Standing', className: 'bg-green-100 text-green-800' },
    rest: { label: 'Rest', className: 'bg-gray-100 text-gray-800' },
    'left-up': { label: 'Left Knee Up', className: 'bg-green-100 text-green-800' },
    'right-up': { label: 'Right Knee Up', className: 'bg-green-100 text-green-800' },
    bent: { label: 'Arms Bent', className: 'bg-gray-100 text-gray-800' },
    extended: { label: 'Arms Extended', className: 'bg-green-100 text-green-800' }
  };

  return badges[phase] || { label: 'Return Position', className: 'bg-gray-100 text-gray-800' };
};

export default function RepCounter({ count, poseScore, angle, phase, correctionsCount = null }) {
  const badge = getPhaseBadge(phase);
  const normalizedScore = Math.max(0, Math.min(100, Number(poseScore || 0)));
  const scoreConfig = getScoreConfig(normalizedScore);

  return (
    <FeatureCard className="p-5">
      <div className="grid grid-cols-2 items-center gap-4">

        {/* Left — Rep Count */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-muted">Repetitions</p>
          <p className="text-5xl font-bold text-brand-primary">{count || 0}</p>
          <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badge.className}`}>
            {badge.label}
          </span>
        </div>

        {/* Right — Form Score */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Form Score</p>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${scoreConfig.labelClass}`}>{scoreConfig.label}</span>
              <span className="text-sm font-bold text-gray-800">{Math.round(normalizedScore)}%</span>
            </div>
          </div>

          {/* Custom Progress Bar */}
          <div className={`relative mt-2 h-4 w-full overflow-hidden rounded-full ${scoreConfig.track}`}>
            {/* Segmented tick marks */}
            {[25, 50, 75].map((tick) => (
              <div
                key={tick}
                className="absolute top-0 z-10 h-full w-px bg-white/60"
                style={{ left: `${tick}%` }}
              />
            ))}
            {/* Animated fill */}
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${scoreConfig.bar} ${scoreConfig.glow}`}
              style={{ width: `${normalizedScore}%` }}
            />
          </div>

          {/* Tick labels */}
          <div className="mt-1 flex justify-between px-0.5">
            <span className="text-[10px] text-gray-400">0</span>
            <span className="text-[10px] text-gray-400">25</span>
            <span className="text-[10px] text-gray-400">50</span>
            <span className="text-[10px] text-gray-400">75</span>
            <span className="text-[10px] text-gray-400">100</span>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Joint Angle: {Number(angle || 0).toFixed(1)}°
          </p>
          {correctionsCount !== null && (
            <p className="mt-1 text-sm text-gray-500">Form Corrections: {correctionsCount}</p>
          )}
        </div>

      </div>
    </FeatureCard>
  );
}