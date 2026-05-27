import { overlayLayers } from '../../../components/ui/overlayLayers';

export default function ReminderNotificationPopup({ notifications = [], onDismiss, floating = true }) {
  if (!notifications.length) return null;

  const containerClass = floating
    ? `fixed bottom-6 right-6 ${overlayLayers.modal} flex w-full max-w-sm flex-col gap-3 px-4`
    : 'flex w-full flex-col gap-3';

  return (
    <div className={containerClass}>
      {notifications.map((notification) => (
        <div
          key={notification._id}
          className="motion-modal-in pointer-events-auto rounded-2xl border border-green-200 bg-white p-5 shadow-xl shadow-gray-900/15"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700">Call Reminder</p>
          <h3 className="mt-2 text-xl font-bold text-gray-900">{notification.title}</h3>
          <p className="mt-2 text-gray-700">{notification.message}</p>
          <button
            type="button"
            onClick={() => onDismiss?.(notification._id)}
            className="motion-interactive mt-4 w-full rounded-xl bg-brand-primary px-4 py-3 font-semibold text-white hover:bg-brand-secondary"
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}
