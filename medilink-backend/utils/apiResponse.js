/**
 * Standard success response
 */
const success = (res, data = {}, statusCode = 200, meta = {}) => {
  return res.status(statusCode).json({
    success: true,
    ...meta,
    data,
  });
};

/**
 * Standard error response
 */
const error = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Paginated response
 */
const paginate = (res, data, total, page, limit) => {
  return res.status(200).json({
    success: true,
    count: data.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    data,
  });
};

module.exports = { success, error, paginate };
