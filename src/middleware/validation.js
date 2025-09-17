/**
 * Validation middleware for request validation
 * Uses Joi for schema validation
 */

const Joi = require('joi');
const logger = require('../utils/logger');

/**
 * Validate request body against Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation error:', errorDetails);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errorDetails
      });
    }

    req.body = value;
    next();
  };
};

/**
 * Validate query parameters against Joi schema
 * @param {Object} schema - Joi validation schema
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Query validation error:', errorDetails);

      return res.status(400).json({
        success: false,
        error: 'Query validation failed',
        details: errorDetails
      });
    }

    req.query = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // NLQ query validation
  nlqQuery: Joi.object({
    query: Joi.string().min(1).max(1000).required()
      .messages({
        'string.empty': 'Query cannot be empty',
        'string.min': 'Query must be at least 1 character long',
        'string.max': 'Query cannot exceed 1000 characters'
      }),
    language: Joi.string().valid('en', 'hi').default('en')
      .messages({
        'any.only': 'Language must be either "en" or "hi"'
      }),
    options: Joi.object({
      includeExplanation: Joi.boolean().default(true),
      validateBeforeExecution: Joi.boolean().default(true),
      maxResults: Joi.number().integer().min(1).max(10000).default(1000)
    }).default({})
  }),

  // SQL execution validation
  sqlExecution: Joi.object({
    sql: Joi.string().min(1).max(10000).required()
      .messages({
        'string.empty': 'SQL query cannot be empty',
        'string.min': 'SQL query must be at least 1 character long',
        'string.max': 'SQL query cannot exceed 10000 characters'
      }),
    options: Joi.object({
      maxResults: Joi.number().integer().min(1).max(10000).default(1000)
    }).default({})
  }),

  // Table relationship validation
  tableRelationship: Joi.object({
    source_table: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Source table name cannot be empty',
        'string.max': 'Source table name cannot exceed 255 characters'
      }),
    target_table: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Target table name cannot be empty',
        'string.max': 'Target table name cannot exceed 255 characters'
      }),
    source_column: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Source column name cannot be empty',
        'string.max': 'Source column name cannot exceed 255 characters'
      }),
    target_column: Joi.string().min(1).max(255).required()
      .messages({
        'string.empty': 'Target column name cannot be empty',
        'string.max': 'Target column name cannot exceed 255 characters'
      }),
    relationship_type: Joi.string().valid('foreign_key', 'one_to_one', 'one_to_many', 'many_to_many')
      .default('foreign_key')
      .messages({
        'any.only': 'Relationship type must be one of: foreign_key, one_to_one, one_to_many, many_to_many'
      }),
    description: Joi.string().max(1000).allow('')
      .messages({
        'string.max': 'Description cannot exceed 1000 characters'
      })
  }),

  // Query suggestions validation
  querySuggestions: Joi.object({
    q: Joi.string().max(100).allow('').default('')
      .messages({
        'string.max': 'Query string cannot exceed 100 characters'
      })
  })
};

/**
 * Sanitize input to prevent injection attacks
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that might break SQL
    .trim();
};

/**
 * Sanitize request body middleware
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    }
  }
  next();
};

/**
 * Sanitize query parameters middleware
 */
const sanitizeQuery = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    }
  }
  next();
};

module.exports = {
  validateBody,
  validateQuery,
  schemas,
  sanitizeBody,
  sanitizeQuery
};
