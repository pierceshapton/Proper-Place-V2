const logger = require('../utils/logger');

// Turn snake_case column names into readable phrases: "opening_hours" → "opening hours"
function humanize(column) {
  if (!column) return 'this field';
  return column.replace(/_/g, ' ');
}

// Attempt to extract the offending column name from a Postgres error.
// PG populates `err.column` for some codes; for others it's only in `detail`.
function extractColumn(err) {
  if (err.column) return err.column;
  const detail = err.detail || err.message || '';
  const m = detail.match(/column "([^"]+)"|Key \(([^)]+)\)/);
  return (m && (m[1] || m[2])) || '';
}

// Translate a Postgres error into a friendly, operator-facing message.
// Returns null if the code isn't one we know how to translate.
// See: https://www.postgresql.org/docs/current/errcodes-appendix.html
function friendlyPgError(err) {
  const column = extractColumn(err);
  const field = humanize(column);
  const Field = field.charAt(0).toUpperCase() + field.slice(1);

  switch (err.code) {
    case '22001': // string_data_right_truncation
      return {
        status: 400,
        error: 'value_too_long',
        message: column
          ? `The value for "${field}" is too long. Please shorten it and try again.`
          : `One of the fields is longer than allowed. Please shorten your input and try again.`,
      };
    case '23505': // unique_violation
      return {
        status: 409,
        error: 'conflict',
        message: column
          ? `Something with this ${field} already exists. Please use a different value.`
          : `This record already exists.`,
      };
    case '23502': // not_null_violation
      return {
        status: 400,
        error: 'missing_required_field',
        message: `${Field} is required.`,
      };
    case '23503': // foreign_key_violation
      return {
        status: 400,
        error: 'invalid_reference',
        message: `A linked record could not be found. Please check your selection and try again.`,
      };
    case '23514': // check_violation
      return {
        status: 400,
        error: 'invalid_value',
        message: `The value provided${column ? ` for ${field}` : ''} is not allowed.`,
      };
    case '22P02': // invalid_text_representation
      return {
        status: 400,
        error: 'invalid_format',
        message: `One of the values isn't in the expected format. Please double-check your input.`,
      };
    case '22003': // numeric_value_out_of_range
      return {
        status: 400,
        error: 'number_out_of_range',
        message: `A numeric value is out of the allowed range${column ? ` (${field})` : ''}.`,
      };
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return {
        status: 400,
        error: 'invalid_date',
        message: `A date value is invalid or out of range.`,
      };
    default:
      return null;
  }
}

/**
 * Global error handler.
 * - Translates known Postgres errors into friendly, operator-safe messages.
 * - Passes through intentional client errors (statusCode < 500) as-is.
 * - Masks server-side (5xx) internals in production.
 */
function errorHandler(err, req, res, next) {
  logger.error('Error handler', {
    message: err.message,
    code: err.code,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Explicit validation errors (from validation middleware)
  if (err.validation) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Validation failed',
      details: err.details,
    });
  }

  // Postgres errors have 5-char SQLSTATE codes — translate the ones we know.
  if (err.code && typeof err.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code)) {
    const friendly = friendlyPgError(err);
    if (friendly) {
      const body = { error: friendly.error, message: friendly.message };
      if (process.env.NODE_ENV !== 'production') body.debug = err.message;
      return res.status(friendly.status).json(body);
    }
  }

  const status = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // 4xx errors have intentional operator-facing messages — pass them through.
  if (status < 500) {
    return res.status(status).json({
      error: err.error || 'request_failed',
      message: err.message || 'Request failed',
    });
  }

  // 5xx — never leak internals in production.
  res.status(status).json({
    error: err.error || 'internal_error',
    message: isProduction
      ? 'Something went wrong on our end. Please try again, or contact support if this keeps happening.'
      : err.message || 'Internal server error',
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
