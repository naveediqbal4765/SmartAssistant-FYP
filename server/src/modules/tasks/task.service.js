const Task = require('./task.model');
const User = require('../../shared/models/User');
const ActivityLog = require('../../shared/models/ActivityLog');
const { dispatchNotificationSafely } = require('../notifications/notification.dispatcher');
const emergencyRoutingService = require('../notifications/emergencyRouting.service');
const { emitTaskEvent } = require('../communication/sockets/socket.manager');

const EDITABLE_FIELDS = ['title', 'description', 'category', 'priority', 'location', 'pickupLocation', 'dropLocation', 'address', 'scheduledTime'];
const SENIOR_HISTORY_STATUSES = ['verified_completed'];
const LEGACY_VERIFIED_HISTORY_STATUSES = ['verified_completed', 'verified', 'closed'];

const toId = (value) => String(value?._id || value || '');

const isValidCoordinatePair = (lat, lng) =>
  Number.isFinite(Number(lat)) &&
  Number.isFinite(Number(lng)) &&
  !(Number(lat) === 0 && Number(lng) === 0);

const getAlertLocation = (taskLocation, user) => {
  const taskLat = taskLocation?.lat ?? taskLocation?.coordinates?.lat;
  const taskLng = taskLocation?.lng ?? taskLocation?.coordinates?.lng;

  if (isValidCoordinatePair(taskLat, taskLng)) {
    return {
      lat: Number(taskLat),
      lng: Number(taskLng)
    };
  }

  const userCoordinates = user.location?.coordinates || [];
  const [lng, lat] = userCoordinates;
  if (isValidCoordinatePair(lat, lng)) {
    return { lat: Number(lat), lng: Number(lng) };
  }

  return null;
};

const getGoogleMapsUrl = (lat, lng) => (
  Number.isFinite(lat) && Number.isFinite(lng)
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : ''
);

const normalizeLocation = (location = {}, fallbackAddress = '') => {
  const lat = Number(location.lat ?? location.coordinates?.lat);
  const lng = Number(location.lng ?? location.coordinates?.lng);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  return {
    address: String(location.address || fallbackAddress || '').trim(),
    lat: hasCoordinates ? lat : undefined,
    lng: hasCoordinates ? lng : undefined,
    googleMapsUrl: location.googleMapsUrl || (hasCoordinates ? getGoogleMapsUrl(lat, lng) : ''),
    coordinates: hasCoordinates ? { lat, lng } : undefined
  };
};

const normalizeTaskLifecycleStatus = (task) => {
  if (!task) return task;
  if (['closed', 'verified'].includes(task.status)) {
    task.status = 'verified_completed';
  }
  return task;
};

const normalizeTasksLifecycleStatus = (tasks = []) => tasks.map(normalizeTaskLifecycleStatus);

const buildTaskPayload = (user, payload = {}) => {
  const pickupLocation = normalizeLocation(
    payload.pickupLocation || payload.location,
    payload.address || user.address || 'Not specified'
  );
  const dropLocation = normalizeLocation(payload.dropLocation, '');
  const location = payload.location || pickupLocation;

  return {
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    category: payload.category || 'other',
    priority: payload.priority || 'medium',
    location,
    pickupLocation,
    dropLocation,
    scheduledTime: payload.scheduledTime || null
  };
};

const canReadTask = (task, user) => {
  if (!task || !user?._id) return false;
  const userId = toId(user._id);

  if (user.role === 'elder') return toId(task.userId) === userId;
  if (user.role === 'caregiver') return toId(user.linkedSeniorId) === toId(task.userId);
  if (user.role === 'volunteer') {
    return task.status === 'pending'
      || toId(task.assignedVolunteerId || task.volunteerId) === userId;
  }

  return false;
};

const populateTask = (query) => query
  .populate('userId', 'name phone address')
  .populate('volunteerId', 'name phone')
  .populate('assignedVolunteerId', 'name phone');

const getPopulatedTask = (taskId) => populateTask(Task.findById(taskId));

const getTaskAudienceIds = async (task) => {
  const seniorId = toId(task.userId);
  const senior = await User.findById(seniorId).select('linkedCaregivers');
  const ids = new Set([seniorId]);

  (senior?.linkedCaregivers || []).forEach((caregiverId) => ids.add(toId(caregiverId)));
  if (task.assignedVolunteerId || task.volunteerId) {
    ids.add(toId(task.assignedVolunteerId || task.volunteerId));
  }

  return Array.from(ids).filter(Boolean);
};

