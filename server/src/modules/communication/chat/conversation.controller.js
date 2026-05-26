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

const getConversationById = async (req, res) => {
  try {
    const conversation = await conversationService.getConversationById(
      req.user._id,
      req.params.conversationId
    );
    return res.json({ success: true, conversation });
  } catch (err) {
    console.error('Fetch conversation error:', err);
    return res.status(err.status || 500).json({
      success: false,
      msg: err.status ? err.message : 'Server error'
    });
  }
};

const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    const conversation = await conversationService.createConversation(req.user._id, participantId);
    return res.status(201).json({ success: true, conversation });
  } catch (err) {
    console.error('Create conversation error:', err);
    return res.status(err.status || 500).json({
      success: false,
      msg: err.status ? err.message : 'Server error'
    });
  }
};

const resolveConversation = async (req, res) => {
  try {
    const conversation = await conversationService.resolveConversation(req.user._id, req.body);
    return res.json({ success: true, conversation });
  } catch (err) {
    console.error('Resolve conversation error:', err);
    return res.status(err.status || 500).json({
      success: false,
      msg: err.status ? err.message : 'Server error'
    });
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

module.exports = {
  getConversations,
  getConversationById,
  createConversation,
  resolveConversation,
  searchUsers
};
