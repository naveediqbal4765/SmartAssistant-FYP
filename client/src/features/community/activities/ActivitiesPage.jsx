import { useCallback, useEffect, useState } from 'react';
import { Clock, Repeat, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../../components/ui/FeaturePage';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import EmptyState from '../../../components/ui/EmptyState';
import StatusAlert from '../../../components/ui/StatusAlert';
import CreateActivityModal, { TYPE_LABELS } from './CreateActivityModal';
import {
  createActivity as createActivityApi,
  fetchActivities,
  fetchActivityTypes,
  getCommunityErrorMessage,
  joinActivity as joinActivityApi,
  leaveActivity as leaveActivityApi
} from '../services/communityApi';

const RECURRENCE_LABELS = { once: 'One-time', daily: 'Repeats daily', weekly: 'Repeats weekly' };

const formatDateTime = (value) => new Date(value).toLocaleString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
});

export default function ActivitiesPage() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeType, setActiveType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchActivities({ activityType: activeType || undefined });
      setActivities(data);
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Failed to load activities'));
    } finally {
      setLoading(false);
    }
  }, [activeType]);

  useEffect(() => {
    fetchActivityTypes().then(setTypes).catch(() => setTypes([]));
  }, []);

  useEffect(() => { loadActivities(); }, [loadActivities]);

  const handleCreate = async (payload) => {
    const created = await createActivityApi(payload);
    setCreateOpen(false);
    loadActivities();
    return created;
  };

  const handleToggleJoin = async (activity) => {
    setBusyId(activity._id);
    try {
      if (activity.isJoined) {
        await leaveActivityApi(activity._id);
      } else {
        await joinActivityApi(activity._id);
      }
      await loadActivities();
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not update your RSVP'));
    } finally {
      setBusyId('');
    }
  };

  return (
    <FeaturePage
      title="Virtual Group Activities"
      description="Join recurring online activities like chair yoga, bingo, book club, and coffee chats."
      backLabel="Back to Community"
      onBack={() => navigate('/community')}
      actions={<Button onClick={() => setCreateOpen(true)}>+ Host an Activity</Button>}
    >
      <StatusAlert variant="error">{error}</StatusAlert>

      <div className="mb-5">
        <select
          value={activeType}
          onChange={(e) => setActiveType(e.target.value)}
          className="rounded-xl border px-4 py-2.5 sm:w-64"
        >
          <option value="">All activity types</option>
          {types.map((key) => (
            <option key={key} value={key}>{TYPE_LABELS[key] || key}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Loading activities..." />
      ) : activities.length === 0 ? (
        <EmptyState title="No activities yet" description="Host one and invite the community to join.">
          <Button onClick={() => setCreateOpen(true)}>+ Host an Activity</Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity) => (
            <div key={activity._id} className="motion-card rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                {TYPE_LABELS[activity.activityType] || activity.activityType}
              </span>
              <h3 className="mt-2 text-lg font-bold text-gray-900">{activity.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{activity.description || 'No description yet.'}</p>

              <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Clock size={16} /> {formatDateTime(activity.nextOccurrence)}</p>
                <p className="flex items-center gap-2"><Repeat size={16} /> {RECURRENCE_LABELS[activity.recurrence]} • {activity.durationMinutes} min</p>
                <p className="flex items-center gap-2"><Users size={16} /> {activity.participantCount} joined</p>
              </div>

              {activity.isJoined && (
                <a
                  href={activity.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-brand-primary hover:underline"
                >
                  <Video size={16} /> Open meeting link
                </a>
              )}

              <div className="mt-4">
                <Button
                  variant={activity.isJoined ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full"
                  disabled={busyId === activity._id}
                  onClick={() => handleToggleJoin(activity)}
                >
                  {busyId === activity._id ? 'Please wait...' : activity.isJoined ? 'Leave' : 'Join'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateActivityModal open={createOpen} activityTypes={types} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </FeaturePage>
  );
}