const dispatchTaskNotification = async ({ userId, title, message, task, taskAction = '' }) => {
  try {
    await dispatchNotificationSafely({
      userId,
      type: 'task',
      title,
      message,
      taskId: task._id,
      entityType: 'task',
      entityId: task._id,
      alertType: 'TASK',
      taskAction,
      task
    });
  } catch (notificationErr) {
    console.error('Task notification failed:', notificationErr.message);
  }
};

const emitTaskToAudience = async (task, event) => {
  const populatedTask = await getPopulatedTask(task._id);
  const userIds = await getTaskAudienceIds(populatedTask || task);
  emitTaskEvent({ userIds, event, task: populatedTask || task });
  return populatedTask || task;
};

const createTaskRequest = async (user, payload) => {
  if (user.role !== 'elder') {
    return { status: 403, body: { success: false, msg: 'Only seniors can request help' } };
  }

  const taskPayload = buildTaskPayload(user, payload);

  if (!taskPayload.title || !taskPayload.description) {
    return { status: 400, body: { success: false, msg: 'Title and description are required' } };
  }

  const task = new Task({
    userId: user._id,
    ...taskPayload,
    status: 'pending',
    stateTimestamps: {
      pendingAt: new Date()
    }
  });

  await task.save();

  try {
    await ActivityLog.create({
      userId: user._id,
      action: 'task_requested',
      details: task.title
    });
  } catch (logErr) {
    console.error('Task activity log failed:', logErr.message);
  }

  await dispatchTaskNotification({
    userId: user._id,
    title: 'Task request created',
    message: `Your help request "${task.title}" was submitted.`,
    task
  });

  const audienceTask = await emitTaskToAudience(task, 'task_created');

  try {
    const routingResult = await emergencyRoutingService.createEmergencyNotification({
      type: 'TASK',
      seniorId: user._id,
      location: getAlertLocation(task.pickupLocation || task.location, user),
      message: `New help request: ${task.title}`,
      metadata: {
        taskId: task._id,
        category: task.category,
        priority: task.priority,
        task
      }
    });
    const populatedTask = await getPopulatedTask(task._id);
    const recipientIds = (routingResult.notifications || []).map((notification) => notification.userId);
    emitTaskEvent({ userIds: recipientIds, event: 'task_created', task: populatedTask || audienceTask || task });
  } catch (routingErr) {
    console.error('Task routing notification failed:', routingErr.message);
  }

  return {
    status: 200,
    body: {
      success: true,
      msg: 'Help request submitted successfully!',
      task: audienceTask || task
    }
  };
};

const getMyRequests = async (user) => {
  if (user.role === 'volunteer') {
    const tasks = await populateTask(Task.find({
      assignedVolunteerId: user._id,
      status: { $in: ['accepted', 'in_progress', 'completed_pending_verification'] }
    }).sort({ createdAt: -1 }));

    return { status: 200, body: { success: true, tasks: normalizeTasksLifecycleStatus(tasks) } };
  }

  const seniorId = user.role === 'caregiver' ? user.linkedSeniorId : user._id;
  if (user.role === 'caregiver' && !seniorId) {
    return { status: 404, body: { success: false, msg: 'No senior assigned to this caregiver' } };
  }

  const tasks = await populateTask(Task.find({ userId: seniorId }).sort({ createdAt: -1 }));
  const hiddenHistoryTaskIds = new Set((user.hiddenHistoryTaskIds || []).map(toId));
  const visibleTasks = user.role === 'elder'
    ? tasks.filter((task) => !(
      LEGACY_VERIFIED_HISTORY_STATUSES.includes(task.status) && hiddenHistoryTaskIds.has(toId(task._id))
    ))
    : tasks;

  return { status: 200, body: { success: true, tasks: normalizeTasksLifecycleStatus(visibleTasks) } };
};

const getAvailableTasks = async (user) => {
  if (user.role !== 'volunteer') {
    return { status: 403, body: { success: false, msg: 'Only volunteers can view available tasks' } };
  }

  const tasks = await populateTask(Task.find({ status: 'pending' }).sort({ createdAt: -1 }));
  return { status: 200, body: { success: true, tasks: normalizeTasksLifecycleStatus(tasks) } };
};

const getVolunteerHistory = async (user) => {
  if (user.role !== 'volunteer') {
    return { status: 403, body: { success: false, msg: 'Only volunteers can view task history' } };
  }

  const tasks = await populateTask(Task.find({
    assignedVolunteerId: user._id,
    status: { $in: LEGACY_VERIFIED_HISTORY_STATUSES }
  }).sort({ createdAt: -1 }));

  return { status: 200, body: { success: true, tasks: normalizeTasksLifecycleStatus(tasks) } };
};

