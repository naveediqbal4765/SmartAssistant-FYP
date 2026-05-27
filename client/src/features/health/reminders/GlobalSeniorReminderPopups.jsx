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
import {
  dismissMedicationReminder,
  fetchEligibleMedicationReminders,
  markMedicationReminderTaken,
  skipMedicationReminder
} from '../medications/medicationApi';

export const SENIOR_REMINDERS_REFRESH_EVENT = 'senior-reminders:refresh';

const REFRESH_INTERVAL_MS = 60000;
const APPOINTMENT_POPUP_VISIBLE_MS = 60000;
const PLAYED_REMINDERS_STORAGE_KEY = 'senior-reminders:played-alerts';

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

export default function GlobalSeniorReminderPopups({
  enabled = false,
  callReminderPopups = [],
  onDismissCallReminder
}) {
  const [appointmentReminders, setAppointmentReminders] = useState([]);
  const [medicationReminders, setMedicationReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const playedReminderKeysRef = useRef(getStorageSet(PLAYED_REMINDERS_STORAGE_KEY));

  const loadReminderSources = useCallback(async () => {
    if (!enabled) {
      setAppointmentReminders([]);
      setMedicationReminders([]);
      setLoading(false);
      return;
    }

    try {
      const [appointmentReminderData, medicationReminderData] = await Promise.all([
        fetchEligibleAppointmentReminders(),
        fetchEligibleMedicationReminders()
      ]);
      setAppointmentReminders(appointmentReminderData);
      setMedicationReminders(medicationReminderData);
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
        markSoundPlayed(`appointment:${appointment._id}:${appointment.reminderVersion}:${appointment.lastReminderShownAt || ''}`);
      }
    });

    medicationReminders.forEach((reminder) => {
      if (reminder?.occurrenceKey) {
        markSoundPlayed(`medication:${reminder.occurrenceKey}`);
      }
    });

    callReminderPopups.forEach((notification) => {
      if (notification?._id) {
        markSoundPlayed(`call:${notification._id}`);
      }
    });
  }, [appointmentReminders, callReminderPopups, enabled, markSoundPlayed, medicationReminders]);

  useEffect(() => {
    if (!enabled || !appointmentReminders.length) return undefined;

    const timers = appointmentReminders.map((appointment) => {
      const shownAt = appointment.lastReminderShownAt
        ? new Date(appointment.lastReminderShownAt).getTime()
        : Date.now();
      const remainingMs = Math.max(0, shownAt + APPOINTMENT_POPUP_VISIBLE_MS - Date.now());

      return window.setTimeout(() => {
        setAppointmentReminders((current) => current.filter((item) => (
          String(item._id) !== String(appointment._id)
            || item.reminderVersion !== appointment.reminderVersion
            || item.lastReminderShownAt !== appointment.lastReminderShownAt
        )));
      }, remainingMs);
    });

    return () => timers.forEach((timerId) => window.clearTimeout(timerId));
  }, [appointmentReminders, enabled]);

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

  const updateMedicationReminder = async (reminder, action) => {
    setMedicationReminders((current) => current.filter((item) => item.occurrenceKey !== reminder.occurrenceKey));

    try {
      if (action === 'taken') {
        await markMedicationReminderTaken(reminder.medicationId, reminder.occurrenceKey);
      } else if (action === 'skipped') {
        await skipMedicationReminder(reminder.medicationId, reminder.occurrenceKey);
      } else {
        await dismissMedicationReminder(reminder.medicationId, reminder.occurrenceKey);
      }
    } catch (err) {
      console.error('Failed to update medication reminder:', err);
      loadReminderSources();
    }
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
      {medicationReminders.map((reminder) => (
        <MedicationReminder
          key={reminder.occurrenceKey}
          enabled={!loading}
          activeReminder={reminder}
          onDismiss={(item) => updateMedicationReminder(item, 'dismissed')}
          onMarkTaken={(item) => updateMedicationReminder(item, 'taken')}
          onSkip={(item) => updateMedicationReminder(item, 'skipped')}
          floating={false}
        />
      ))}
      <ReminderNotificationPopup
        notifications={callReminderPopups}
        onDismiss={onDismissCallReminder}
        floating={false}
      />
    </div>
  );

  return createPortal(overlay, document.body);
}
