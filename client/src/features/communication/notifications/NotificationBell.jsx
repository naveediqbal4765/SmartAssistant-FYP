import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { resolveConversation } from '../chat/services/chatApi';
import { markNotificationAsConsumed } from './notificationConsumption';
import NotificationDropdown from './NotificationDropdown';
import { overlayLayers } from '../../../components/ui/overlayLayers';

export default function NotificationBell({
  className = `fixed right-8 top-6 ${overlayLayers.dropdown}`,
  notificationState
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markRead,
    deleteNotification,
    clearNotifications
  } = notificationState;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      markRead(notification._id);
    }

    if (notification.type === 'group_message' && notification.groupId) {
      markNotificationAsConsumed({
        groupId: notification.groupId,
        messageId: notification.messageId,
        entityType: 'group_message',
        entityId: notification.messageId
      }).catch(() => {});
      setOpen(false);
      navigate(`/groups/${notification.groupId}`, {
        state: { messageId: notification.messageId }
      });
      return;
    }

    if (notification.type === 'task' || notification.taskId || notification.entityType === 'task') {
      markNotificationAsConsumed({
        taskId: notification.taskId,
        entityType: 'task',
        entityId: notification.entityId || notification.taskId
      }).catch(() => {});
      setOpen(false);
      navigate('/task-requests');
      return;
    }

    if (notification.type === 'chat_message') {
      try {
        const conversation = await resolveConversation({
          conversationId: notification.conversationId,
          fromUserId: notification.fromUserId,
          toUserId: notification.toUserId
        });

        if (conversation?.id) {
          markNotificationAsConsumed({
            conversationId: conversation.id,
            messageId: notification.messageId,
            entityType: 'chat_message',
            entityId: notification.messageId
          }).catch(() => {});
          setOpen(false);
          navigate(`/chat/${conversation.id}`, {
            state: { messageId: notification.messageId }
          });
        }
      } catch (err) {
        console.error('Failed to open chat notification:', err);
      }
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="motion-interactive relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-900 shadow-lg hover:bg-gray-100"
        aria-label="Notifications"
      >
        <Bell size={24} className="text-brand-primary" />
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
