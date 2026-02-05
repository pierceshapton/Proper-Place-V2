const logger = require('../utils/logger');

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  logger.error('Error handler', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Validation errors
  if (err.validation) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Validation failed',
      details: err.details,
    });
  }

  // Database errors
  if (err.code === '23505') { // Unique constraint violation
    return res.status(409).json({
      error: 'conflict',
      message: 'Resource already exists',
    });
  }

  // Default 500 error
  res.status(err.statusCode || 500).json({
    error: err.error || 'internal_error',
    message: err.message || 'Internal server error',
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'not_found',
    message: 'Endpoint not found',
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
