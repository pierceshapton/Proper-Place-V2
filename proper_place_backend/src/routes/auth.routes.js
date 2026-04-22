import express from 'express';
import { AuthService } from '../services/auth.service.js';
import { validateSignup, validateLogin } from '../middleware/validation.js';

const router = express.Router();

// POST /auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, name, password, confirmPassword } = req.body;

    // Validate input
    const validation = validateSignup(email, name, password, confirmPassword);
    if (!validation.valid) {
      return res.status(400).json({
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    // Register user
    const result = await AuthService.register(email, name, password);

    return res.status(201).json({
      message: 'User created successfully',
      ...result,
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error.message.includes('already registered')) {
      return res.status(409).json({
        message: 'Email already registered',
      });
    }

    return res.status(500).json({
      message: error.message || 'Signup failed',
    });
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = validateLogin(email, password);
    if (!validation.valid) {
      return res.status(400).json({
        message: validation.errors[0],
        errors: validation.errors,
      });
    }

    // Login user
    const result = await AuthService.login(email, password);

    return res.status(200).json({
      message: 'Login successful',
      ...result,
    });
  } catch (error) {
    console.error('Login error:', error);

    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    return res.status(500).json({
      message: error.message || 'Login failed',
    });
  }
});

// GET /auth/user/:userId - Get user info (requires valid token in header)
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await AuthService.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      message: error.message || 'Failed to get user',
    });
  }
});

// DELETE /auth/user/:userId - Permanently delete account (user must own the account)
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Verify the token belongs to the requesting user
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorised' });
    }
    const token = authHeader.slice(7);
    let decoded;
    try {
      decoded = AuthService.verifyToken(token);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (String(decoded.user_id) !== String(userId)) {
      return res.status(403).json({ message: 'You can only delete your own account' });
    }

    await AuthService.deleteUser(userId);

    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({
      message: error.message || 'Failed to delete account',
    });
  }
});

export default router;
