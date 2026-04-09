const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');
const authController = require('../controllers/authController');
const pushService = require('../services/pushNotificationService');

const router = express.Router();

// Public routes with rate limiting
router.post('/signup', registerLimiter, validationMiddleware('signup'), authController.signup);
router.post('/login', authLimiter, validationMiddleware('login'), authController.login);
router.post('/refresh', authLimiter, authController.refreshToken);

// Email verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authMiddleware, authController.resendVerification);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/logout', authMiddleware, authController.logout);

// Host contract
router.get('/host-contract-status', authMiddleware, authController.getHostContractStatus);
router.post('/accept-host-contract', authMiddleware, authController.acceptHostContract);

// Device token registration for push notifications
router.post('/device-token', authMiddleware, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }
    await pushService.registerDeviceToken(req.user.userId, token, platform || 'ios');
    res.json({ message: 'Device token registered' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

// Remove device token (on logout)
router.delete('/device-token', authMiddleware, async (req, res) => {
  try {
    const { token } = req.body;
    if (token) {
      await pushService.removeDeviceToken(req.user.userId, token);
    }
    res.json({ message: 'Device token removed' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove device token' });
  }
});

module.exports = router;
