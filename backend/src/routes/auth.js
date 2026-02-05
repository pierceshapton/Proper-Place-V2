const express = require('express');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { validationMiddleware } = require('../middleware/validation');
const authController = require('../controllers/authController');

const router = express.Router();

// Public routes
router.post('/signup', validationMiddleware('signup'), authController.signup);
router.post('/login', validationMiddleware('login'), authController.login);
router.post('/refresh', authController.refreshToken);

// Protected routes
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
