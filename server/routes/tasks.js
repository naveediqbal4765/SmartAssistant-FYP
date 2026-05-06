const express = require('express');
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
const User = require('../models/User');

const router = express.Router();

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, msg: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "smart-senior-secret-2026");
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, msg: 'User not found' });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ success: false, msg: 'Please authenticate' });
  }
};

// CREATE task (Senior)
router.post('/request', auth, async (req, res) => {
  try {
    // Only elders can create tasks
    if (req.user.role !== 'elder') {
      return res.status(403).json({ success: false, msg: 'Only seniors can request help' });
    }

    const { title, description, category, priority, location, scheduledTime } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, msg: 'Title and description are required' });
    }

    const task = new Task({
      userId: req.user._id,
      title,
      description,
      category: category || 'other',
      priority: priority || 'medium',
      location: location || { address: req.user.address || 'Not specified' },
      scheduledTime: scheduledTime || null,
      status: 'pending'
    });

    await task.save();

    res.json({ 
      success: true, 
      msg: 'Help request submitted successfully!',
      task 
    });
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// GET my tasks (Senior - view their requests)
router.get('/my-requests', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('volunteerId', 'name phone');
    
    res.json({ success: true, tasks });
  } catch (err) {
    console.error('Fetch tasks error:', err);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// GET single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('userId', 'name phone address')
      .populate('volunteerId', 'name phone');
    
    if (!task) {
      return res.status(404).json({ success: false, msg: 'Task not found' });
    }
    
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// CANCEL task (Senior)
router.put('/cancel/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ success: false, msg: 'Task not found' });
    }
    
    if (task.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, msg: 'Not authorized' });
    }
    
    if (task.status !== 'pending') {
      return res.status(400).json({ success: false, msg: 'Cannot cancel task that is already accepted' });
    }
    
    task.status = 'cancelled';
    await task.save();
    
    res.json({ success: true, msg: 'Task cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

module.exports = router;