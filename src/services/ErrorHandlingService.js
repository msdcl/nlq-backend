/**
 * Error Handling Service
 * Centralized error handling and response formatting
 * Follows Interface Segregation Principle - focused on error handling only
 */

const logger = require('../utils/logger');

class ErrorHandlingService {
  /**
   * Handle database errors
   * @param {Error} error - Database error
   * @param {string} operation - Operation that failed
   * @returns {Object} Formatted error response
   */
  static handleDatabaseError(error, operation) {
    logger.error(`Database error in ${operation}:`, error);
    
    // Check for specific database error types
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'Database connection failed',
        message: 'Unable to connect to the database. Please try again later.',
        code: 'DB_CONNECTION_ERROR'
      };
    }
    
    if (error.code === '23505') { // Unique constraint violation
      return {
        success: false,
        error: 'Duplicate entry',
        message: 'The requested data already exists.',
        code: 'DUPLICATE_ENTRY'
      };
    }
    
    if (error.code === '23503') { // Foreign key constraint violation
      return {
        success: false,
        error: 'Invalid reference',
        message: 'The requested data references non-existent records.',
        code: 'INVALID_REFERENCE'
      };
    }
    
    // Generic database error
    return {
      success: false,
      error: 'Database operation failed',
      message: 'An error occurred while processing your request.',
      code: 'DB_OPERATION_ERROR'
    };
  }

  /**
   * Handle validation errors
   * @param {Error} error - Validation error
   * @param {string} field - Field that failed validation
   * @returns {Object} Formatted error response
   */
  static handleValidationError(error, field) {
    logger.error(`Validation error for field ${field}:`, error);
    
    return {
      success: false,
      error: 'Validation failed',
      message: `Invalid value for ${field}: ${error.message}`,
      code: 'VALIDATION_ERROR',
      field
    };
  }

  /**
   * Handle service errors
   * @param {Error} error - Service error
   * @param {string} service - Service that failed
   * @returns {Object} Formatted error response
   */
  static handleServiceError(error, service) {
    logger.error(`Service error in ${service}:`, error);
    
    return {
      success: false,
      error: 'Service operation failed',
      message: `An error occurred in the ${service} service.`,
      code: 'SERVICE_ERROR'
    };
  }

  /**
   * Handle authentication errors
   * @param {Error} error - Authentication error
   * @returns {Object} Formatted error response
   */
  static handleAuthenticationError(error) {
    logger.error('Authentication error:', error);
    
    return {
      success: false,
      error: 'Authentication failed',
      message: 'Invalid or expired authentication credentials.',
      code: 'AUTH_ERROR'
    };
  }

  /**
   * Handle authorization errors
   * @param {Error} error - Authorization error
   * @returns {Object} Formatted error response
   */
  static handleAuthorizationError(error) {
    logger.error('Authorization error:', error);
    
    return {
      success: false,
      error: 'Access denied',
      message: 'You do not have permission to perform this action.',
      code: 'AUTHORIZATION_ERROR'
    };
  }

  /**
   * Handle rate limiting errors
   * @param {Error} error - Rate limiting error
   * @returns {Object} Formatted error response
   */
  static handleRateLimitError(error) {
    logger.error('Rate limit exceeded:', error);
    
    return {
      success: false,
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_ERROR'
    };
  }

  /**
   * Handle generic errors
   * @param {Error} error - Generic error
   * @param {string} operation - Operation that failed
   * @returns {Object} Formatted error response
   */
  static handleGenericError(error, operation) {
    logger.error(`Generic error in ${operation}:`, error);
    
    return {
      success: false,
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR'
    };
  }

  /**
   * Get appropriate HTTP status code for error
   * @param {string} errorCode - Error code
   * @returns {number} HTTP status code
   */
  static getStatusCode(errorCode) {
    const statusMap = {
      'DB_CONNECTION_ERROR': 503,
      'DUPLICATE_ENTRY': 409,
      'INVALID_REFERENCE': 400,
      'DB_OPERATION_ERROR': 500,
      'VALIDATION_ERROR': 400,
      'SERVICE_ERROR': 500,
      'AUTH_ERROR': 401,
      'AUTHORIZATION_ERROR': 403,
      'RATE_LIMIT_ERROR': 429,
      'INTERNAL_ERROR': 500
    };
    
    return statusMap[errorCode] || 500;
  }

  /**
   * Format error response for client
   * @param {Error} error - Original error
   * @param {string} operation - Operation that failed
   * @param {string} errorType - Type of error (database, validation, etc.)
   * @returns {Object} Formatted error response with status code
   */
  static formatErrorResponse(error, operation, errorType = 'generic') {
    let errorResponse;
    
    switch (errorType) {
      case 'database':
        errorResponse = this.handleDatabaseError(error, operation);
        break;
      case 'validation':
        errorResponse = this.handleValidationError(error, operation);
        break;
      case 'service':
        errorResponse = this.handleServiceError(error, operation);
        break;
      case 'auth':
        errorResponse = this.handleAuthenticationError(error);
        break;
      case 'authorization':
        errorResponse = this.handleAuthorizationError(error);
        break;
      case 'rateLimit':
        errorResponse = this.handleRateLimitError(error);
        break;
      default:
        errorResponse = this.handleGenericError(error, operation);
    }
    
    return {
      ...errorResponse,
      statusCode: this.getStatusCode(errorResponse.code),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ErrorHandlingService;
