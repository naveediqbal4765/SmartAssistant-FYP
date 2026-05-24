const express = require('express');
const chatRoutes = require('./chat/chat.routes');
const callRoutes = require('./calls/call.routes');
const uploadRoutes = require('./uploads/upload.routes');
const notificationRoutes = require('./notifications/notification.routes');

const router = express.Router();

// Placeholder module router. Mounting is intentionally deferred until logic is implemented.
router.use('/chat', chatRoutes);
router.use('/calls', callRoutes);
router.use('/uploads', uploadRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
