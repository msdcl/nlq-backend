/**
 * Error Handler Middleware
 * Centralized error handling middleware
 * Follows Single Responsibility Principle - only handles errors
 */

const ErrorHandlingService = require('../services/ErrorHandlingService');
const logger = require('../utils/logger');

/**
 * Error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (error, req, res, next) => {
  // Log the error
  logger.error('Error caught by middleware:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determine error type based on error properties
  let errorType = 'generic';
  
  if (error.code && error.code.startsWith('23')) {
    errorType = 'database';
  } else if (error.name === 'ValidationError') {
    errorType = 'validation';
  } else if (error.name === 'UnauthorizedError') {
    errorType = 'auth';
  } else if (error.name === 'ForbiddenError') {
    errorType = 'authorization';
  } else if (error.message && error.message.includes('rate limit')) {
    errorType = 'rateLimit';
  }

  // Format error response
  const errorResponse = ErrorHandlingService.formatErrorResponse(
    error, 
    `${req.method} ${req.url}`, 
    errorType
  );

  // Send error response
  res.status(errorResponse.statusCode).json(errorResponse);
};

/**
 * 404 handler for undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.method} ${req.url} not found`);
  error.statusCode = 404;
  next(error);
};

/**
 * Async error wrapper for route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler
};