const getTaskById = async (taskId, user) => {
  const task = await populateTask(Task.findById(taskId));

  if (!task) {
    return { status: 404, body: { success: false, msg: 'Task not found' } };
  }

  if (!canReadTask(task, user)) {
    return { status: 403, body: { success: false, msg: 'Not authorized' } };
  }

  return { status: 200, body: { success: true, task: normalizeTaskLifecycleStatus(task) } };
};

const hideSeniorHistoryTask = async (taskId, user) => {
  if (user.role !== 'elder') {
    return { status: 403, body: { success: false, msg: 'Only seniors can hide task history' } };
  }

  const task = await Task.findOne({
    _id: taskId,
    userId: user._id,
    status: { $in: LEGACY_VERIFIED_HISTORY_STATUSES }
  }).select('_id');

  if (!task) {
    return { status: 404, body: { success: false, msg: 'History task not found' } };
  }

  await User.updateOne(
    { _id: user._id },
    { $addToSet: { hiddenHistoryTaskIds: task._id } }
  );

  return { status: 200, body: { success: true, msg: 'Task hidden from history', taskId } };
};

const clearSeniorTaskHistory = async (user) => {
  if (user.role !== 'elder') {
    return { status: 403, body: { success: false, msg: 'Only seniors can clear task history' } };
  }

  const tasks = await Task.find({
    userId: user._id,
    status: { $in: LEGACY_VERIFIED_HISTORY_STATUSES }
  }).select('_id');

  const taskIds = tasks.map((task) => task._id);
  if (taskIds.length) {
    await User.updateOne(
      { _id: user._id },
      { $addToSet: { hiddenHistoryTaskIds: { $each: taskIds } } }
    );
  }

  return { status: 200, body: { success: true, msg: 'Task history cleared', taskIds } };
};

const updateTaskRequest = async (taskId, user, payload = {}) => {
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
      body: { success: false, msg: 'Only pending tasks can be edited' }
    };
  }

  const nextPayload = buildTaskPayload(user, {
    ...task.toObject(),
    ...Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, payload[field]]).filter(([, value]) => value !== undefined))
  });

  if (!nextPayload.title || !nextPayload.description) {
    return { status: 400, body: { success: false, msg: 'Title and description are required' } };
  }

  Object.assign(task, nextPayload);
  await task.save();
  const updatedTask = await emitTaskToAudience(task, 'task_updated');

  return { status: 200, body: { success: true, msg: 'Task updated', task: updatedTask } };
};

const deleteTaskRequest = async (taskId, user) => {
  const task = await Task.findById(taskId);

  if (!task) {
    return { status: 404, body: { success: false, msg: 'Task not found' } };
  }

  if (toId(task.userId) !== toId(user._id)) {
    return { status: 403, body: { success: false, msg: 'Not authorized' } };
  }

  if (task.status !== 'pending') {
    return { status: 400, body: { success: false, msg: 'Only pending tasks can be deleted' } };
  }

  const deletedTask = await emitTaskToAudience(task, 'task_deleted');
  await task.deleteOne();

  return { status: 200, body: { success: true, msg: 'Task deleted', task: deletedTask } };
};

const acceptTask = async (taskId, user) => {
  if (user.role !== 'volunteer') {
    return { status: 403, body: { success: false, msg: 'Only volunteers can accept tasks' } };
  }

  const acceptedAt = new Date();
  const task = await Task.findOneAndUpdate(
    { _id: taskId, status: 'pending' },
    {
      $set: {
        status: 'accepted',
        volunteerId: user._id,
        assignedVolunteerId: user._id,
        assignedVolunteerName: user.name || '',
        'stateTimestamps.acceptedAt': acceptedAt
      }
    },
    { new: true }
  );

  if (!task) {
    return { status: 409, body: { success: false, msg: 'Task already accepted' } };
  }

  const updatedTask = await emitTaskToAudience(task, 'task_accepted');
  const volunteers = await User.find({ role: 'volunteer' }).select('_id');
  emitTaskEvent({
    userIds: volunteers.map((volunteer) => volunteer._id),
    event: 'task_accepted',
    task: updatedTask
  });

  await dispatchTaskNotification({
    userId: task.userId,
    title: 'Task accepted',
    message: `Task accepted by ${task.assignedVolunteerName || 'a volunteer'}.`,
    task: updatedTask,
    taskAction: 'accepted'
  });

  return { status: 200, body: { success: true, msg: 'Task accepted', task: updatedTask } };
};

const ignoreTask = async (taskId, user) => {
  if (user.role !== 'volunteer') {
    return { status: 403, body: { success: false, msg: 'Only volunteers can ignore tasks' } };
  }

  const task = await Task.findOneAndUpdate(
    { _id: taskId, status: 'pending' },
    { $addToSet: { ignoredBy: user._id } },
    { new: true }
  );

  if (!task) {
    return { status: 404, body: { success: false, msg: 'Pending task not found' } };
  }

  emitTaskEvent({ userIds: [user._id], event: 'task_ignored', task });
  return { status: 200, body: { success: true, msg: 'Task ignored', taskId } };
};

