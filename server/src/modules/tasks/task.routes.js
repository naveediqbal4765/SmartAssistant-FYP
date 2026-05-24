const express = require('express');
const auth = require('../../middleware/auth');
const {
  createTaskRequest,
  getMyRequests,
  getTaskById,
  cancelTask
} = require('./task.controller');

const router = express.Router();

router.post('/request', auth, createTaskRequest);
router.get('/my-requests', auth, getMyRequests);
router.get('/:id', auth, getTaskById);
router.put('/cancel/:id', auth, cancelTask);

module.exports = router;
