const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ success: false, msg: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'smart-senior-secret-2026'
    );

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ success: false, msg: 'Invalid token format' });
    }

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

module.exports = auth;
