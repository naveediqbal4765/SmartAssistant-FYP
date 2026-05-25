import { useEffect, useRef, useState } from 'react';

const CHECK_INTERVAL_MS = 30000;
const PRE_ALERT_MINUTES = 30;
const ACTIVE_REPEAT_MS = 5 * 60 * 1000;
const ACTIVE_WINDOW_MS = 60 * 60 * 1000;

const getAppointmentDateTime = (appointment) => {
  if (!appointment?.date || !appointment?.time) return null;

  const dateTime = new Date(`${appointment.date}T${appointment.time}:00`);
  return Number.isNaN(dateTime.getTime()) ? null : dateTime;
};

export default function useAppointmentNotifications({ appointments = [], enabled = false }) {
  const preNotifiedRef = useRef(new Set());
  const activeNotifiedRef = useRef(new Map());
  const [dismissedAppointments, setDismissedAppointments] = useState({});
  const [activeNotification, setActiveNotification] = useState(null);

  useEffect(() => {
    if (!enabled || !appointments.length) return undefined;

    const checkAppointments = () => {
      const now = Date.now();

      for (const appointment of appointments) {
        const appointmentId = String(appointment?._id || '');
        if (!appointmentId || dismissedAppointments[appointmentId]) continue;

        const appointmentDateTime = getAppointmentDateTime(appointment);
        if (!appointmentDateTime) continue;

        const appointmentTime = appointmentDateTime.getTime();
        const preAlertTime = appointmentTime - PRE_ALERT_MINUTES * 60 * 1000;
        const preAlertDiff = now - preAlertTime;

        if (preAlertDiff >= 0 && preAlertDiff < CHECK_INTERVAL_MS && !preNotifiedRef.current.has(appointmentId)) {
          preNotifiedRef.current.add(appointmentId);
          setActiveNotification({
            type: 'pre',
            appointment,
            message: `Upcoming appointment in 30 minutes: ${appointment.title}`
          });
          return;
        }

        const activeDiff = now - appointmentTime;
        if (activeDiff < 0 || activeDiff > ACTIVE_WINDOW_MS) continue;

        const lastActiveNotification = activeNotifiedRef.current.get(appointmentId) || 0;
        if (now - lastActiveNotification >= ACTIVE_REPEAT_MS) {
          activeNotifiedRef.current.set(appointmentId, now);
          setActiveNotification({
            type: 'active',
            appointment,
            message: `Appointment now: ${appointment.title}`
          });
          return;
        }
      }
    };

    checkAppointments();
    const intervalId = setInterval(checkAppointments, CHECK_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [appointments, dismissedAppointments, enabled]);

  const dismissNotification = (appointmentId = activeNotification?.appointment?._id) => {
    if (!appointmentId) return;

    setDismissedAppointments((current) => ({
      ...current,
      [appointmentId]: true
    }));
    setActiveNotification(null);
  };

  return {
    activeNotification,
    dismissedAppointments,
    dismissNotification
  };
}
