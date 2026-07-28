import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../../components/ui/FeaturePage';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import EmptyState from '../../../components/ui/EmptyState';
import StatusAlert from '../../../components/ui/StatusAlert';
import CreateAnnouncementModal, { AUDIENCE_LABELS, CATEGORY_LABELS } from './CreateAnnouncementModal';
import {
  createAnnouncement as createAnnouncementApi,
  fetchAnnouncementMeta,
  fetchAnnouncements,
  getCommunityErrorMessage,
  markAnnouncementRead
} from '../services/communityApi';

const formatDate = (value) => new Date(value).toLocaleString(undefined, {
  month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
});

export default function AnnouncementsPage() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [meta, setMeta] = useState({ categories: [], audiences: [], canPost: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Failed to load announcements'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncementMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => { loadAnnouncements(); }, [loadAnnouncements]);

  const handleCreate = async (payload) => {
    const created = await createAnnouncementApi(payload);
    setCreateOpen(false);
    loadAnnouncements();
    return created;
  };

  const handleMarkRead = async (announcementId) => {
    try {
      const updated = await markAnnouncementRead(announcementId);
      setAnnouncements((prev) => prev.map((a) => (a._id === announcementId ? updated : a)));
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not mark as read'));
    }
  };

  return (
    <FeaturePage
      title="Community Announcements"
      description="Stay up to date with important community-wide updates and news."
      backLabel="Back to Community"
      onBack={() => navigate('/community')}
      actions={meta.canPost ? <Button onClick={() => setCreateOpen(true)}>+ New Announcement</Button> : null}
    >
      <StatusAlert variant="error">{error}</StatusAlert>

      {loading ? (
        <LoadingState label="Loading announcements..." />
      ) : announcements.length === 0 ? (
        <EmptyState title="No announcements yet" description="Check back soon for community updates." />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement._id}
              className={`motion-card rounded-2xl border p-5 shadow-sm ${announcement.isRead ? 'border-gray-200 bg-white' : 'border-brand-primary/40 bg-brand-primary/5'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Megaphone size={20} className="mt-1 shrink-0 text-brand-primary" />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {announcement.pinned && <Pin size={14} className="text-orange-600" />}
                      <h3 className="text-lg font-bold text-gray-900">{announcement.title}</h3>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {announcement.postedBy?.name || 'Community Team'} • {formatDate(announcement.createdAt)} •{' '}
                      {CATEGORY_LABELS[announcement.category] || announcement.category} • {AUDIENCE_LABELS[announcement.audience] || announcement.audience}
                    </p>
                  </div>
                </div>
                {!announcement.isRead && (
                  <span className="shrink-0 rounded-full bg-brand-primary px-2 py-1 text-xs font-semibold text-white">New</span>
                )}
              </div>
              <p className="mt-3 whitespace-pre-wrap text-gray-700">{announcement.body}</p>
              {!announcement.isRead && (
                <div className="mt-3">
                  <Button variant="ghost" size="sm" onClick={() => handleMarkRead(announcement._id)}>
                    Mark as read
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <CreateAnnouncementModal
        open={createOpen}
        categories={meta.categories}
        audiences={meta.audiences}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </FeaturePage>
  );
}
