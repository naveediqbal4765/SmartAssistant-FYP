// Module: Wellness & Rehabilitation | Phase 6 — Audio Coaching
import { Volume2, VolumeX } from 'lucide-react';

const getSpeedLabel = (rate) => {
  if (rate <= 0.6) return { label: 'Very Slow', color: 'text-blue-600' };
  if (rate <= 0.9) return { label: 'Slow', color: 'text-emerald-600' };
  if (rate <= 1.1) return { label: 'Normal', color: 'text-emerald-700' };
  if (rate <= 1.3) return { label: 'Fast', color: 'text-amber-600' };
  return { label: 'Very Fast', color: 'text-red-500' };
};

const SPEED_STOPS = [0.5, 0.7, 0.9, 1.1, 1.3, 1.5];

export default function VoiceToggle({
  voiceEnabled,
  speechRate,
  isSpeaking,
  onToggle,
  onRateChange
}) {
  const Icon = voiceEnabled ? Volume2 : VolumeX;
  const rate = Number(speechRate);
  const fillPercent = ((rate - 0.5) / (1.5 - 0.5)) * 100;
  const speedInfo = getSpeedLabel(rate);

  return (
    <div className="flex flex-col gap-4 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">

      {/* Voice Toggle Button */}
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-11 items-center justify-center gap-2.5 rounded-xl px-5 py-2.5 text-sm font-bold transition-all duration-200 ${
          voiceEnabled
            ? 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <Icon size={20} aria-hidden="true" />
        {isSpeaking && (
          <span className="flex gap-0.5" aria-label="Speaking">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="inline-block w-0.5 rounded-full bg-white"
                style={{
                  height: '14px',
                  animation: `soundBar 0.8s ease-in-out ${i * 0.15}s infinite alternate`,
                }}
              />
            ))}
          </span>
        )}
        {voiceEnabled ? 'Voice On' : 'Voice Off'}
      </button>

      {/* Speed Slider */}
      {voiceEnabled && (
        <div className="flex flex-1 flex-col gap-2 lg:max-w-sm">

          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Speech Speed
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-bold ${speedInfo.color}`}>
                {speedInfo.label}
              </span>
              <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-700">
                {rate.toFixed(1)}x
              </span>
            </div>
          </div>

          {/* Custom Track */}
          <div className="relative h-5 w-full">
            {/* Track background */}
            <div className="absolute top-1/2 h-2 w-full -translate-y-1/2 overflow-hidden rounded-full bg-gray-100">
              {/* Filled portion */}
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${fillPercent}%` }}
              />
            </div>

            {/* Stop dots */}
            {SPEED_STOPS.map((stop) => {
              const pos = ((stop - 0.5) / 1.0) * 100;
              const isActive = rate >= stop;
              return (
                <div
                  key={stop}
                  className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-colors duration-150 ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-500'
                      : 'border-gray-300 bg-white'
                  }`}
                  style={{ left: `${pos}%` }}
                />
              );
            })}

            {/* Actual range input (invisible but functional) */}
            <input
              id="wellness-speech-rate"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={speechRate}
              onChange={(event) => onRateChange(event.target.value)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>

          {/* Labels */}
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[10px] font-semibold text-gray-400">Slow</span>
            <span className="text-[10px] font-semibold text-gray-400">Normal</span>
            <span className="text-[10px] font-semibold text-gray-400">Fast</span>
          </div>
        </div>
      )}

      {/* Sound bar animation keyframes */}
      <style>{`
        @keyframes soundBar {
          from { transform: scaleY(0.3); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}