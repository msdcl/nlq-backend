/**
 * Rate limiting middleware
 * Implements rate limiting to prevent abuse and ensure fair usage
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * Create rate limiter configuration
 * @param {Object} options - Rate limiter options
 * @returns {Object} Rate limiter configuration
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per window
    message = 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Rate limit exceeded',
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skipSuccessfulRequests,
    skipFailedRequests,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

/**
 * General API rate limiter
 * Applied to all API endpoints
 */
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many API requests, please try again later.'
});

/**
 * Strict rate limiter for NLQ processing
 * Applied to query processing endpoints
 */
const nlqLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per 5 minutes
  message: 'Too many NLQ requests, please try again later.'
});

/**
 * SQL execution rate limiter
 * Applied to SQL execution endpoints
 */
const sqlExecutionLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many SQL execution requests, please try again later.'
});

/**
 * Schema operations rate limiter
 * Applied to schema-related endpoints
 */
const schemaLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 requests per 10 minutes
  message: 'Too many schema operations, please try again later.'
});

/**
 * Health check rate limiter (more lenient)
 * Applied to health check endpoints
 */
const healthLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many health check requests, please try again later.'
});

/**
 * Custom rate limiter for specific endpoints
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware
 */
const customLimiter = (options) => {
  return createRateLimiter(options);
};

/**
 * Rate limiter bypass for trusted IPs
 * @param {Array} trustedIPs - Array of trusted IP addresses
 * @returns {Function} Express middleware
 */
const bypassForTrustedIPs = (trustedIPs = []) => {
  return (req, res, next) => {
    if (trustedIPs.includes(req.ip)) {
      return next();
    }
    return generalLimiter(req, res, next);
  };
};

/**
 * Dynamic rate limiter based on user type
 * @param {Function} getUserType - Function to determine user type
 * @returns {Function} Express middleware
 */
const dynamicLimiter = (getUserType) => {
  return (req, res, next) => {
    const userType = getUserType(req);
    
    let limiter;
    switch (userType) {
      case 'premium':
        limiter = createRateLimiter({
          windowMs: 15 * 60 * 1000,
          max: 200
        });
        break;
      case 'standard':
        limiter = createRateLimiter({
          windowMs: 15 * 60 * 1000,
          max: 100
        });
        break;
      case 'free':
      default:
        limiter = createRateLimiter({
          windowMs: 15 * 60 * 1000,
          max: 50
        });
        break;
    }
    
    return limiter(req, res, next);
  };
};

module.exports = {
  generalLimiter,
  nlqLimiter,
  sqlExecutionLimiter,
  schemaLimiter,
  healthLimiter,
  customLimiter,
  bypassForTrustedIPs,
  dynamicLimiter,
  createRateLimiter
};
