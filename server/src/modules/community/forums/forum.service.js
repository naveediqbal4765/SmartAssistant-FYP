const { Forum, ForumPost, ForumComment, FORUM_CATEGORIES } = require('./forum.model');
const notificationService = require('../../communication/notifications/notification.service');
const { toId, createServiceError, assertObjectId, parsePagination } = require('../shared/helpers');

const isMember = (forum, userId) => forum.members.some((m) => toId(m.userId) === toId(userId));
const isAdmin = (forum, userId) => forum.members.some((m) => toId(m.userId) === toId(userId) && m.role === 'admin');

const getForumOrThrow = async (forumId) => {
  assertObjectId(forumId, 'forumId');
  const forum = await Forum.findOne({ _id: forumId, isArchived: false });
  if (!forum) throw createServiceError(404, 'Forum not found');
  return forum;
};

const formatForum = (forum, userId) => ({
  _id: forum._id,
  name: forum.name,
  description: forum.description,
  category: forum.category,
  createdBy: forum.createdBy,
  memberCount: forum.members.length,
  postsCount: forum.postsCount,
  isMember: isMember(forum, userId),
  isAdmin: isAdmin(forum, userId),
  createdAt: forum.createdAt,
  updatedAt: forum.updatedAt
});

const listForums = async (user, query = {}) => {
  const { category, search, mine } = query;
  const filter = { isArchived: false };
  if (category && FORUM_CATEGORIES.includes(category)) filter.category = category;
  if (search) filter.$text = { $search: search };
  if (mine === 'true') filter['members.userId'] = user._id;

  const forums = await Forum.find(filter)
    .populate('createdBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(100);

  return forums.map((forum) => formatForum(forum, user._id));
};

const getForumCategories = () => FORUM_CATEGORIES;

const createForum = async (user, data) => {
  const name = String(data.name || '').trim();
  if (!name) throw createServiceError(400, 'Forum name is required');
  if (data.category && !FORUM_CATEGORIES.includes(data.category)) {
    throw createServiceError(400, 'Invalid category');
  }

  const forum = await Forum.create({
    name,
    description: String(data.description || '').trim(),
    category: data.category || 'other',
    createdBy: user._id,
    members: [{ userId: user._id, role: 'admin' }]
  });

  return formatForum(forum, user._id);
};

const getForumById = async (forumId, user) => {
  const forum = await getForumOrThrow(forumId);
  await forum.populate('createdBy', 'name role');
  return formatForum(forum, user._id);
};

const joinForum = async (forumId, user) => {
  const forum = await getForumOrThrow(forumId);
  if (isMember(forum, user._id)) {
    throw createServiceError(400, 'Already a member of this forum');
  }
  forum.members.push({ userId: user._id, role: 'member' });
  await forum.save();
  return formatForum(forum, user._id);
};

const leaveForum = async (forumId, user) => {
  const forum = await getForumOrThrow(forumId);
  if (!isMember(forum, user._id)) {
    throw createServiceError(400, 'Not a member of this forum');
  }

  const remaining = forum.members.filter((m) => toId(m.userId) !== toId(user._id));

  if (remaining.length === 0) {
    forum.isArchived = true;
    forum.members = [];
    await forum.save();
    return { left: true, archived: true };
  }

  const wasSoleAdmin = isAdmin(forum, user._id) && !remaining.some((m) => m.role === 'admin');
  if (wasSoleAdmin) {
    remaining[0].role = 'admin';
  }

  forum.members = remaining;
  await forum.save();
  return { left: true, archived: false };
};

const updateForum = async (forumId, user, data) => {
  const forum = await getForumOrThrow(forumId);
  if (!isAdmin(forum, user._id)) {
    throw createServiceError(403, 'Only forum admins can update this forum');
  }
  if (data.name !== undefined) forum.name = String(data.name).trim() || forum.name;
  if (data.description !== undefined) forum.description = String(data.description).trim();
  if (data.category !== undefined && FORUM_CATEGORIES.includes(data.category)) forum.category = data.category;
  await forum.save();
  return formatForum(forum, user._id);
};

const archiveForum = async (forumId, user) => {
  const forum = await getForumOrThrow(forumId);
  if (!isAdmin(forum, user._id)) {
    throw createServiceError(403, 'Only forum admins can delete this forum');
  }
  forum.isArchived = true;
  await forum.save();
  return { archived: true };
};

// ---- Posts ----

const formatPost = (post, user) => ({
  _id: post._id,
  forumId: post.forumId,
  author: post.authorId,
  content: post.content,
  imageUrl: post.imageUrl,
  likeCount: post.likes.length,
  likedByMe: post.likes.some((id) => toId(id) === toId(user._id)),
  commentsCount: post.commentsCount,
  createdAt: post.createdAt
});

const listPosts = async (forumId, user, query = {}) => {
  await getForumOrThrow(forumId);
  const { page, limit, skip } = parsePagination(query);

  const posts = await ForumPost.find({ forumId })
    .populate('authorId', 'name role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return posts.map((post) => formatPost(post, user));
};

const createPost = async (forumId, user, data) => {
  const forum = await getForumOrThrow(forumId);
  if (!isMember(forum, user._id)) {
    throw createServiceError(403, 'Join this forum to post');
  }
  const content = String(data.content || '').trim();
  if (!content) throw createServiceError(400, 'Post content is required');

  const post = await ForumPost.create({
    forumId,
    authorId: user._id,
    content,
    imageUrl: data.imageUrl || ''
  });
  await post.populate('authorId', 'name role');

  forum.postsCount += 1;
  await forum.save();

  const notifyIds = forum.members
    .map((m) => toId(m.userId))
    .filter((id) => id !== toId(user._id));
  await Promise.all(notifyIds.map((userId) => notificationService.createNotification({
    userId,
    type: 'community_forum_post',
    title: `New post in ${forum.name}`,
    message: content.length > 80 ? `${content.slice(0, 77)}...` : content,
    entityType: 'forum_post',
    entityId: post._id
  })));

  return formatPost(post, user);
};

const getPostOrThrow = async (postId) => {
  assertObjectId(postId, 'postId');
  const post = await ForumPost.findById(postId);
  if (!post) throw createServiceError(404, 'Post not found');
  return post;
};

const toggleLike = async (postId, user) => {
  const post = await getPostOrThrow(postId);
  const forum = await getForumOrThrow(post.forumId);
  if (!isMember(forum, user._id)) {
    throw createServiceError(403, 'Join this forum to like posts');
  }

  const alreadyLiked = post.likes.some((id) => toId(id) === toId(user._id));
  if (alreadyLiked) {
    post.likes = post.likes.filter((id) => toId(id) !== toId(user._id));
  } else {
    post.likes.push(user._id);
  }
  await post.save();
  await post.populate('authorId', 'name role');
  return formatPost(post, user);
};

const deletePost = async (postId, user) => {
  const post = await getPostOrThrow(postId);
  const forum = await getForumOrThrow(post.forumId);
  if (toId(post.authorId) !== toId(user._id) && !isAdmin(forum, user._id)) {
    throw createServiceError(403, 'Not allowed to delete this post');
  }
  await ForumComment.deleteMany({ postId: post._id });
  await post.deleteOne();
  forum.postsCount = Math.max(0, forum.postsCount - 1);
  await forum.save();
  return { deleted: true };
};

// ---- Comments ----

const formatComment = (comment) => ({
  _id: comment._id,
  postId: comment.postId,
  author: comment.authorId,
  content: comment.content,
  createdAt: comment.createdAt
});

const listComments = async (postId, query = {}) => {
  const post = await getPostOrThrow(postId);
  const { page, limit, skip } = parsePagination(query);
  const comments = await ForumComment.find({ postId: post._id })
    .populate('authorId', 'name role')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit);
  return comments.map(formatComment);
};

const addComment = async (postId, user, data) => {
  const post = await getPostOrThrow(postId);
  const forum = await getForumOrThrow(post.forumId);
  if (!isMember(forum, user._id)) {
    throw createServiceError(403, 'Join this forum to comment');
  }
  const content = String(data.content || '').trim();
  if (!content) throw createServiceError(400, 'Comment content is required');

  const comment = await ForumComment.create({
    postId: post._id,
    forumId: forum._id,
    authorId: user._id,
    content
  });
  await comment.populate('authorId', 'name role');

  post.commentsCount += 1;
  await post.save();

  if (toId(post.authorId) !== toId(user._id)) {
    await notificationService.createNotification({
      userId: toId(post.authorId),
      type: 'community_forum_comment',
      title: `${user.name} commented on your post`,
      message: content.length > 80 ? `${content.slice(0, 77)}...` : content,
      entityType: 'forum_comment',
      entityId: comment._id
    });
  }

  return formatComment(comment);
};

const deleteComment = async (commentId, user) => {
  assertObjectId(commentId, 'commentId');
  const comment = await ForumComment.findById(commentId);
  if (!comment) throw createServiceError(404, 'Comment not found');
  const forum = await getForumOrThrow(comment.forumId);
  if (toId(comment.authorId) !== toId(user._id) && !isAdmin(forum, user._id)) {
    throw createServiceError(403, 'Not allowed to delete this comment');
  }
  await comment.deleteOne();
  await ForumPost.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
  return { deleted: true };
};

module.exports = {
  getForumCategories,
  listForums,
  createForum,
  getForumById,
  joinForum,
  leaveForum,
  updateForum,
  archiveForum,
  listPosts,
  createPost,
  toggleLike,
  deletePost,
  listComments,
  addComment,
  deleteComment
};
