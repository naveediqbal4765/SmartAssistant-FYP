import { useRef, useState } from 'react';
import { overlayLayers } from '../../../components/ui/overlayLayers';
import { NotificationSkeletonList } from '../../../components/ui/Skeleton';

const SWIPE_THRESHOLD_PX = 48;

const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

export default function NotificationDropdown({
  notifications,
  loading,
  error,
  onNotificationClick,
  onDeleteNotification,
  onClearNotifications
}) {
  const [openDeleteId, setOpenDeleteId] = useState(null);
  const [swipeStartX, setSwipeStartX] = useState(null);
  const swipedNotificationRef = useRef(null);

  const handlePointerDown = (event, notificationId) => {
    setSwipeStartX(event.clientX);
    setOpenDeleteId((current) => (current === notificationId ? current : null));
  };

  const handlePointerUp = (event, notificationId) => {
    if (swipeStartX === null) return;

    const deltaX = event.clientX - swipeStartX;
    if (deltaX <= -SWIPE_THRESHOLD_PX) {
      setOpenDeleteId(notificationId);
      swipedNotificationRef.current = notificationId;
    } else if (deltaX >= SWIPE_THRESHOLD_PX / 2) {
      setOpenDeleteId(null);
      swipedNotificationRef.current = null;
    }

    setSwipeStartX(null);
  };

  const handleDelete = (event, notificationId) => {
    event.stopPropagation();
    onDeleteNotification?.(notificationId);
    setOpenDeleteId(null);
  };

  const handleClear = () => {
    onClearNotifications?.();
    setOpenDeleteId(null);
  };

  return (
    <div className={`motion-dropdown-in absolute right-0 top-full ${overlayLayers.dropdown} mt-3 w-80 overflow-hidden rounded-2xl border bg-white shadow-2xl`}>
      <div className="border-b px-4 py-3">
        <h3 className="font-bold text-gray-900">Notifications</h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading && <NotificationSkeletonList />}
        {error && <div className="p-4 text-red-600">{error}</div>}
        {!loading && !error && !notifications.length && (
          <div className="p-4 text-gray-500">No notifications yet.</div>
        )}
        {!loading && !error && notifications.map((notification) => (
          <div
            key={notification._id}
            className="relative overflow-hidden border-b last:border-b-0"
          >
            <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-600">
              <button
                type="button"
                onClick={(event) => handleDelete(event, notification._id)}
                className="h-full w-full text-sm font-semibold text-white"
              >
                Delete
              </button>
            </div>

            <button
              type="button"
              onPointerDown={(event) => handlePointerDown(event, notification._id)}
              onPointerUp={(event) => handlePointerUp(event, notification._id)}
              onPointerCancel={() => setSwipeStartX(null)}
              onClick={() => {
                if (swipedNotificationRef.current === notification._id) {
                  swipedNotificationRef.current = null;
                  return;
                }

                if (openDeleteId === notification._id) {
                  setOpenDeleteId(null);
                  return;
                }
                onNotificationClick(notification);
              }}
              className={`motion-interactive relative w-full touch-pan-y p-4 text-left hover:bg-gray-50 ${
                openDeleteId === notification._id ? '-translate-x-24' : 'translate-x-0'
              } ${notification.isRead ? 'bg-white' : 'bg-green-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{notification.title}</p>
                  <p className="mt-1 text-sm text-gray-700">{notification.message}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">
                    {notification.type} · {formatTime(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <span className="mt-1 h-2 w-2 rounded-full bg-green-600" />
                )}
              </div>
            </button>
          </div>
        ))}
      </div>

      {!loading && !error && notifications.length > 0 && (
        <div className="border-t bg-white p-3">
          <button
            type="button"
            onClick={handleClear}
            className="motion-interactive w-full rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Clear Notifications
          </button>
        </div>
      )}
    </div>
  );
}
