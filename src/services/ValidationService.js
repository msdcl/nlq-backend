/**
 * Validation Service
 * Handles data validation for dashboard requests
 * Follows Open/Closed Principle - open for extension, closed for modification
 */

class ValidationService {
  /**
   * Validate limit parameter for pagination
   * @param {*} limit - Limit value to validate
   * @param {number} maxLimit - Maximum allowed limit
   * @param {number} defaultLimit - Default limit if invalid
   * @returns {number} Validated limit
   */
  static validateLimit(limit, maxLimit = 100, defaultLimit = 5) {
    const parsedLimit = parseInt(limit);
    
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      return defaultLimit;
    }
    
    if (parsedLimit > maxLimit) {
      return maxLimit;
    }
    
    return parsedLimit;
  }

  /**
   * Validate date range parameters
   * @param {string} startDate - Start date string
   * @param {string} endDate - End date string
   * @returns {Object} Validated date range
   */
  static validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    // If dates are invalid, use default range (last 30 days)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const defaultStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: defaultStart,
        endDate: now,
        isValid: false
      };
    }
    
    // Ensure start date is before end date
    if (start > end) {
      return {
        startDate: end,
        endDate: start,
        isValid: true
      };
    }
    
    // Ensure dates are not in the future
    const finalStart = start > now ? now : start;
    const finalEnd = end > now ? now : end;
    
    return {
      startDate: finalStart,
      endDate: finalEnd,
      isValid: true
    };
  }

  /**
   * Validate category filter
   * @param {string} category - Category name to validate
   * @param {Array} validCategories - Array of valid category names
   * @returns {string|null} Validated category or null
   */
  static validateCategory(category, validCategories = []) {
    if (!category || typeof category !== 'string') {
      return null;
    }
    
    const normalizedCategory = category.toLowerCase().trim();
    const validCategory = validCategories.find(cat => 
      cat.toLowerCase() === normalizedCategory
    );
    
    return validCategory || null;
  }

  /**
   * Validate status filter
   * @param {string} status - Status to validate
   * @param {Array} validStatuses - Array of valid statuses
   * @returns {string|null} Validated status or null
   */
  static validateStatus(status, validStatuses = ['delivered', 'shipped', 'completed', 'processing', 'cancelled', 'returned']) {
    if (!status || typeof status !== 'string') {
      return null;
    }
    
    const normalizedStatus = status.toLowerCase().trim();
    const validStatus = validStatuses.find(s => s.toLowerCase() === normalizedStatus);
    
    return validStatus || null;
  }

  /**
   * Sanitize string input
   * @param {string} input - Input string to sanitize
   * @param {number} maxLength - Maximum allowed length
   * @returns {string} Sanitized string
   */
  static sanitizeString(input, maxLength = 255) {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Remove potentially dangerous characters
    const sanitized = input
      .replace(/[<>]/g, '') // Remove HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .trim();
    
    // Truncate if too long
    return sanitized.length > maxLength 
      ? sanitized.substring(0, maxLength) 
      : sanitized;
  }

  /**
   * Validate and sanitize query parameters
   * @param {Object} query - Query parameters object
   * @returns {Object} Validated and sanitized parameters
   */
  static validateQueryParams(query) {
    return {
      limit: this.validateLimit(query.limit),
      category: this.validateCategory(query.category),
      status: this.validateStatus(query.status),
      search: this.sanitizeString(query.search, 100),
      sortBy: this.sanitizeString(query.sortBy, 50),
      sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
    };
  }
}

module.exports = ValidationService;
