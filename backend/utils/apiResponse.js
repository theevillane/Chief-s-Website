'use strict';

/**
 * Send a successful JSON response.
 * @param {Response} res - Express response
 * @param {number}   statusCode
 * @param {string}   message
 * @param {*}        data
 * @param {object}   [meta] - pagination / extra metadata
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const payload = { success: true, message };
  if (data !== null && data !== undefined) payload.data = data;
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
};

/**
 * Send an error JSON response.
 * @param {Response} res
 * @param {number}   statusCode
 * @param {string}   message
 * @param {Array}    [errors] - validation errors array
 */
const sendError = (res, statusCode = 500, message = 'An error occurred', errors = null) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

/**
 * Pagination metadata helper.
 * @param {number} total - total documents matching query
 * @param {number} page  - current page (1-indexed)
 * @param {number} limit - items per page
 */
const paginate = (total, page, limit) => ({
  total,
  page:        parseInt(page),
  limit:       parseInt(limit),
  total_pages: Math.ceil(total / limit),
  has_next:    page * limit < total,
  has_prev:    page > 1,
});

module.exports = { sendSuccess, sendError, paginate };