const startTask = async (taskId, user) => {
  if (user.role !== 'volunteer') {
    return { status: 403, body: { success: false, msg: 'Only volunteers can start tasks' } };
  }

  const task = await Task.findById(taskId);
  if (!task) return { status: 404, body: { success: false, msg: 'Task not found' } };
  if (toId(task.assignedVolunteerId || task.volunteerId) !== toId(user._id)) {
    return { status: 403, body: { success: false, msg: 'Not authorized' } };
  }
  if (task.status !== 'accepted') {
    return { status: 400, body: { success: false, msg: 'Only accepted tasks can be started' } };
  }

  task.status = 'in_progress';
  task.stateTimestamps = {
    ...(task.stateTimestamps || {}),
    inProgressAt: new Date()
  };
  await task.save();
  const updatedTask = await emitTaskToAudience(task, 'task_accepted');
  await emitTaskToAudience(task, 'task_updated');

  return { status: 200, body: { success: true, msg: 'Task started', task: updatedTask } };
};

const completeTask = async (taskId, user, payload = {}) => {
  if (user.role !== 'volunteer') {
    return { status: 403, body: { success: false, msg: 'Only volunteers can complete tasks' } };
  }

  const task = await Task.findById(taskId);
  if (!task) return { status: 404, body: { success: false, msg: 'Task not found' } };
  if (toId(task.assignedVolunteerId || task.volunteerId) !== toId(user._id)) {
    return { status: 403, body: { success: false, msg: 'Not authorized' } };
  }
  if (!['accepted', 'in_progress'].includes(task.status)) {
    return { status: 400, body: { success: false, msg: 'Only accepted or in-progress tasks can be completed' } };
  }

  const completedAt = new Date();
  task.status = 'completed_pending_verification';
  task.completionProof = {
    ...(task.completionProof || {}),
    note: String(payload.note || task.completionProof?.note || '').trim(),
    completedAt
  };
  task.stateTimestamps = {
    ...(task.stateTimestamps || {}),
    completedAt
  };
  await task.save();
  const updatedTask = await emitTaskToAudience(task, 'task_completed');

  await dispatchTaskNotification({
    userId: task.userId,
    title: 'Task completed',
    message: `Task completed by ${task.assignedVolunteerName || user.name || 'a volunteer'}. Please verify completion.`,
    task: updatedTask,
    taskAction: 'completed'
  });

  return { status: 200, body: { success: true, msg: 'Task completed', task: updatedTask } };
};

const verifyTask = async (taskId, user, payload = {}) => {
  const task = await Task.findById(taskId);
  if (!task) return { status: 404, body: { success: false, msg: 'Task not found' } };
  if (toId(task.userId) !== toId(user._id)) {
    return { status: 403, body: { success: false, msg: 'Only the senior who created this task can verify it' } };
  }
  if (!['completed_pending_verification', 'completed'].includes(task.status)) {
    return { status: 400, body: { success: false, msg: 'Only tasks pending senior verification can be verified' } };
  }

  const rating = Number(payload.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: 400, body: { success: false, msg: 'Rating between 1 and 5 is required' } };
  }
  const feedback = String(payload.feedback || '').trim();
  if (!feedback) {
    return { status: 400, body: { success: false, msg: 'Feedback is required to verify task completion' } };
  }

  const verifiedAt = new Date();
  task.status = 'verified_completed';
  task.verification = {
    rating,
    feedback,
    verifiedAt
  };
  task.stateTimestamps = {
    ...(task.stateTimestamps || {}),
    verifiedAt,
    closedAt: verifiedAt
  };
  await task.save();
  const updatedTask = await emitTaskToAudience(task, 'task_verified');

  const volunteerUserId = task.assignedVolunteerId || task.volunteerId;
  if (volunteerUserId) {
    await dispatchTaskNotification({
      userId: volunteerUserId,
      title: 'Task verified',
      message: 'Task verified by senior. Your reward record has been updated.',
      task: updatedTask,
      taskAction: 'verified'
    });
  }

  return { status: 200, body: { success: true, msg: 'Task verified', task: updatedTask } };
};

module.exports = {
  createTaskRequest,
  getMyRequests,
  getAvailableTasks,
  getVolunteerHistory,
  getTaskById,
  hideSeniorHistoryTask,
  clearSeniorTaskHistory,
  updateTaskRequest,
  deleteTaskRequest,
  acceptTask,
  ignoreTask,
  startTask,
  completeTask,
  verifyTask
};
