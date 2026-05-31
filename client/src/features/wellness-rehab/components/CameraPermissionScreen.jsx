// Module: Wellness & Rehabilitation | Phase 4 — MediaPipe Integration
import { Camera } from 'lucide-react';

export default function CameraPermissionScreen({ exerciseName, onAllow, onDecline }) {
  return (
    <main className="min-h-[calc(100vh-6rem)] bg-brand-surface px-4 py-8 sm:px-6 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-3xl items-center justify-center">
        <article className="w-full rounded-[2rem] bg-white p-6 text-center shadow-lg sm:p-8">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-800">
            <Camera size={56} aria-hidden="true" />
          </div>
          <p className="mt-6 text-lg font-bold uppercase tracking-[0.16em] text-brand-muted">Camera Setup</p>
          <h1 className="mt-3 text-4xl font-bold text-brand-primary">{exerciseName}</h1>
          <p className="mt-6 text-2xl font-semibold leading-10 text-gray-800">
            To guide your exercise safely, we need access to your camera. Your video is processed on your device and is never recorded or sent anywhere.
          </p>
          <div className="mt-8 space-y-4">
            <button
              type="button"
              onClick={onAllow}
              className="w-full rounded-2xl bg-green-700 px-6 py-5 text-2xl font-bold text-white transition hover:bg-green-800"
            >
              Allow Camera
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="w-full rounded-2xl bg-gray-200 px-6 py-5 text-2xl font-bold text-gray-900 transition hover:bg-gray-300"
            >
              Skip Camera
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
