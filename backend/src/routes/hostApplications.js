const express = require('express');
const router = express.Router();
const hostApplicationController = require('../controllers/hostApplicationController');
const { authMiddleware } = require('../middleware/auth');

// POST /host-applications — submit a new application (authenticated)
router.post('/', authMiddleware, hostApplicationController.submitApplication);

// GET /host-applications/:userId — check application status (authenticated)
router.get('/:userId', authMiddleware, hostApplicationController.getApplicationStatus);

module.exports = router;
