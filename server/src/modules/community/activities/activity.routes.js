const express = require('express');
const auth = require('../../../middleware/auth');
const activityController = require('./activity.controller');

const router = express.Router();

router.get('/types', auth, activityController.getTypes);
router.get('/', auth, activityController.listActivities);
router.post('/', auth, activityController.createActivity);
router.post('/:activityId/join', auth, activityController.joinActivity);
router.post('/:activityId/leave', auth, activityController.leaveActivity);
router.delete('/:activityId', auth, activityController.cancelActivity);

module.exports = router;
