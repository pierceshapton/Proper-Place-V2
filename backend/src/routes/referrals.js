const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

// Get or create the current host's referral code
router.get('/code', authMiddleware, referralController.getOrCreateReferralCode);

// Get referral stats for current host
router.get('/stats', authMiddleware, referralController.getReferralStats);

// Stripe Connect - create account & get onboarding link
router.post('/connect/setup', authMiddleware, referralController.createConnectAccount);

// Stripe Connect - check account status
router.get('/connect/status', authMiddleware, referralController.getConnectStatus);

// Retry payouts for pending referrals
router.post('/connect/retry-payouts', authMiddleware, referralController.retryPendingPayouts);

module.exports = router;
