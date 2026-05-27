import { overlayLayers } from '../../../components/ui/overlayLayers';

export default function AppointmentNotification({ notification, onDismiss }) {
  if (!notification?.appointment) return null;

  return (
    <div className={`fixed bottom-6 right-6 ${overlayLayers.modal} w-full max-w-sm rounded-2xl border border-blue-200 bg-white p-5 shadow-2xl`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
        Appointment Notification
      </p>
      <h3 className="mt-2 text-xl font-bold text-gray-900">
        {notification.message}
      </h3>
      <p className="mt-2 text-gray-700">
        Time: <span className="font-semibold">{notification.appointment.time}</span>
      </p>
      {notification.appointment.notes && (
        <p className="mt-2 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
          {notification.appointment.notes}
        </p>
      )}
      <button
        type="button"
        onClick={() => onDismiss?.(notification.appointment._id)}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
      >
        Dismiss
      </button>
    </div>
  );
}
