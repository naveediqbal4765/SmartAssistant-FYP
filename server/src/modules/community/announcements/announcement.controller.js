const announcementService = require('./announcement.service');
const { asyncHandler } = require('../shared/helpers');

const getMeta = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      categories: announcementService.getCategories(),
      audiences: announcementService.getAudiences(),
      canPost: announcementService.canPostAnnouncements(req.user)
    }
  });
});

const listAnnouncements = asyncHandler(async (req, res) => {
  const data = await announcementService.listAnnouncements(req.user, req.query);
  res.json({ success: true, data });
});

const createAnnouncement = asyncHandler(async (req, res) => {
  const data = await announcementService.createAnnouncement(req.user, req.body);
  res.status(201).json({ success: true, data });
});

const markAsRead = asyncHandler(async (req, res) => {
  const data = await announcementService.markAsRead(req.params.announcementId, req.user);
  res.json({ success: true, data });
});

const deleteAnnouncement = asyncHandler(async (req, res) => {
  const data = await announcementService.deleteAnnouncement(req.params.announcementId, req.user);
  res.json({ success: true, data });
});

module.exports = { getMeta, listAnnouncements, createAnnouncement, markAsRead, deleteAnnouncement };
