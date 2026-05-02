const express = require('express');
const contactController = require('../controllers/contactController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public endpoint - submit contact form
router.post('/submit', contactController.submitContact);

// Admin endpoints - require authentication
router.get('/', authMiddleware, contactController.getContacts);
router.get('/stats/summary', authMiddleware, contactController.getContactStats);
router.get('/:id', authMiddleware, contactController.getContact);
router.patch('/:id', authMiddleware, contactController.updateContact);
router.post('/:id/reply', authMiddleware, contactController.addReply);

module.exports = router;
