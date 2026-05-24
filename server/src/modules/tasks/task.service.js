const Task = require('./task.model');
const ActivityLog = require('../../shared/models/ActivityLog');

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

  return { status: 200, body: { success: true, msg: 'Task cancelled' } };
};

module.exports = {
  createTaskRequest,
  getMyRequests,
  getTaskById,
  cancelTask
};
