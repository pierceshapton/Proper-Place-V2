const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

// Get or create the current host's referral code
router.get('/code', authMiddleware, referralController.getOrCreateReferralCode);

// Get referral stats for current host
router.get('/stats', authMiddleware, referralController.getReferralStats);

module.exports = router;
