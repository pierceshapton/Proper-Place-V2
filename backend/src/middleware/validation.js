const { schemas, validate } = require('../utils/validation');
const logger = require('../utils/logger');

/**
 * Create validation middleware for specific schema
 */
function validationMiddleware(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      logger.error('Validation schema not found', { schemaName });
      return res.status(500).json({
        error: 'server_error',
        message: 'Validation schema not found',
      });
    }

    const result = validate(schema, req.body);

    if (!result.valid) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'Validation failed',
        details: result.details,
      });
    }

    req.validatedBody = result.data;
    next();
  };
}

module.exports = {
  validationMiddleware,
};
