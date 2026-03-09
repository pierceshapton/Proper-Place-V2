const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes with rate limiting
router.post('/signup', registerLimiter, validationMiddleware('signup'), authController.signup);
router.post('/login', authLimiter, validationMiddleware('login'), authController.login);
router.post('/refresh', authLimiter, authController.refreshToken);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
