import { useEffect, useRef, useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';

const CHECK_INTERVAL_MS = 30000;

const getCurrentTimeKey = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const getDateKey = () => new Date().toISOString().slice(0, 10);

export default function MedicationReminder({ medications = [], enabled = false }) {
  const notifiedRef = useRef(new Set());
  const [activeReminder, setActiveReminder] = useState(null);

  useEffect(() => {
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
  }, [enabled, medications]);

  if (!enabled || !activeReminder) return null;

  return (
    <div className={`fixed bottom-6 right-6 ${overlayLayers.modal} w-full max-w-sm rounded-2xl border border-green-200 bg-white p-5 shadow-2xl`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Medication Reminder</p>
      <h3 className="mt-2 text-xl font-bold text-gray-900">
        Time to take {activeReminder.name}
      </h3>
      <p className="mt-2 text-gray-700">
        Dosage: <span className="font-semibold">{activeReminder.dosage}</span>
      </p>
      {activeReminder.notes && (
        <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {activeReminder.notes}
        </p>
      )}
      <button
        type="button"
        onClick={() => setActiveReminder(null)}
        className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700"
      >
        Dismiss
      </button>
    </div>
  );
}
