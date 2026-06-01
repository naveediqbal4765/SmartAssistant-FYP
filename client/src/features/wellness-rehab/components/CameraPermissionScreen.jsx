// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
import { Camera } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function CameraPermissionScreen({ exerciseName, onAllow, onDecline, onBack }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 pt-20">
      <style>
        {'@keyframes fadeInScale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }'}
      </style>
      <section className="w-full max-w-sm animate-[fadeInScale_0.2s_ease-out] rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
          <Camera size={28} aria-hidden="true" />
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-brand-muted">Camera Access</p>
        <h1 className="mt-1 text-lg font-bold text-brand-primary">{exerciseName}</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          To guide your exercise safely, we need your camera. Your video stays on your device and is never recorded.
        </p>
        <div className="mt-5 space-y-2">
          <Button
            onClick={onAllow}
            size="sm"
            className="w-full"
          >
            Allow Camera
          </Button>
          <Button
            variant="secondary"
            onClick={onDecline}
            size="sm"
            className="w-full"
          >
            Skip Camera
          </Button>
        </div>
        {onBack && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              ← Back to Library
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
