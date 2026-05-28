const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../../../shared/models/User');

const getToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers?.authorization;

  if (authToken) return authToken.replace('Bearer ', '');
  if (headerToken) return headerToken.replace('Bearer ', '');
  return null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = getToken(socket);

    if (token) {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'smart-senior-secret-2026'
      );
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId).select('_id name role');

      if (!user) {
        return next(new Error('Socket authentication failed'));
      }

      socket.user = user;
      socket.userId = String(user._id);
      return next();
    }

    const fallbackUserId = socket.handshake.auth?.userId;
    if (fallbackUserId && mongoose.Types.ObjectId.isValid(fallbackUserId)) {
      socket.userId = String(fallbackUserId);
      return next();
    }

    return next(new Error('Socket authentication required'));
  } catch (err) {
    return next(new Error('Socket authentication failed'));
  }
};

module.exports = { authenticateSocket };
