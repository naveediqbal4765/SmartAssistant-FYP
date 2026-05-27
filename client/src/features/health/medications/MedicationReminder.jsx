import { useEffect, useRef, useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

const CHECK_INTERVAL_MS = 30000;

const getCurrentTimeKey = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const getDateKey = () => new Date().toISOString().slice(0, 10);

export default function MedicationReminder({
  medications = [],
  enabled = false,
  floating = true,
  activeReminder: controlledReminder,
  onDismiss,
  onMarkTaken,
  onSkip
}) {
  const notifiedRef = useRef(new Set());
  const [activeReminder, setActiveReminder] = useState(null);
  const isControlled = controlledReminder !== undefined;
  const visibleReminder = isControlled ? controlledReminder : activeReminder;

  useEffect(() => {
    if (isControlled) return undefined;
    if (!enabled || !medications.length) return undefined;

    const checkMedications = () => {
      const currentTime = getCurrentTimeKey();
      const today = getDateKey();

      const dueMedication = medications.find((medication) => {
        if (!medication?._id || medication.time !== currentTime) return false;

        const reminderKey = `${medication._id}:${today}:${currentTime}`;
        if (notifiedRef.current.has(reminderKey)) return false;

        notifiedRef.current.add(reminderKey);
        return true;
      });

      if (dueMedication) {
        setActiveReminder(dueMedication);
      }
    };

    checkMedications();
    const intervalId = setInterval(checkMedications, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [enabled, isControlled, medications]);

  if (!enabled || !visibleReminder) return null;

  const containerClass = floating
    ? `fixed bottom-6 right-6 ${overlayLayers.modal} w-full max-w-sm rounded-2xl border border-green-200 bg-white p-5 shadow-2xl`
    : 'motion-modal-in pointer-events-auto w-full rounded-2xl border border-green-200 bg-white p-5 shadow-xl shadow-gray-900/15';

  return (
    <div className={containerClass}>
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Medication Reminder</p>
      <h3 className="mt-2 text-xl font-bold text-gray-900">
        Time to take {visibleReminder.name}
      </h3>
      <p className="mt-2 text-gray-700">
        Dosage: <span className="font-semibold">{visibleReminder.dosage}</span>
      </p>
      {visibleReminder.scheduledFor && (
        <p className="mt-2 text-gray-700">
          Scheduled: <span className="font-semibold">{new Date(visibleReminder.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </p>
      )}
      {visibleReminder.notes && (
        <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {visibleReminder.notes}
        </p>
      )}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => {
            if (isControlled) {
              onMarkTaken?.(visibleReminder);
              return;
            }
            setActiveReminder(null);
          }}
          className="rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
        >
          Taken
        </button>
        <button
          type="button"
          onClick={() => {
            if (isControlled) {
              onSkip?.(visibleReminder);
              return;
            }
            setActiveReminder(null);
          }}
          className="rounded-xl bg-yellow-100 px-4 py-3 font-semibold text-yellow-800 hover:bg-yellow-200"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => {
            if (isControlled) {
              onDismiss?.(visibleReminder);
              return;
            }
            setActiveReminder(null);
          }}
          className="rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-800 hover:bg-gray-200"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
