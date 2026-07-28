const activityService = require('./activity.service');
const { asyncHandler } = require('../shared/helpers');

const getTypes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: activityService.getActivityTypes() });
});

const listActivities = asyncHandler(async (req, res) => {
  const data = await activityService.listActivities(req.user, req.query);
  res.json({ success: true, data });
});

const createActivity = asyncHandler(async (req, res) => {
  const data = await activityService.createActivity(req.user, req.body);
  res.status(201).json({ success: true, data });
});

const joinActivity = asyncHandler(async (req, res) => {
  const data = await activityService.joinActivity(req.params.activityId, req.user);
  res.json({ success: true, data });
});

const leaveActivity = asyncHandler(async (req, res) => {
  const data = await activityService.leaveActivity(req.params.activityId, req.user);
  res.json({ success: true, data });
});

const cancelActivity = asyncHandler(async (req, res) => {
  const data = await activityService.cancelActivity(req.params.activityId, req.user);
  res.json({ success: true, data });
});

module.exports = { getTypes, listActivities, createActivity, joinActivity, leaveActivity, cancelActivity };
