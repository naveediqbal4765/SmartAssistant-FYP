import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { acceptTask, ignoreTask } from './taskApi';
import { getTaskCategoryUi, getTaskPriorityUi } from './taskUiConfig';
import { resolveConversation } from '../communication/chat/services/chatApi';
import { getChatSocket } from '../communication/chat/services/socket';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

const getSeniorId = (task) => String(task?.userId?._id || task?.userId || '');
const getSeniorName = (task) => task?.userId?.name || task?.senior?.name || task?.seniorName || 'Senior';

const getGoogleMapsUrl = (location = {}) => {
  const lat = Number(location.lat ?? location.coordinates?.lat);
  const lng = Number(location.lng ?? location.coordinates?.lng);
  return location.googleMapsUrl || (
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `https://www.google.com/maps?q=${lat},${lng}`
      : ''
  );
};

function LocationLine({ label, location }) {
  const address = location?.address || 'Not specified';
  const googleMapsUrl = getGoogleMapsUrl(location);

  return (
    <p>
      {label}: {address}
      {googleMapsUrl && (
        <>
          {' '}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-primary hover:underline"
          >
            View map
          </a>
        </>
      )}
    </p>
  );
}

export default function ActionableTaskNotifications({ notificationState }) {
  const navigate = useNavigate();
  const [inactiveTaskIds, setInactiveTaskIds] = useState(new Set());
  const currentUser = getCurrentUser();
  const currentUserId = String(currentUser._id || currentUser.id || '');

  useEffect(() => {
    const socket = getChatSocket();
    const markInactive = (payload = {}) => {
      const taskId = String(payload.task?._id || payload.taskId || '');
      if (!taskId) return;
      setInactiveTaskIds((current) => new Set([...current, taskId]));
    };
    const markIgnored = (payload = {}) => {
      const taskId = String(payload.task?._id || payload.taskId || '');
      if (!taskId) return;
      setInactiveTaskIds((current) => new Set([...current, taskId]));
    };

    socket.on('task_accepted', markInactive);
    socket.on('task_ignored', markIgnored);
    return () => {
      socket.off('task_accepted', markInactive);
      socket.off('task_ignored', markIgnored);
    };
  }, []);

  const taskNotifications = (notificationState.notifications || []).filter((notification) => (
    !notification.isRead
    && notification.type === 'task'
    && notification.task
    && !inactiveTaskIds.has(String(notification.task._id))
    && (
      (currentUser.role === 'volunteer' && notification.taskAction === 'created')
      || (currentUser.role === 'elder' && notification.taskAction === 'completed')
    )
  )).slice(0, 2);

  if (!taskNotifications.length) return null;

  const markRead = (notification) => {
    if (notification?._id) {
      notificationState.markRead(notification._id);
    }
  };

  const handleAccept = async (notification) => {
    try {
      await acceptTask(notification.task._id);
      markRead(notification);
      setInactiveTaskIds((current) => new Set([...current, String(notification.task._id)]));
      navigate('/task-requests?view=my');
    } catch (err) {
      markRead(notification);
      setInactiveTaskIds((current) => new Set([...current, String(notification.task._id)]));
    }
  };

  const handleIgnore = async (notification) => {
    await ignoreTask(notification.task._id);
    setInactiveTaskIds((current) => new Set([...current, String(notification.task._id)]));
    markRead(notification);
  };

  const handleMessageSenior = async (notification) => {
    const seniorId = getSeniorId(notification.task);
    if (!seniorId) return;
    const conversation = await resolveConversation({
      fromUserId: seniorId,
      toUserId: currentUserId
    });
    markRead(notification);
    navigate(`/chat/${conversation.id || conversation._id}`, {
      state: { taskId: notification.task._id }
    });
  };

  return (
    <div className="fixed right-6 top-24 z-[70] w-80 space-y-3">
      {taskNotifications.map((notification) => {
        const task = notification.task;
        const isCreatedTask = notification.taskAction === 'created';
        const priorityUi = getTaskPriorityUi(task.priority);
        return (
          <div key={notification._id} className="motion-dropdown-in rounded-2xl border border-green-100 bg-white p-4 shadow-2xl">
            <p className="font-bold text-brand-primary">{notification.title}</p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p className="font-semibold">{task.title}</p>
              <p className="font-semibold text-gray-600">
                👤 Requested by: {getSeniorName(task)}
                <span className="ml-2 rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-primary">
                  Senior
                </span>
              </p>
              <p>Category: {getTaskCategoryUi(task.category).label}</p>
              <LocationLine label="Pickup" location={task.pickupLocation || task.location} />
              <LocationLine label="Drop" location={task.dropLocation} />
              <p>
                Priority:{' '}
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${priorityUi.badgeClass}`}>
                  {priorityUi.label}
                </span>
              </p>
              <p>Scheduled: {task.scheduledTime ? new Date(task.scheduledTime).toLocaleString() : 'Not scheduled'}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {isCreatedTask ? (
                <>
                  <Button size="sm" onClick={() => handleAccept(notification)}>Accept Task</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleIgnore(notification)}>Ignore</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleMessageSenior(notification)}>
                    Message Senior
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => {
                  markRead(notification);
                  navigate('/task-requests');
                }}>
                  Review Task
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
