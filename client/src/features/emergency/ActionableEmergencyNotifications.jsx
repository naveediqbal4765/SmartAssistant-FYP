import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { overlayLayers } from '../../components/ui/overlayLayers';
import { resolveConversation } from '../communication/chat/services/chatApi';
import { getChatSocket } from '../communication/chat/services/socket';
import { acceptEmergency, fetchActiveEmergencies, getEmergencyErrorMessage } from './emergencyApi';

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

const withoutIncident = (list, id) => list.filter((incident) => String(incident._id) !== id);

/**
 * Accept popup for volunteers when a senior sends an SOS.
 *
 * - Loads still-ACTIVE emergencies on mount, so the popup comes back after a
 *   page reload or a late login (saved notifications do not keep emergency
 *   details).
 * - Refreshes when a new emergency alert arrives live.
 * - Closes by itself when another volunteer accepts.
 *
 * Nothing here changes the task popup or the notification bell.
 */
export default function ActionableEmergencyNotifications({ notificationState, enabled = false }) {
  const navigate = useNavigate();
  const isVolunteer = enabled && getCurrentUser().role === 'volunteer';
  const currentUserId = String(getCurrentUser()._id || getCurrentUser().id || '');

  const [incidents, setIncidents] = useState([]);
  const [acceptedByMe, setAcceptedByMe] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [busyId, setBusyId] = useState('');
  const [errors, setErrors] = useState({});

  const loadActive = useCallback(async () => {
    try {
      const active = await fetchActiveEmergencies();
      setIncidents(active);
    } catch {
      // The popup is best effort; the bell notification still arrives.
    }
  }, []);

  useEffect(() => {
    if (!isVolunteer) return;
    loadActive();
  }, [isVolunteer, loadActive]);

  useEffect(() => {
    if (!isVolunteer) return undefined;

    const socket = getChatSocket();

    const handleNotification = (notification = {}) => {
      const emergencyId = String(notification.emergencyId || '');
      if (!emergencyId) return;

      if (notification.alertType === 'EMERGENCY') {
        loadActive();
      } else if (notification.alertType === 'EMERGENCY_ACCEPTED') {
        setIncidents((current) => withoutIncident(current, emergencyId));
      }
    };

    socket.on('newNotification', handleNotification);
    // Catch up on anything missed while the socket was disconnected.
    socket.on('connect', loadActive);

    return () => {
      socket.off('newNotification', handleNotification);
      socket.off('connect', loadActive);
    };
  }, [isVolunteer, loadActive]);

  if (!isVolunteer) return null;

  const visible = [...acceptedByMe, ...incidents]
    .filter((incident) => !dismissedIds.has(String(incident._id)))
    .slice(0, MAX_VISIBLE);

  if (!visible.length) return null;

  const dismiss = (id) => {
    setDismissedIds((current) => new Set([...current, id]));
  };

  const markRelatedNotificationsRead = (id) => {
    (notificationState?.notifications || [])
      .filter((notification) => !notification.isRead && String(notification.emergencyId || '') === id)
      .forEach((notification) => notificationState.markRead(notification._id));
  };

  const handleAccept = async (incident) => {
    const id = String(incident._id);
    setBusyId(id);
    setErrors((current) => ({ ...current, [id]: '' }));

    try {
      await acceptEmergency(id);
      setIncidents((current) => withoutIncident(current, id));
      setAcceptedByMe((current) => [...withoutIncident(current, id), incident]);
      markRelatedNotificationsRead(id);
    } catch (err) {
      if (err.response?.status === 409) {
        // Someone else was faster. Keep the card so the volunteer sees why.
        markRelatedNotificationsRead(id);
      }
      setErrors((current) => ({ ...current, [id]: getEmergencyErrorMessage(err) }));
    } finally {
      setBusyId('');
    }
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
        const accepted = acceptedByMe.some((item) => String(item._id) === id);
        const mapsUrl = getGoogleMapsUrl(incident.location);

        return (
          <div
            key={id}
            role="alert"
            className="motion-dropdown-in rounded-2xl border border-red-200 bg-white p-4 shadow-2xl"
          >
            <p className="font-bold text-red-700">
              {accepted
                ? `You are helping ${incident.seniorName || 'a senior'}`
                : `Emergency: ${incident.seniorName || 'A senior'} needs help`}
            </p>
            <div className="mt-2 space-y-1 text-sm text-gray-700">
              <p>{incident.message}</p>
              {incident.createdAt && (
                <p className="text-gray-600">
                  Sent at {new Date(incident.createdAt).toLocaleTimeString()}
                </p>
              )}
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
              {!accepted && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleAccept(incident)}
                  disabled={busyId === id}
                >
                  {busyId === id ? 'Accepting...' : 'Accept'}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => handleMessageSenior(incident)}>
                Message Senior
              </Button>
              <Button size="sm" variant="secondary" onClick={() => dismiss(id)}>
                {accepted ? 'Close' : 'Dismiss'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
