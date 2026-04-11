const { validationResult } = require('express-validator');
const { error } = require('../utils/apiResponse');

/**
 * Runs after express-validator chains; returns 422 if errors exist
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, 'Validation failed', 422, errors.array());
  }
  next();
};

module.exports = validate;
