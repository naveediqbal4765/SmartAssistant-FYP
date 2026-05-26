import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveConversation } from '../chat/services/chatApi';
import NotificationDropdown from './NotificationDropdown';
import useNotifications from './useNotifications';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    deleteNotification,
    clearNotifications
  } = useNotifications();

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      markRead(notification._id);
    }

    if (notification.type === 'chat_message') {
      try {
        const conversation = await resolveConversation({
          conversationId: notification.conversationId,
          fromUserId: notification.fromUserId,
          toUserId: notification.toUserId
        });

        if (conversation?.id) {
          setOpen(false);
          navigate(`/chat/${conversation.id}`);
        }
      } catch (err) {
        console.error('Failed to open chat notification:', err);
      }
    }
  };

  return (
    <div className="fixed right-8 top-6 z-[60]">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-800 shadow-lg transition hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          notifications={notifications}
          loading={loading}
          error={error}
          onNotificationClick={handleNotificationClick}
          onDeleteNotification={deleteNotification}
          onClearNotifications={clearNotifications}
        />
      )}
    </div>
  );
}
