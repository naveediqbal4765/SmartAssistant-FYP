const mongoose = require('mongoose');
const conversationService = require('./chat/conversation.service');
const groupService = require('./groups/group.service');
const { emitConversationDeleted } = require('./sockets/socket.manager');

const deleteConversation = async (req, res) => {
  try {
    const conversationId = req.params.id;

    if (!req.user?._id) {
      return res.status(401).json({ success: false, msg: 'Unauthorized delete request' });
    }

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ success: false, msg: 'Valid conversation id is required' });
    }

    let chatType = 'private';
    try {
      await conversationService.hideConversationForUser(conversationId, req.user._id);
    } catch (err) {
      if (err.status !== 404) throw err;
      await groupService.hideGroupForUser(conversationId, req.user._id);
      chatType = 'group';
    }

    emitConversationDeleted({
      userId: req.user._id,
      conversationId,
      chatType
    });

    return res.json({ success: true, conversationId, chatType });
  } catch (err) {
    console.error('Delete conversation error:', err);
    return res.status(err.status || 500).json({
      success: false,
      msg: err.status ? err.message : 'Server error'
    });
  }
};

module.exports = { deleteConversation };
