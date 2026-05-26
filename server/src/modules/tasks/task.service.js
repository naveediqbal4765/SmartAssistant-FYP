const Task = require('./task.model');
const ActivityLog = require('../../shared/models/ActivityLog');
const { dispatchNotificationSafely } = require('../notifications/notification.dispatcher');
const emergencyRoutingService = require('../notifications/emergencyRouting.service');

const isValidCoordinatePair = (lat, lng) =>
  Number.isFinite(Number(lat)) &&
  Number.isFinite(Number(lng)) &&
  !(Number(lat) === 0 && Number(lng) === 0);

const getAlertLocation = (taskLocation, user) => {
  if (isValidCoordinatePair(taskLocation?.coordinates?.lat, taskLocation?.coordinates?.lng)) {
    return {
      lat: Number(taskLocation.coordinates.lat),
      lng: Number(taskLocation.coordinates.lng)
    };
  }

  const userCoordinates = user.location?.coordinates || [];
  const [lng, lat] = userCoordinates;
  if (isValidCoordinatePair(lat, lng)) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  return null;
};

const createTaskRequest = async (user, payload) => {
  if (user.role !== 'elder') {
    return { status: 403, body: { success: false, msg: 'Only seniors can request help' } };
  }

  const { title, description, category, priority, location, scheduledTime } = payload;

  if (!title || !description) {
    return { status: 400, body: { success: false, msg: 'Title and description are required' } };
  }

  const task = new Task({
    userId: user._id,
    title,
    description,
    category: category || 'other',
    priority: priority || 'medium',
    location: location || { address: user.address || 'Not specified' },
    scheduledTime: scheduledTime || null,
    status: 'pending'
  });

  await task.save();

  try {
    await ActivityLog.create({
      userId: user._id,
      action: 'task_requested',
      details: title
    });
  } catch (logErr) {
    console.error('Task activity log failed:', logErr.message);
  }

  try {
    await dispatchNotificationSafely({
      userId: user._id,
      type: 'task',
      title: 'Task request created',
      message: `Your help request "${title}" was submitted.`
    });
  } catch (notificationErr) {
    console.error('Task notification failed:', notificationErr.message);
  }

  try {
    await emergencyRoutingService.createEmergencyNotification({
      type: 'TASK',
      seniorId: user._id,
      location: getAlertLocation(task.location, user),
      message: `New help request: ${title}`,
      metadata: {
        taskId: task._id,
        category: task.category,
        priority: task.priority
      }
    });
  } catch (routingErr) {
    console.error('Task routing notification failed:', routingErr.message);
  }

  return {
    status: 200,
    body: {
      success: true,
      msg: 'Help request submitted successfully!',
      task
    }
  };
};

const getMyRequests = async (user) => {
  const tasks = await Task.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .populate('volunteerId', 'name phone');

  return { status: 200, body: { success: true, tasks } };
};

const getTaskById = async (taskId) => {
  const task = await Task.findById(taskId)
    .populate('userId', 'name phone address')
    .populate('volunteerId', 'name phone');

  if (!task) {
    return { status: 404, body: { success: false, msg: 'Task not found' } };
  }

  return { status: 200, body: { success: true, task } };
};

const cancelTask = async (taskId, user) => {
  const task = await Task.findById(taskId);

  if (!task) {
    return { status: 404, body: { success: false, msg: 'Task not found' } };
  }

  if (task.userId.toString() !== user._id.toString()) {
    return { status: 403, body: { success: false, msg: 'Not authorized' } };
  }

  if (task.status !== 'pending') {
    return {
      status: 400,
      body: { success: false, msg: 'Cannot cancel task that is already accepted' }
    };
  }

  task.status = 'cancelled';
  await task.save();

  try {
    await dispatchNotificationSafely({
      userId: user._id,
      type: 'task',
      title: 'Task request cancelled',
      message: `Your help request "${task.title}" was cancelled.`
    });
  } catch (notificationErr) {
    console.error('Task cancellation notification failed:', notificationErr.message);
  }

  return { status: 200, body: { success: true, msg: 'Task cancelled' } };
};

module.exports = {
  createTaskRequest,
  getMyRequests,
  getTaskById,
  cancelTask
};
