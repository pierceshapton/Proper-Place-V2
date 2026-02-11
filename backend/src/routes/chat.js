const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const chatController = require('../controllers/chatController');

// All chat routes require authentication
router.use(authMiddleware);

// Contact/Conversation operations
router.delete('/contacts/:id', chatController.deleteContact);
router.patch('/contacts/:id/unread', chatController.markContactAsUnread);
router.patch('/contacts/:id/read', chatController.markContactAsRead);

// Message operations
router.delete('/messages/:id', chatController.deleteMessage);

module.exports = router;
