const conversationService = require('./conversation.service');

const getConversations = async (req, res) => {
  try {
    const conversations = await conversationService.getConversations(req.user._id);
    return res.json({ success: true, conversations });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return res.status(500).json({ success: false, msg: 'Server error' });
  }
};

const searchUsers = async (req, res) => {
  try {
    const users = await conversationService.searchUsers(req.user._id, req.query.query || '');
    return res.json({ success: true, users });
  } catch (err) {
    console.error('Search chat users error:', err);
    return res.status(err.status || 500).json({
      success: false,
      msg: err.status ? err.message : 'Server error'
    });
  }
};

module.exports = { getConversations, searchUsers };
