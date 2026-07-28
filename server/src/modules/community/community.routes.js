const express = require('express');

const router = express.Router();

router.use('/forums', require('./forums/forum.routes'));
router.use('/events', require('./events/event.routes'));
router.use('/activities', require('./activities/activity.routes'));
router.use('/announcements', require('./announcements/announcement.routes'));
router.use('/autoreply', require('./autoreply/autoReply.routes'));

module.exports = router;
