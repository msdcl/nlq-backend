/**
 * NLQ Routes - API routes for natural language query processing
 * Defines all endpoints for the NLQ system
 */

const express = require('express');
const router = express.Router();
const NLQController = require('../controllers/NLQController');
const { validateBody, validateQuery, schemas, sanitizeBody, sanitizeQuery } = require('../middleware/validation');
const { nlqLimiter, sqlExecutionLimiter, schemaLimiter, healthLimiter } = require('../middleware/rateLimiter');

const nlqController = new NLQController();

// Apply sanitization middleware to all routes
router.use(sanitizeBody);
router.use(sanitizeQuery);

/**
 * @route   POST /api/nlq/query
 * @desc    Process natural language query and return results
 * @access  Public
 * @rate    Limited by nlqLimiter
 */
router.post('/query', 
  nlqLimiter,
  validateBody(schemas.nlqQuery),
  (req, res) => nlqController.processQuery(req, res)
);

/**
 * @route   POST /api/nlq/generate-sql
 * @desc    Generate SQL from natural language without execution
 * @access  Public
 * @rate    Limited by nlqLimiter
 */
router.post('/generate-sql',
  nlqLimiter,
  validateBody(schemas.nlqQuery),
  (req, res) => nlqController.generateSQL(req, res)
);

/**
 * @route   POST /api/nlq/execute-sql
 * @desc    Execute SQL query
 * @access  Public
 * @rate    Limited by sqlExecutionLimiter
 */
router.post('/execute-sql',
  sqlExecutionLimiter,
  validateBody(schemas.sqlExecution),
  (req, res) => nlqController.executeSQL(req, res)
);

/**
 * @route   GET /api/nlq/suggestions
 * @desc    Get query suggestions based on partial input
 * @access  Public
 * @rate    Limited by generalLimiter
 */
router.get('/suggestions',
  validateQuery(schemas.querySuggestions),
  (req, res) => nlqController.getSuggestions(req, res)
);

/**
 * @route   GET /api/nlq/schema
 * @desc    Get database schema information
 * @access  Public
 * @rate    Limited by schemaLimiter
 */
router.get('/schema',
  schemaLimiter,
  (req, res) => nlqController.getSchema(req, res)
);

/**
 * @route   POST /api/nlq/relationships
 * @desc    Add table relationship
 * @access  Public
 * @rate    Limited by schemaLimiter
 */
router.post('/relationships',
  schemaLimiter,
  validateBody(schemas.tableRelationship),
  (req, res) => nlqController.addRelationship(req, res)
);

/**
 * @route   POST /api/nlq/refresh-schema
 * @desc    Refresh schema metadata
 * @access  Public
 * @rate    Limited by schemaLimiter
 */
router.post('/refresh-schema',
  schemaLimiter,
  (req, res) => nlqController.refreshSchema(req, res)
);

/**
 * @route   GET /api/nlq/health
 * @desc    Get service health status
 * @access  Public
 * @rate    Limited by healthLimiter
 */
router.get('/health',
  healthLimiter,
  (req, res) => nlqController.getHealth(req, res)
);

/**
 * @route   GET /api/nlq/stats
 * @desc    Get service statistics
 * @access  Public
 * @rate    Limited by generalLimiter
 */
router.get('/stats',
  (req, res) => nlqController.getStats(req, res)
);

module.exports = router;
