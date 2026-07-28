const mongoose = require('mongoose');

// Small shared toolkit so every community sub-module (forums, events,
// activities, announcements, autoreply) follows the same error and
// response conventions instead of re-implementing them.

const toId = (value) => String(value?._id || value || '');

const createServiceError = (status, msg) => {
  const err = new Error(msg);
  err.status = status;
  return err;
};

const assertObjectId = (id, label = 'id') => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw createServiceError(400, `Valid ${label} is required`);
  }
};

// Wraps a controller handler so services can just `throw createServiceError(...)`
// and every route gets consistent { success, msg } error responses.
const asyncHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (!err.status) {
      console.error('Community module error:', err);
    }
    res.status(err.status || 500).json({ success: false, msg: err.message || 'Server error' });
  }
};

const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
};

module.exports = { toId, createServiceError, assertObjectId, asyncHandler, parsePagination };
