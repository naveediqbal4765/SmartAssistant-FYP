const forumService = require('./forum.service');
const { asyncHandler } = require('../shared/helpers');

const getCategories = asyncHandler(async (req, res) => {
  res.json({ success: true, data: forumService.getForumCategories() });
});

const listForums = asyncHandler(async (req, res) => {
  const data = await forumService.listForums(req.user, req.query);
  res.json({ success: true, data });
});

const createForum = asyncHandler(async (req, res) => {
  const data = await forumService.createForum(req.user, req.body);
  res.status(201).json({ success: true, data });
});

const getForum = asyncHandler(async (req, res) => {
  const data = await forumService.getForumById(req.params.forumId, req.user);
  res.json({ success: true, data });
});

const updateForum = asyncHandler(async (req, res) => {
  const data = await forumService.updateForum(req.params.forumId, req.user, req.body);
  res.json({ success: true, data });
});

const archiveForum = asyncHandler(async (req, res) => {
  const data = await forumService.archiveForum(req.params.forumId, req.user);
  res.json({ success: true, data });
});

const joinForum = asyncHandler(async (req, res) => {
  const data = await forumService.joinForum(req.params.forumId, req.user);
  res.json({ success: true, data });
});

const leaveForum = asyncHandler(async (req, res) => {
  const data = await forumService.leaveForum(req.params.forumId, req.user);
  res.json({ success: true, data });
});

const listPosts = asyncHandler(async (req, res) => {
  const data = await forumService.listPosts(req.params.forumId, req.user, req.query);
  res.json({ success: true, data });
});

const createPost = asyncHandler(async (req, res) => {
  const data = await forumService.createPost(req.params.forumId, req.user, req.body);
  res.status(201).json({ success: true, data });
});

const toggleLike = asyncHandler(async (req, res) => {
  const data = await forumService.toggleLike(req.params.postId, req.user);
  res.json({ success: true, data });
});

const deletePost = asyncHandler(async (req, res) => {
  const data = await forumService.deletePost(req.params.postId, req.user);
  res.json({ success: true, data });
});

const listComments = asyncHandler(async (req, res) => {
  const data = await forumService.listComments(req.params.postId, req.query);
  res.json({ success: true, data });
});

const addComment = asyncHandler(async (req, res) => {
  const data = await forumService.addComment(req.params.postId, req.user, req.body);
  res.status(201).json({ success: true, data });
});

const deleteComment = asyncHandler(async (req, res) => {
  const data = await forumService.deleteComment(req.params.commentId, req.user);
  res.json({ success: true, data });
});

module.exports = {
  getCategories,
  listForums,
  createForum,
  getForum,
  updateForum,
  archiveForum,
  joinForum,
  leaveForum,
  listPosts,
  createPost,
  toggleLike,
  deletePost,
  listComments,
  addComment,
  deleteComment
};
