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

const getTaskById = async (req, res) => {
  try {
    const result = await taskService.getTaskById(req.params.id);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const cancelTask = async (req, res) => {
  try {
    const result = await taskService.cancelTask(req.params.id, req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

module.exports = {
  createTaskRequest,
  getMyRequests,
  getTaskById,
  cancelTask
};
