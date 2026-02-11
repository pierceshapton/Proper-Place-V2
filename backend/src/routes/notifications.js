const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// All notification routes require authentication
router.use(authMiddleware);

// Get notification counts
router.get('/counts', notificationController.getNotificationCounts);

// Mark a specific message as read
router.patch('/messages/:messageId/read', notificationController.markMessageAsRead);

// Mark all messages from a sender as read
router.patch('/messages/read-all', notificationController.markAllMessagesFromSenderAsRead);

module.exports = router;
