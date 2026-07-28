const express = require('express');
const auth = require('../../../middleware/auth');
const forumController = require('./forum.controller');

const router = express.Router();

router.get('/categories', auth, forumController.getCategories);
router.get('/', auth, forumController.listForums);
router.post('/', auth, forumController.createForum);
router.get('/:forumId', auth, forumController.getForum);
router.put('/:forumId', auth, forumController.updateForum);
router.delete('/:forumId', auth, forumController.archiveForum);
router.post('/:forumId/join', auth, forumController.joinForum);
router.post('/:forumId/leave', auth, forumController.leaveForum);

router.get('/:forumId/posts', auth, forumController.listPosts);
router.post('/:forumId/posts', auth, forumController.createPost);
router.post('/posts/:postId/like', auth, forumController.toggleLike);
router.delete('/posts/:postId', auth, forumController.deletePost);

router.get('/posts/:postId/comments', auth, forumController.listComments);
router.post('/posts/:postId/comments', auth, forumController.addComment);
router.delete('/comments/:commentId', auth, forumController.deleteComment);

module.exports = router;
