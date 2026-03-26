const express = require('express');
const hostLeadController = require('../controllers/hostLeadController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public endpoint - submit host lead from QR code signup
router.post('/submit', hostLeadController.submitLead);

// Admin endpoints - require authentication
router.get('/', authMiddleware, hostLeadController.getLeads);
router.get('/stats/summary', authMiddleware, hostLeadController.getLeadStats);
router.get('/:id', authMiddleware, hostLeadController.getLead);
router.patch('/:id', authMiddleware, hostLeadController.updateLead);

module.exports = router;
