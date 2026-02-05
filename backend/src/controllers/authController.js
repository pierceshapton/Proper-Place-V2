const db = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/hash');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * POST /auth/signup
 */
async function signup(req, res, next) {
  try {
    const { email, password, name } = req.validatedBody;

    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        error: 'email_exists',
        message: 'Email already registered',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, verified)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, false]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    logger.info('User signed up', { userId: user.id, email: user.email });

    res.status(201).json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Signup error', { error: error.message });
    next(error);
  }
}

/**
 * POST /auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;

    // Find user
    const result = await db.query(
      `SELECT id, email, name, password_hash, role
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Email or password incorrect',
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);

    if (!passwordValid) {
      return res.status(401).json({
        error: 'invalid_credentials',
        message: 'Email or password incorrect',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [user.id, refreshToken, expiresAt]
    );

    logger.info('User logged in', { userId: user.id });

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    next(error);
  }
}

/**
 * GET /auth/me
 */
async function getCurrentUser(req, res, next) {
  try {
    const userId = req.user.userId;

    const result = await db.query(
      `SELECT id, email, name, avatar_url, bio, phone_number, 
              vehicle_registration, vehicle_length, vehicle_height, vehicle_width,
              dark_mode, offline_mode, role, verified, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    res.json({
      user: result.rows[0],
    });
  } catch (error) {
    logger.error('Get current user error', { error: error.message });
    next(error);
  }
}

/**
 * POST /auth/refresh
 */
async function refreshToken(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'missing_token',
        message: 'Refresh token required',
      });
    }

    // Verify token structure
    const decoded = verifyRefreshToken(refresh_token);

    if (!decoded) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid or expired refresh token',
      });
    }

    // Check if token is in database and not revoked
    const result = await db.query(
      `SELECT * FROM refresh_tokens 
       WHERE token = $1 AND revoked = false AND expires_at > NOW()`,
      [refresh_token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'token_revoked',
        message: 'Refresh token is invalid or revoked',
      });
    }

    // Get user info
    const userResult = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        message: 'User not found',
      });
    }

    const user = userResult.rows[0];
    const accessToken = generateAccessToken(user.id, user.email, user.role);

    logger.info('Token refreshed', { userId: user.id });

    res.json({
      access_token: accessToken,
    });
  } catch (error) {
    logger.error('Refresh token error', { error: error.message });
    next(error);
  }
}

/**
 * POST /auth/logout
 */
async function logout(req, res, next) {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      // Revoke refresh token
      await db.query(
        'UPDATE refresh_tokens SET revoked = true WHERE token = $1',
        [refresh_token]
      );
    }

    logger.info('User logged out', { userId: req.user.userId });

    res.json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout error', { error: error.message });
    next(error);
  }
}

module.exports = {
  signup,
  login,
  getCurrentUser,
  refreshToken,
  logout,
};
