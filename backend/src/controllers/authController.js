const crypto = require('crypto');
const db = require('../config/database');
const { hashPassword, verifyPassword } = require('../utils/hash');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const { recordReferral } = require('./referralController');
const { sendVerificationEmail } = require('../utils/email');

/**
 * POST /auth/signup
 */
async function signup(req, res, next) {
  try {
    const { email, password, name, referral_code } = req.validatedBody;

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

    // Generate email verification token
    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const result = await db.query(
      `INSERT INTO users (email, password_hash, name, verified, referred_by, email_verification_token, email_verification_expires)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, false, referral_code || null, verificationToken, verificationExpires]
    );

    const user = result.rows[0];
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    // Send verification email (non-blocking)
    sendVerificationEmail(email, verificationToken).catch((err) => {
      logger.error('Failed to send verification email', { email, error: err.message });
    });

    // Record referral if a code was provided
    if (referral_code) {
      try {
        await recordReferral(referral_code, email);
        logger.info('Referral recorded', { referralCode: referral_code, newUserEmail: email });
      } catch (refErr) {
        logger.error('Referral recording failed (non-blocking)', { error: refErr.message });
      }
    }

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
      `SELECT id, email, name, password_hash, role, verified
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
        verified: user.verified,
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
              dark_mode, offline_mode, role, verified, created_at,
              host_contract_accepted_at, host_contract_version
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

/**
 * GET /auth/host-contract-status
 */
async function getHostContractStatus(req, res, next) {
  try {
    const userId = req.user.userId;
    const result = await db.query(
      `SELECT host_contract_accepted_at, host_contract_version FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'user_not_found' });
    }
    const user = result.rows[0];
    res.json({
      accepted: !!user.host_contract_accepted_at,
      version: user.host_contract_version || null,
      accepted_at: user.host_contract_accepted_at || null,
    });
  } catch (error) {
    logger.error('Get host contract status error', { error: error.message });
    next(error);
  }
}

/**
 * POST /auth/accept-host-contract
 */
const CURRENT_CONTRACT_VERSION = '1.0';

async function acceptHostContract(req, res, next) {
  try {
    const userId = req.user.userId;

    // Check if already signed — cannot re-sign or unsign
    const existing = await db.query(
      `SELECT host_contract_accepted_at FROM users WHERE id = $1`,
      [userId]
    );
    if (existing.rows[0]?.host_contract_accepted_at) {
      return res.status(409).json({
        error: 'already_signed',
        message: 'You have already signed the Host Agreement.',
      });
    }

    // Version is set server-side, not from client
    const version = CURRENT_CONTRACT_VERSION;
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    // Update user record
    await db.query(
      `UPDATE users SET host_contract_accepted_at = NOW(), host_contract_version = $1 WHERE id = $2`,
      [version, userId]
    );

    // Insert immutable audit record
    await db.query(
      `INSERT INTO contract_acceptances (user_id, contract_version, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userId, version, ip, userAgent]
    );

    logger.info('Host contract accepted', { userId, version, ip });
    res.json({ accepted: true, version });
  } catch (error) {
    logger.error('Accept host contract error', { error: error.message });
    next(error);
  }
}

/**
 * GET /auth/verify-email?token=xxx
 */
async function verifyEmail(req, res, next) {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).send(verifyHtmlPage(false, 'Missing verification token.'));
    }

    const result = await db.query(
      `UPDATE users
         SET verified = true,
             email_verification_token = NULL,
             email_verification_expires = NULL
       WHERE email_verification_token = $1
         AND email_verification_expires > NOW()
         AND verified = false
       RETURNING id, email`,
      [token]
    );

    if (result.rows.length === 0) {
      // Check if already verified
      const alreadyVerified = await db.query(
        `SELECT id FROM users WHERE verified = true AND email_verification_token IS NULL AND id IN (
           SELECT id FROM users WHERE email_verification_token = $1
         )`,
        [token]
      );
      if (alreadyVerified.rows.length > 0) {
        return res.send(verifyHtmlPage(true, 'Your email is already verified. You can return to the app.'));
      }
      return res.status(400).send(verifyHtmlPage(false, 'Invalid or expired verification link. Please request a new one from the app.'));
    }

    logger.info('Email verified', { userId: result.rows[0].id, email: result.rows[0].email });
    return res.send(verifyHtmlPage(true, 'Your email has been verified! You can return to the app.'));
  } catch (error) {
    logger.error('Email verification error', { error: error.message });
    next(error);
  }
}

/**
 * POST /auth/resend-verification
 */
async function resendVerification(req, res, next) {
  try {
    const userId = req.user.userId;

    const userResult = await db.query(
      'SELECT id, email, verified FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'user_not_found' });
    }

    const user = userResult.rows[0];

    if (user.verified) {
      return res.json({ message: 'Email already verified', verified: true });
    }

    const verificationToken = crypto.randomUUID();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.query(
      `UPDATE users SET email_verification_token = $1, email_verification_expires = $2 WHERE id = $3`,
      [verificationToken, verificationExpires, userId]
    );

    await sendVerificationEmail(user.email, verificationToken);

    logger.info('Verification email resent', { userId, email: user.email });
    res.json({ message: 'Verification email sent' });
  } catch (error) {
    logger.error('Resend verification error', { error: error.message });
    next(error);
  }
}

/** Helper: simple HTML page for verify-email redirect */
function verifyHtmlPage(success, message) {
  const color = success ? '#2E7D32' : '#C62828';
  const icon = success ? '✅' : '❌';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Email Verification – Proper Place</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5;}
.card{background:#fff;border-radius:16px;padding:48px 32px;text-align:center;max-width:400px;box-shadow:0 2px 12px rgba(0,0,0,.08);}
.icon{font-size:48px;margin-bottom:16px;}
h1{color:${color};font-size:22px;margin-bottom:12px;}
p{color:#555;line-height:1.6;}</style>
</head><body><div class="card"><div class="icon">${icon}</div><h1>${success ? 'Email Verified' : 'Verification Failed'}</h1><p>${message}</p></div></body></html>`;
}

module.exports = {
  signup,
  login,
  getCurrentUser,
  refreshToken,
  logout,
  getHostContractStatus,
  acceptHostContract,
  verifyEmail,
  resendVerification,
};
