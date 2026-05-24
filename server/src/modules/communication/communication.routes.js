const express = require('express');
const chatRoutes = require('./chat/chat.routes');
const callRoutes = require('./calls/call.routes');
const uploadRoutes = require('./uploads/upload.routes');
const notificationRoutes = require('./notifications/notification.routes');
const groupRoutes = require('./groups/group.routes');
const auth = require('../../middleware/auth');
const { deleteConversation } = require('./conversation.controller');

const router = express.Router();

// Placeholder module router. Mounting is intentionally deferred until logic is implemented.
router.use('/chat', chatRoutes);
router.use('/calls', callRoutes);
router.use('/uploads', uploadRoutes);
router.use('/notifications', notificationRoutes);
router.use('/groups', groupRoutes);
router.use('/group', groupRoutes);
router.delete('/conversation/:id', auth, deleteConversation);

module.exports = router;
