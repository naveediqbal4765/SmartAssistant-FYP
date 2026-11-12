import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { overlayLayers } from '../../components/ui/overlayLayers';
import { resolveConversation } from '../communication/chat/services/chatApi';
import { getChatSocket } from '../communication/chat/services/socket';
import { fetchCaregiverEmergencies, getEmergencyErrorMessage } from './emergencyApi';

const MAX_VISIBLE = 3;

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const getGoogleMapsUrl = (location = {}) => {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng)
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : '';
};

/**
 * Emergency popup for caregivers when their senior sends an SOS.
 *
 * Shows the senior, the message, a map link and a Message Senior button.
 * There is no Accept button: only volunteers accept. The status line shows
 * whether a volunteer is on the way yet.
 *
 * Loads recent incidents on mount (so it returns after a reload) and refreshes
 * when an emergency alert or an "accepted" alert arrives live.
 */
export default function CaregiverEmergencyNotifications({ notificationState, enabled = false }) {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isCaregiver = enabled && currentUser.role === 'caregiver';
  const currentUserId = String(currentUser._id || currentUser.id || '');

  const [incidents, setIncidents] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [errors, setErrors] = useState({});

  const loadIncidents = useCallback(async () => {
    try {
      setIncidents(await fetchCaregiverEmergencies());
    } catch {
      // The popup is best effort; the bell notification still arrives.
    }
  }, []);

  useEffect(() => {
    if (!isCaregiver) return;
    loadIncidents();
  }, [isCaregiver, loadIncidents]);

  useEffect(() => {
    if (!isCaregiver) return undefined;

    const socket = getChatSocket();

    const handleNotification = (notification = {}) => {
      if (
        notification.emergencyId
        && (notification.alertType === 'EMERGENCY' || notification.alertType === 'EMERGENCY_ACCEPTED')
      ) {
        loadIncidents();
      }
    };

    socket.on('newNotification', handleNotification);
    // Catch up on anything missed while the socket was disconnected.
    socket.on('connect', loadIncidents);

    return () => {
      socket.off('newNotification', handleNotification);
      socket.off('connect', loadIncidents);
    };
  }, [isCaregiver, loadIncidents]);

  if (!isCaregiver) return null;

  const visible = incidents
    .filter((incident) => !dismissedIds.has(String(incident._id)))
    .slice(0, MAX_VISIBLE);

  if (!visible.length) return null;

  const dismiss = (incident) => {
    const id = String(incident._id);
    setDismissedIds((current) => new Set([...current, id]));

    // Clear the matching bell notifications so they do not stay unread.
    (notificationState?.notifications || [])
      .filter((notification) => !notification.isRead && String(notification.emergencyId || '') === id)
      .forEach((notification) => notificationState.markRead(notification._id));
  };

  const handleMessageSenior = async (incident) => {
    const seniorId = String(incident.seniorId || '');
    if (!seniorId) return;

    try {
      const conversation = await resolveConversation({
        fromUserId: seniorId,
        toUserId: currentUserId
      });
      navigate(`/chat/${conversation.id || conversation._id}`);
    } catch (err) {
      setErrors((current) => ({
        ...current,
        [String(incident._id)]: getEmergencyErrorMessage(err, 'Could not open the chat')
      }));
    }
  };

  return (
    <div
      className={`fixed left-1/2 top-24 w-[22rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 space-y-3 ${overlayLayers.popover}`}
    >
      {visible.map((incident) => {
        const id = String(incident._id);
        const mapsUrl = getGoogleMapsUrl(incident.location);
        const volunteerName = incident.acceptedVolunteer?.name;
        const accepted = incident.status === 'ACCEPTED';

        return (
          <div
            key={id}
            role="alert"
            className="motion-dropdown-in rounded-2xl border border-red-200 bg-white p-4 shadow-2xl"
          >
            <p className="font-bold text-red-700">
              Emergency: {incident.seniorName || 'Your senior'} needs help
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p>{incident.message}</p>
              {incident.createdAt && (
                <p className="text-gray-600">
                  Sent at {new Date(incident.createdAt).toLocaleTimeString()}
                </p>
              )}
              <p className={`font-semibold ${accepted ? 'text-green-700' : 'text-gray-700'}`}>
                {accepted
                  ? `${volunteerName || 'A volunteer'} is on the way`
                  : 'Waiting for a volunteer to accept'}
              </p>
              {mapsUrl && (
                <p>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-primary hover:underline"
                  >
                    View location on map
                  </a>
                </p>
              )}
            </div>

            {errors[id] && (
              <p className="mt-2 text-sm font-semibold text-red-700">{errors[id]}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => handleMessageSenior(incident)}>
                Message Senior
              </Button>
              <Button size="sm" variant="secondary" onClick={() => dismiss(incident)}>
                Dismiss
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
