const express = require('express');
const auth = require('../../../middleware/auth');
const announcementController = require('./announcement.controller');

const router = express.Router();

router.get('/meta', auth, announcementController.getMeta);
router.get('/', auth, announcementController.listAnnouncements);
router.post('/', auth, announcementController.createAnnouncement);
router.post('/:announcementId/read', auth, announcementController.markAsRead);
router.delete('/:announcementId', auth, announcementController.deleteAnnouncement);

module.exports = router;
