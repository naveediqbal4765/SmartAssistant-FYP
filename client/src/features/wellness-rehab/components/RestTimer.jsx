// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import { useEffect, useMemo, useState } from 'react';

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export default function RestTimer({ defaultSeconds = 60 }) {
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSeconds);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (status !== 'running') return undefined;

    const timerId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          setStatus('complete');
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [status]);

  const statusClasses = useMemo(() => {
    if (status === 'running') return 'border-green-300 bg-green-50 text-green-800';
    if (status === 'paused') return 'border-amber-300 bg-amber-50 text-amber-800';
    return 'border-gray-200 bg-gray-50 text-gray-800';
  }, [status]);

  const resetTimer = () => {
    setRemainingSeconds(defaultSeconds);
    setStatus('idle');
  };

  return (
    <section className={`rounded-[1.5rem] border p-6 ${statusClasses}`}>
      <h2 className="text-2xl font-bold">Rest Timer</h2>
      <p className="mt-4 text-5xl font-bold tracking-wider">{formatTime(remainingSeconds)}</p>
      {status === 'complete' && (
        <p className="mt-4 text-2xl font-bold text-green-800">Rest Complete! Resume Exercise.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setStatus('running')}
          className="rounded-2xl bg-green-700 px-5 py-4 text-lg font-bold text-white transition hover:bg-green-800"
        >
          Start Rest
        </button>
        <button
          type="button"
          onClick={() => setStatus('paused')}
          className="rounded-2xl bg-amber-500 px-5 py-4 text-lg font-bold text-white transition hover:bg-amber-600"
        >
          Pause
        </button>
        <button
          type="button"
          onClick={resetTimer}
          className="rounded-2xl bg-gray-700 px-5 py-4 text-lg font-bold text-white transition hover:bg-gray-800"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
