import { useCallback, useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../../components/ui/FeaturePage';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import EmptyState from '../../../components/ui/EmptyState';
import StatusAlert from '../../../components/ui/StatusAlert';
import CreateEventModal, { CATEGORY_LABELS } from './CreateEventModal';
import {
  cancelEventRsvp,
  createEvent as createEventApi,
  fetchEventCategories,
  fetchEvents,
  getCommunityErrorMessage,
  rsvpToEvent
} from '../services/communityApi';

const formatDateTime = (value) => new Date(value).toLocaleString(undefined, {
  weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
});

export default function EventsPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rsvpBusyId, setRsvpBusyId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEvents({ category: activeCategory || undefined });
      setEvents(data);
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Failed to load events'));
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchEventCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreate = async (payload) => {
    const created = await createEventApi(payload);
    setCreateOpen(false);
    loadEvents();
    return created;
  };

  const handleRsvp = async (eventId, status) => {
    setRsvpBusyId(eventId);
    try {
      await rsvpToEvent(eventId, status);
      await loadEvents();
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not RSVP'));
    } finally {
      setRsvpBusyId('');
    }
  };

  const handleCancelRsvp = async (eventId) => {
    setRsvpBusyId(eventId);
    try {
      await cancelEventRsvp(eventId);
      await loadEvents();
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not update RSVP'));
    } finally {
      setRsvpBusyId('');
    }
  };

  return (
    <FeaturePage
      title="Event Discovery"
      description="Find upcoming community events and RSVP to the ones you'd like to attend."
      backLabel="Back to Community"
      onBack={() => navigate('/community')}
      actions={<Button onClick={() => setCreateOpen(true)}>+ Create Event</Button>}
    >
      <StatusAlert variant="error">{error}</StatusAlert>

      <div className="mb-5">
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="rounded-xl border px-4 py-2.5 sm:w-64"
        >
          <option value="">All categories</option>
          {categories.map((key) => (
            <option key={key} value={key}>{CATEGORY_LABELS[key] || key}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Loading events..." />
      ) : events.length === 0 ? (
        <EmptyState title="No upcoming events" description="Check back soon, or create one yourself.">
          <Button onClick={() => setCreateOpen(true)}>+ Create Event</Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <div key={event._id} className="motion-card rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="inline-block rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
                {CATEGORY_LABELS[event.category] || event.category}
              </span>
              <h3 className="mt-2 text-lg font-bold text-gray-900">{event.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{event.description || 'No description yet.'}</p>

              <div className="mt-4 space-y-1.5 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Calendar size={16} /> {formatDateTime(event.startAt)}</p>
                {event.isVirtual ? (
                  <p className="flex items-center gap-2"><Video size={16} /> Virtual event</p>
                ) : (
                  <p className="flex items-center gap-2"><MapPin size={16} /> {event.location?.address || 'Location TBD'}</p>
                )}
                <p className="flex items-center gap-2">
                  <Users size={16} /> {event.attendeeCount} going
                  {event.capacity ? ` (of ${event.capacity})` : ''}
                </p>
              </div>

              {event.isVirtual && event.myRsvpStatus === 'going' && (
                <a
                  href={event.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block text-center text-sm font-semibold text-brand-primary hover:underline"
                >
                  Open meeting link
                </a>
              )}

              <div className="mt-4 flex gap-2">
                {event.myRsvpStatus === 'going' ? (
                  <Button variant="secondary" size="sm" className="flex-1" disabled={rsvpBusyId === event._id} onClick={() => handleCancelRsvp(event._id)}>
                    Cancel RSVP
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={rsvpBusyId === event._id || event.isFull}
                      onClick={() => handleRsvp(event._id, 'going')}
                    >
                      {event.isFull ? 'Full' : 'Going'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      disabled={rsvpBusyId === event._id}
                      onClick={() => handleRsvp(event._id, 'interested')}
                    >
                      Interested
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateEventModal open={createOpen} categories={categories} onClose={() => setCreateOpen(false)} onCreate={handleCreate} />
    </FeaturePage>
  );
}
