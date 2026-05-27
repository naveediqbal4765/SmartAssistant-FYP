const taskService = require('./task.service');

// Controllers only translate HTTP req/res; task rules live in task.service.
const createTaskRequest = async (req, res) => {
  try {
    const result = await taskService.createTaskRequest(req.user, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Create task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getMyRequests = async (req, res) => {
  try {
    const result = await taskService.getMyRequests(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Fetch tasks error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getAvailableTasks = async (req, res) => {
  try {
    const result = await taskService.getAvailableTasks(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Fetch available tasks error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getVolunteerHistory = async (req, res) => {
  try {
    const result = await taskService.getVolunteerHistory(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Fetch task history error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const getTaskById = async (req, res) => {
  try {
    const result = await taskService.getTaskById(req.params.id, req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const hideSeniorHistoryTask = async (req, res) => {
  try {
    const result = await taskService.hideSeniorHistoryTask(req.params.id, req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Hide task history error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const clearSeniorTaskHistory = async (req, res) => {
  try {
    const result = await taskService.clearSeniorTaskHistory(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Clear task history error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const updateTaskRequest = async (req, res) => {
  try {
    const result = await taskService.updateTaskRequest(req.params.id, req.user, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Update task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const deleteTaskRequest = async (req, res) => {
  try {
    const result = await taskService.deleteTaskRequest(req.params.id, req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Delete task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const acceptTask = async (req, res) => {
  try {
    const result = await taskService.acceptTask(req.params.id, req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Accept task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const ignoreTask = async (req, res) => {
  try {
    const result = await taskService.ignoreTask(req.params.id, req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Ignore task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const startTask = async (req, res) => {
  try {
    const result = await taskService.startTask(req.params.id, req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Start task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const completeTask = async (req, res) => {
  try {
    const result = await taskService.completeTask(req.params.id, req.user, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Complete task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const verifyTask = async (req, res) => {
  try {
    const result = await taskService.verifyTask(req.params.id, req.user, req.body);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('Verify task error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
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
