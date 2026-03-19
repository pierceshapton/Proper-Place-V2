const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All notification routes require authentication
router.use(authMiddleware);

// Get notification counts
router.get('/counts', notificationController.getNotificationCounts);

// Get unread message counts grouped by booking
router.get('/unread-by-booking', notificationController.getUnreadByBooking);

// Mark a specific message as read
router.patch('/messages/:messageId/read', notificationController.markMessageAsRead);

// Mark all messages from a sender as read
router.patch('/messages/read-all', notificationController.markAllMessagesFromSenderAsRead);

// Mark site status notifications as seen (host viewed Sites tab)
router.post('/sites/mark-seen', notificationController.markSitesSeen);

module.exports = router;
