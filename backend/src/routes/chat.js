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

// Conversation endpoints
router.get('/conversations', chatController.getConversations);
router.get('/conversations/:otherUserId/messages', chatController.getMessages);
router.get('/bookings/:bookingId/messages', chatController.getMessagesByBooking);
router.put('/bookings/:bookingId/read', chatController.markBookingAsRead);
router.put('/conversations/:otherUserId/read', chatController.markConversationAsRead);
router.put('/conversations/:otherUserId/delivered', chatController.markMessagesAsDelivered);

// Response time
router.get('/response-time/:hostId', chatController.getResponseTime);

// Chat reopen requests
router.get('/bookings/:bookingId/status', chatController.getChatStatus);
router.post('/bookings/:bookingId/reopen', chatController.requestChatReopen);
router.put('/reopen/:requestId/respond', chatController.respondChatReopen);

// Message operations
router.post('/messages', chatController.sendMessage);
router.delete('/messages/clear-all', chatController.clearAllMessages);
router.delete('/messages/:id', chatController.deleteMessage);

module.exports = router;
