// Module: Wellness & Rehabilitation | Phase 6 — Audio Coaching
import { Volume2, VolumeX } from 'lucide-react';

export default function VoiceToggle({
  voiceEnabled,
  speechRate,
  isSpeaking,
  onToggle,
  onRateChange
}) {
  const Icon = voiceEnabled ? Volume2 : VolumeX;

  return (
    <div className="flex flex-col gap-4 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <button
        type="button"
        onClick={onToggle}
        className={`flex min-h-12 items-center justify-center gap-3 rounded-2xl px-5 py-3 text-lg font-bold transition ${
          voiceEnabled
            ? 'bg-green-700 text-white hover:bg-green-800'
            : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
        }`}
      >
        <Icon size={28} aria-hidden="true" />
        {isSpeaking && (
          <span className="h-3 w-3 animate-pulse rounded-full bg-green-300" aria-label="Speaking" />
        )}
        {voiceEnabled ? 'Voice On' : 'Voice Off'}
      </button>

      {voiceEnabled && (
        <div className="flex flex-1 flex-col gap-2 lg:max-w-xl">
          <div className="flex items-center justify-between gap-4">
            <label htmlFor="wellness-speech-rate" className="text-lg font-bold text-gray-900">
              Speed
            </label>
            <span className="text-lg font-bold text-gray-700">{Number(speechRate).toFixed(1)}x</span>
          </div>
          <input
            id="wellness-speech-rate"
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={speechRate}
            onChange={(event) => onRateChange(event.target.value)}
            className="h-3 w-full cursor-pointer accent-green-700"
          />
          <div className="flex items-center justify-between text-lg font-semibold text-gray-700">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
      )}
    </div>
  );
}
