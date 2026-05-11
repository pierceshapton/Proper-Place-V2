const jwt = require('jsonwebtoken');

// SECURITY: JWT secrets must be set via environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Fail fast if secrets are not configured in production
if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[JWT] ❌ CRITICAL: JWT_SECRET and JWT_REFRESH_SECRET must be set!');
    process.exit(1);
  } else {
    console.warn('[JWT] ⚠️ WARNING: Using insecure default secrets for development');
  }
}

const SECURE_JWT_SECRET = JWT_SECRET || 'dev-only-secret-change-in-production';
const SECURE_JWT_REFRESH_SECRET = JWT_REFRESH_SECRET || 'dev-only-refresh-secret-change-in-production';

// Mobile-friendly token expiry: long-lived access token, very long refresh token.
// This matches industry-standard mobile auth (Twitter/X, Instagram, etc.) where
// users stay signed in for months unless they explicitly log out.
const JWT_EXPIRY = process.env.JWT_EXPIRY || '30d'; // 30 day access token
const JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '365d'; // 1 year refresh token

/**
 * Generate JWT access token
 */
function generateAccessToken(userId, email, role) {
  return jwt.sign(
    { userId, email, role },
    SECURE_JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

/**
 * Generate JWT refresh token
 */
function generateRefreshToken(userId) {
  return jwt.sign(
    { userId },
    SECURE_JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY }
  );
}

/**
 * Verify access token
 */
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, SECURE_JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, SECURE_JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader) {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractToken,
};
