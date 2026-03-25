const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const autoMessageController = require('../controllers/autoMessageController');

// All routes require authentication
router.use(authMiddleware);

// Get templates for a place
router.get('/place/:placeId', autoMessageController.getTemplates);

// Save/update templates for a place
router.put('/place/:placeId', autoMessageController.saveTemplates);

module.exports = router;
