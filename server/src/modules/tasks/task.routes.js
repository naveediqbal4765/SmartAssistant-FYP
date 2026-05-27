const express = require('express');
const auth = require('../../middleware/auth');
const {
  createTaskRequest,
  acceptTask,
  completeTask,
  deleteTaskRequest,
  getAvailableTasks,
  getMyRequests,
  getTaskById,
  getVolunteerHistory,
  hideSeniorHistoryTask,
  clearSeniorTaskHistory,
  ignoreTask,
  startTask,
  updateTaskRequest,
  verifyTask
} = require('./task.controller');

const router = express.Router();

router.post('/request', auth, createTaskRequest);
router.get('/available', auth, getAvailableTasks);
router.get('/my-requests', auth, getMyRequests);
router.get('/history', auth, getVolunteerHistory);
router.patch('/history/clear', auth, clearSeniorTaskHistory);
router.patch('/history/:id/hide', auth, hideSeniorHistoryTask);
router.patch('/:id/accept', auth, acceptTask);
router.patch('/:id/ignore', auth, ignoreTask);
router.patch('/:id/start', auth, startTask);
router.patch('/:id/complete', auth, completeTask);
router.patch('/:id/verify', auth, verifyTask);
router.put('/:id', auth, updateTaskRequest);
router.delete('/:id', auth, deleteTaskRequest);
router.get('/:id', auth, getTaskById);

module.exports = router;
