// Module: Wellness & Rehabilitation | Phase 1 — Fitness Tracking
import { useEffect, useState } from 'react';
import Button from '../../../components/ui/Button';
import FeatureCard from '../../../components/ui/FeatureCard';

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

  const resetTimer = () => {
    setRemainingSeconds(defaultSeconds);
    setStatus('idle');
  };

  return (
    <FeatureCard className="p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-brand-primary">Rest Timer</h3>
        <p className="text-2xl font-bold tracking-wider text-gray-950">{formatTime(remainingSeconds)}</p>
      </div>
      {status === 'complete' && (
        <p className="mt-3 text-sm font-semibold text-emerald-600">Rest Complete! Resume Exercise.</p>
      )}

      <div className="mt-3 flex gap-2">
        <Button
          onClick={() => setStatus('running')}
          size="sm"
          variant="success"
        >
          Start Rest
        </Button>
        <Button
          onClick={() => setStatus('paused')}
          size="sm"
          variant="secondary"
        >
          Pause
        </Button>
        <Button
          onClick={resetTimer}
          size="sm"
          variant="ghost"
        >
          Reset
        </Button>
      </div>
    </FeatureCard>
  );
}
