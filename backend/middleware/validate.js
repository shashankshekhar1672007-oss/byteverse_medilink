const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

/**
 * Runs after express-validator chains; returns 422 if errors exist
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array();
    const hasBodyError = validationErrors.some((validationError) => validationError.location === 'body');
    return error(res, 'Validation failed', hasBodyError ? 422 : 400, validationErrors);
  }
  next();
};

module.exports = validate;
