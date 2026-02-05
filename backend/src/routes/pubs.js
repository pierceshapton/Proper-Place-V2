const express = require('express');
const { optionalAuthMiddleware } = require('../middleware/auth');
const pubController = require('../controllers/pubController');

const router = express.Router();

// Public routes
router.get('/', optionalAuthMiddleware, pubController.getPubs);
router.get('/:id', optionalAuthMiddleware, pubController.getPubDetail);

// Admin routes (will be handled in main server file)
router.post('/', pubController.createPub);
router.patch('/:id', pubController.updatePub);
router.delete('/:id', pubController.deletePub);

module.exports = router;
