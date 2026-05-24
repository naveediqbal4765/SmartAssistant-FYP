const formatTime = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString();
};

export default function NotificationDropdown({
  notifications,
  loading,
  error,
  onNotificationClick
}) {
  return (
    <div className="absolute right-0 top-full z-[60] mt-3 w-80 overflow-hidden rounded-2xl border bg-white shadow-2xl">
      <div className="border-b px-4 py-3">
        <h3 className="font-bold text-gray-900">Notifications</h3>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {loading && <div className="p-4 text-gray-500">Loading notifications...</div>}
        {error && <div className="p-4 text-red-600">{error}</div>}
        {!loading && !error && !notifications.length && (
          <div className="p-4 text-gray-500">No notifications yet.</div>
        )}
        {!loading && !error && notifications.map((notification) => (
          <button
            key={notification._id}
            type="button"
            onClick={() => onNotificationClick(notification)}
            className={`w-full border-b p-4 text-left last:border-b-0 hover:bg-gray-50 ${
              notification.isRead ? 'bg-white' : 'bg-green-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">{notification.title}</p>
                <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-gray-400">
                  {notification.type} · {formatTime(notification.createdAt)}
                </p>
              </div>
              {!notification.isRead && (
                <span className="mt-1 h-2 w-2 rounded-full bg-green-600" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
