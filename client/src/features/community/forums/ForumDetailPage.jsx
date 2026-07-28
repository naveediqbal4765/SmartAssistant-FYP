import { useCallback, useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, Trash2, Users } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import FeaturePage from '../../../components/ui/FeaturePage';
import Button from '../../../components/ui/Button';
import LoadingState from '../../../components/ui/LoadingState';
import EmptyState from '../../../components/ui/EmptyState';
import StatusAlert from '../../../components/ui/StatusAlert';
import { CATEGORY_LABELS } from './CreateForumModal';
import {
  addPostComment,
  createForumPost,
  deleteForumPost,
  deletePostComment,
  fetchForum,
  fetchForumPosts,
  fetchPostComments,
  getCommunityErrorMessage,
  joinForum as joinForumApi,
  leaveForum as leaveForumApi,
  toggleForumPostLike
} from '../services/communityApi';

const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch (err) {
    return {};
  }
};

function PostComments({ postId, onCountChange }) {
  const currentUser = getCurrentUser();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPostComments(postId).then(setComments).catch(() => setComments([])).finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const comment = await addPostComment(postId, { content: text.trim() });
      setComments((prev) => [...prev, comment]);
      setText('');
      onCountChange?.(1);
    } catch (err) {
      // silently ignore, the input stays filled so the user can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deletePostComment(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
      onCountChange?.(-1);
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {loading ? (
        <p className="text-xs text-gray-400">Loading comments...</p>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <div key={comment._id} className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
              <div>
                <p className="text-xs font-semibold text-gray-700">{comment.author?.name || 'Member'}</p>
                <p className="text-sm text-gray-600">{comment.content}</p>
              </div>
              {String(comment.author?._id) === String(currentUser._id) && (
                <button type="button" onClick={() => handleDelete(comment._id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet. Be the first to reply.</p>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={submitting}
          className="motion-interactive flex h-10 w-10 items-center justify-center rounded-xl bg-brand-primary text-white disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function PostCard({ post, onLike, onDelete }) {
  const currentUser = getCurrentUser();
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount);
  const isAuthor = String(post.author?._id) === String(currentUser._id);

  return (
    <div className="motion-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-gray-900">{post.author?.name || 'Member'}</p>
          <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
        </div>
        {isAuthor && (
          <button type="button" onClick={() => onDelete(post._id)} className="text-gray-400 hover:text-red-500">
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-gray-800">{post.content}</p>
      {post.imageUrl && (
        <img src={post.imageUrl} alt="Post attachment" className="mt-3 max-h-80 w-full rounded-xl object-cover" />
      )}
      <div className="mt-4 flex items-center gap-5 border-t border-gray-100 pt-3 text-sm text-gray-500">
        <button
          type="button"
          onClick={() => onLike(post._id)}
          className={`motion-interactive flex items-center gap-1.5 ${post.likedByMe ? 'text-red-500' : 'hover:text-red-500'}`}
        >
          <Heart size={16} fill={post.likedByMe ? 'currentColor' : 'none'} /> {post.likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="motion-interactive flex items-center gap-1.5 hover:text-brand-primary"
        >
          <MessageCircle size={16} /> {commentsCount}
        </button>
      </div>
      {showComments && (
        <PostComments postId={post._id} onCountChange={(delta) => setCommentsCount((c) => c + delta)} />
      )}
    </div>
  );
}

export default function ForumDetailPage() {
  const { forumId } = useParams();
  const navigate = useNavigate();
  const [forum, setForum] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [membershipBusy, setMembershipBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [forumData, postsData] = await Promise.all([
        fetchForum(forumId),
        fetchForumPosts(forumId)
      ]);
      setForum(forumData);
      setPosts(postsData);
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Failed to load this group'));
    } finally {
      setLoading(false);
    }
  }, [forumId]);

  useEffect(() => { load(); }, [load]);

  const handlePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const post = await createForumPost(forumId, { content: newPost.trim() });
      setPosts((prev) => [post, ...prev]);
      setNewPost('');
      setForum((prev) => (prev ? { ...prev, postsCount: prev.postsCount + 1 } : prev));
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not create your post'));
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId) => {
    try {
      const updated = await toggleForumPostLike(postId);
      setPosts((prev) => prev.map((p) => (p._id === postId ? updated : p)));
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not update like'));
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      await deleteForumPost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not delete post'));
    }
  };

  const handleJoinLeave = async () => {
    setMembershipBusy(true);
    try {
      if (forum.isMember) {
        await leaveForumApi(forumId);
      } else {
        await joinForumApi(forumId);
      }
      await load();
    } catch (err) {
      setError(getCommunityErrorMessage(err, 'Could not update membership'));
    } finally {
      setMembershipBusy(false);
    }
  };

  if (loading) {
    return (
      <FeaturePage title="Loading group..." backLabel="Back" onBack={() => navigate('/community/forums')}>
        <LoadingState label="Loading..." />
      </FeaturePage>
    );
  }

  if (!forum) {
    return (
      <FeaturePage title="Group not found" backLabel="Back" onBack={() => navigate('/community/forums')}>
        <StatusAlert variant="error">{error || 'This group is unavailable.'}</StatusAlert>
      </FeaturePage>
    );
  }

  return (
    <FeaturePage
      title={forum.name}
      description={`${CATEGORY_LABELS[forum.category] || forum.category} • ${forum.memberCount} members`}
      backLabel="Back to Groups"
      onBack={() => navigate('/community/forums')}
      actions={(
        <Button variant={forum.isMember ? 'secondary' : 'primary'} disabled={membershipBusy} onClick={handleJoinLeave}>
          {membershipBusy ? 'Please wait...' : forum.isMember ? 'Leave Group' : 'Join Group'}
        </Button>
      )}
    >
      <StatusAlert variant="error">{error}</StatusAlert>

      {forum.description && (
        <div className="mb-5 flex items-start gap-2 rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <Users size={18} className="mt-0.5 shrink-0 text-brand-primary" />
          <p>{forum.description}</p>
        </div>
      )}

      {forum.isMember ? (
        <form onSubmit={handlePost} className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder={`Share something with ${forum.name}...`}
            rows={3}
            className="w-full rounded-xl border px-4 py-3"
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" disabled={posting || !newPost.trim()}>
              {posting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      ) : (
        <StatusAlert variant="info">Join this group to post, like, and comment.</StatusAlert>
      )}

      {posts.length === 0 ? (
        <EmptyState title="No posts yet" description="Be the first to share something with this group." />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post._id} post={post} onLike={handleLike} onDelete={handleDeletePost} />
          ))}
        </div>
      )}
    </FeaturePage>
  );
}
