const { verifyAccessToken, extractToken } = require('../utils/jwt');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
function authMiddleware(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({
        error: 'auth_required',
        message: 'Authorization token required',
      });
    }

    const decoded = verifyAccessToken(token);

    if (!decoded) {
      return res.status(401).json({
        error: 'invalid_token',
        message: 'Invalid or expired token',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    res.status(500).json({
      error: 'auth_error',
      message: 'Authentication error',
    });
  }
}

/**
 * Optional auth - don't fail if no token, but verify if present
 */
function optionalAuthMiddleware(req, res, next) {
  try {
    const token = extractToken(req.headers.authorization);

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        req.user = decoded;
      }
    }

    next();
  } catch (error) {
    next();
  }
}

/**
 * Admin-only middleware
 */
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Admin access required',
    });
  }
  next();
}

/**
 * CRM middleware — allows admin or employee roles
 */
function crmMiddleware(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'employee')) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'CRM access required',
    });
  }
  next();
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  adminMiddleware,
  crmMiddleware,
};
