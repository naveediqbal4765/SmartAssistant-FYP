// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration

const getScoreColor = (poseScore) => {
  if (poseScore >= 75) return 'bg-green-600';
  if (poseScore >= 50) return 'bg-amber-500';
  return 'bg-red-600';
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

export default function RepCounter({ count, poseScore, angle, phase }) {
  const badge = getPhaseBadge(phase);
  const normalizedScore = Math.max(0, Math.min(100, Number(poseScore || 0)));

  return (
    <section className="rounded-[2rem] bg-white p-6 text-center">
      <p className="text-lg font-bold uppercase tracking-[0.16em] text-brand-muted">Repetitions</p>
      <p className="mt-3 text-8xl font-bold text-gray-950">{count || 0}</p>
      <span className={`mt-5 inline-flex rounded-full px-5 py-3 text-lg font-bold ${badge.className}`}>
        {badge.label}
      </span>

      <div className="mt-8 text-left">
        <div className="flex items-center justify-between gap-4">
          <p className="text-lg font-bold text-gray-800">Form Score</p>
          <p className="text-lg font-bold text-gray-950">{Math.round(normalizedScore)}%</p>
        </div>
        <div className="mt-3 h-5 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full rounded-full transition-all ${getScoreColor(normalizedScore)}`}
            style={{ width: `${normalizedScore}%` }}
          />
        </div>
      </div>

      <p className="mt-6 text-2xl font-bold text-gray-900">
        Joint Angle: {Number(angle || 0).toFixed(1)}°
      </p>
    </section>
  );
}
