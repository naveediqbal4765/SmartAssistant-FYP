import { useCallback, useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeaturePage from '../../../components/ui/FeaturePage';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import EmptyState from '../../../components/ui/EmptyState';
import StatusAlert from '../../../components/ui/StatusAlert';
import CreateForumModal, { CATEGORY_LABELS } from './CreateForumModal';
import {
  createForum as createForumApi,
  fetchForumCategories,
  fetchForums,
  getCommunityErrorMessage,
  joinForum as joinForumApi
} from '../services/communityApi';

export default function ForumsPage() {
  const navigate = useNavigate();
  const [forums, setForums] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joiningId, setJoiningId] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadForums = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchForums({
        category: activeCategory || undefined,
        search: search.trim() || undefined
      });
      setForums(data);
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Failed to load hobby groups'));
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => {
    fetchForumCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(loadForums, 250);
    return () => clearTimeout(timeoutId);
  }, [loadForums]);

  const handleCreate = async (payload) => {
    const created = await createForumApi(payload);
    setCreateOpen(false);
    loadForums();
    navigate(`/community/forums/${created._id}`);
    return created;
  };

  const handleJoin = async (forumId) => {
    setJoiningId(forumId);
    try {
      await joinForumApi(forumId);
      await loadForums();
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not join this group'));
    } finally {
      setJoiningId('');
    }
  };

  return (
    <FeaturePage
      title="Hobby Groups & Forums"
      description="Discover interest-based groups and connect with people who share your hobbies."
      backLabel="Back to Community"
      onBack={() => navigate('/community')}
      actions={<Button onClick={() => setCreateOpen(true)}>+ Start a Group</Button>}
    >
      <StatusAlert variant="error">{error}</StatusAlert>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full rounded-xl border px-10 py-2.5"
          />
        </div>
        <select
          value={activeCategory}
          onChange={(e) => setActiveCategory(e.target.value)}
          className="rounded-xl border px-4 py-2.5 sm:w-56"
        >
          <option value="">All categories</option>
          {categories.map((key) => (
            <option key={key} value={key}>{CATEGORY_LABELS[key] || key}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingState label="Loading hobby groups..." />
      ) : forums.length === 0 ? (
        <EmptyState
          title="No groups found"
          description="Be the first to start a group around something you love."
        >
          <Button onClick={() => setCreateOpen(true)}>+ Start a Group</Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {forums.map((forum) => (
            <div key={forum._id} className="motion-card rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="inline-block rounded-full bg-brand-primary/10 px-3 py-1 text-xs font-semibold text-brand-primary">
                    {CATEGORY_LABELS[forum.category] || forum.category}
                  </span>
                  <h3
                    className="mt-2 cursor-pointer text-lg font-bold text-gray-900 hover:underline"
                    onClick={() => navigate(`/community/forums/${forum._id}`)}
                  >
                    {forum.name}
                  </h3>
                </div>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-gray-600">{forum.description || 'No description yet.'}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center gap-1"><Users size={16} /> {forum.memberCount} members</span>
                <span>{forum.postsCount} posts</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/community/forums/${forum._id}`)}
                >
                  View
                </Button>
                {!forum.isMember && (
                  <Button
                    size="sm"
                    className="flex-1"
                    disabled={joiningId === forum._id}
                    onClick={() => handleJoin(forum._id)}
                  >
                    {joiningId === forum._id ? 'Joining...' : 'Join'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateForumModal
        open={createOpen}
        categories={categories}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </FeaturePage>
  );
}
