import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ReminderNotificationPopup from '../../communication/notifications/ReminderNotificationPopup';
import { overlayLayers } from '../../../components/ui/overlayLayers';
import { playReminderSound } from '../../communication/audio/audioFeedback';
import AppointmentNotification from '../appointments/AppointmentNotification';
import {
  dismissAppointmentReminder,
  fetchEligibleAppointmentReminders
} from '../appointments/appointmentApi';
import MedicationReminder from '../medications/MedicationReminder';
import { fetchMedications } from '../medications/medicationApi';

export const SENIOR_REMINDERS_REFRESH_EVENT = 'senior-reminders:refresh';

const REFRESH_INTERVAL_MS = 60000;
const MEDICATION_CHECK_INTERVAL_MS = 30000;
const DISMISSED_MEDICATIONS_STORAGE_KEY = 'senior-reminders:dismissed-medications';
const PLAYED_REMINDERS_STORAGE_KEY = 'senior-reminders:played-alerts';

const getCurrentTimeKey = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const getDateKey = () => new Date().toISOString().slice(0, 10);

const getStorageSet = (storageKey) => {
  if (typeof window === 'undefined') return new Set();

  try {
    return new Set(JSON.parse(sessionStorage.getItem(storageKey) || '[]').map(String));
  } catch (err) {
    return new Set();
  }
};

const writeStorageSet = (storageKey, valueSet) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storageKey, JSON.stringify(Array.from(valueSet)));
};

const getMedicationReminderKey = (medication, timeKey = getCurrentTimeKey()) => (
  medication?._id ? `medication:${medication._id}:${getDateKey()}:${timeKey}` : ''
);

export default function GlobalSeniorReminderPopups({
  enabled = false,
  callReminderPopups = [],
  onDismissCallReminder
}) {
  const [appointmentReminders, setAppointmentReminders] = useState([]);
  const [medications, setMedications] = useState([]);
  const [activeMedicationReminder, setActiveMedicationReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const dismissedMedicationKeysRef = useRef(getStorageSet(DISMISSED_MEDICATIONS_STORAGE_KEY));
  const playedReminderKeysRef = useRef(getStorageSet(PLAYED_REMINDERS_STORAGE_KEY));

  const loadReminderSources = useCallback(async () => {
    if (!enabled) {
      setAppointmentReminders([]);
      setMedications([]);
      setLoading(false);
      return;
    }

    try {
      const [appointmentReminderData, medicationData] = await Promise.all([
        fetchEligibleAppointmentReminders(),
        fetchMedications()
      ]);
      setAppointmentReminders(appointmentReminderData);
      setMedications(medicationData);
    } catch (err) {
      console.error('Failed to load global senior reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    loadReminderSources();

    if (!enabled) return undefined;

    const handleRefresh = () => loadReminderSources();
    const intervalId = window.setInterval(loadReminderSources, REFRESH_INTERVAL_MS);

    window.addEventListener(SENIOR_REMINDERS_REFRESH_EVENT, handleRefresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(SENIOR_REMINDERS_REFRESH_EVENT, handleRefresh);
    };
  }, [enabled, loadReminderSources]);

  useEffect(() => {
    if (!enabled || loading || !medications.length) return undefined;

    const checkMedications = () => {
      const currentTime = getCurrentTimeKey();
      const dueMedication = medications.find((medication) => {
        const reminderKey = getMedicationReminderKey(medication, currentTime);
        return medication?.time === currentTime
          && reminderKey
          && !dismissedMedicationKeysRef.current.has(reminderKey);
      });

      setActiveMedicationReminder(dueMedication || null);
    };

    checkMedications();
    const intervalId = window.setInterval(checkMedications, MEDICATION_CHECK_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [enabled, loading, medications]);

  const markSoundPlayed = useCallback((reminderKey) => {
    if (!reminderKey || playedReminderKeysRef.current.has(reminderKey)) return;

    playedReminderKeysRef.current.add(reminderKey);
    writeStorageSet(PLAYED_REMINDERS_STORAGE_KEY, playedReminderKeysRef.current);
    playReminderSound();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    appointmentReminders.forEach((appointment) => {
      if (appointment?._id && appointment?.reminderVersion) {
        markSoundPlayed(`appointment:${appointment._id}:${appointment.reminderVersion}`);
      }
    });

    const medicationKey = getMedicationReminderKey(activeMedicationReminder);
    if (medicationKey) {
      markSoundPlayed(medicationKey);
    }

    callReminderPopups.forEach((notification) => {
      if (notification?._id) {
        markSoundPlayed(`call:${notification._id}`);
      }
    });
  }, [activeMedicationReminder, appointmentReminders, callReminderPopups, enabled, markSoundPlayed]);

  const dismissAppointment = async (appointmentId, reminderVersion) => {
    setAppointmentReminders((current) => current.filter((appointment) => (
      String(appointment._id) !== String(appointmentId)
        || appointment.reminderVersion !== reminderVersion
    )));

    try {
      await dismissAppointmentReminder(appointmentId, reminderVersion);
    } catch (err) {
      console.error('Failed to dismiss appointment reminder:', err);
      loadReminderSources();
    }
  };

  const dismissMedicationReminder = (medication) => {
    const reminderKey = getMedicationReminderKey(medication);
    if (reminderKey) {
      dismissedMedicationKeysRef.current.add(reminderKey);
      writeStorageSet(DISMISSED_MEDICATIONS_STORAGE_KEY, dismissedMedicationKeysRef.current);
    }
    setActiveMedicationReminder(null);
  };

  if (!enabled) return null;

  const overlay = (
    <div className={`pointer-events-none fixed bottom-6 right-6 ${overlayLayers.modal} flex w-full max-w-sm flex-col gap-3 px-4`}>
      {appointmentReminders.map((appointment) => (
        <AppointmentNotification
          key={`${appointment._id}:${appointment.reminderVersion}`}
          notification={{
            type: 'active',
            appointment,
            message: `Appointment reminder: ${appointment.title}`
          }}
          onDismiss={() => dismissAppointment(appointment._id, appointment.reminderVersion)}
          floating={false}
        />
      ))}
      <MedicationReminder
        enabled={!loading}
        activeReminder={activeMedicationReminder}
        onDismiss={dismissMedicationReminder}
        floating={false}
      />
      <ReminderNotificationPopup
        notifications={callReminderPopups}
        onDismiss={onDismissCallReminder}
        floating={false}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}
