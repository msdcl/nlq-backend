/**
 * NLQ Controller - Handles HTTP requests for natural language query processing
 * Provides REST API endpoints for the NLQ system
 */

const { AdvancedNLQService } = require('../services/AdvancedNLQService');
const logger = require('../utils/logger');

class NLQController {
  constructor() {
    this.nlqService = new AdvancedNLQService();
  }

  /**
   * Process natural language query
   * POST /api/nlq/query
   */
  async processQuery(req, res) {
    try {
      const { query, language = 'en', options = {} } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Query is required and must be a non-empty string'
        });
      }

      // Validate language
      const supportedLanguages = ['en', 'hi'];
      if (!supportedLanguages.includes(language)) {
        return res.status(400).json({
          success: false,
          error: `Unsupported language. Supported languages: ${supportedLanguages.join(', ')}`
        });
      }

      logger.info(`Processing NLQ request: "${query}" (${language})`);

      const result = await this.nlqService.processQuery(query, {
        language,
        ...options
      });

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('NLQ processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Generate SQL without execution
   * POST /api/nlq/generate-sql
   */
  async generateSQL(req, res) {
    try {
      const { query, language = 'en' } = req.body;

      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Query is required and must be a non-empty string'
        });
      }

      logger.info(`Generating SQL for: "${query}" (${language})`);

      const result = await this.nlqService.generateSQLOnly(query, { language });

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('SQL generation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Execute SQL query
   * POST /api/nlq/execute-sql
   */
  async executeSQL(req, res) {
    try {
      const { sql, options = {} } = req.body;

      if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'SQL query is required and must be a non-empty string'
        });
      }

      logger.info(`Executing SQL query`);

      const result = await this.nlqService.executeSQL(sql, options);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('SQL execution error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get query suggestions
   * GET /api/nlq/suggestions
   */
  async getSuggestions(req, res) {
    try {
      const { q = '' } = req.query;

      logger.info(`Getting query suggestions for: "${q}"`);

      const result = await this.nlqService.getQuerySuggestions(q);

      res.status(200).json(result);

    } catch (error) {
      logger.error('Query suggestions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get schema information
   * GET /api/nlq/schema
   */
  async getSchema(req, res) {
    try {
      logger.info('Getting schema information');

      const result = await this.nlqService.getSchemaInfo();

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }

    } catch (error) {
      logger.error('Schema retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Add table relationship
   * POST /api/nlq/relationships
   */
  async addRelationship(req, res) {
    try {
      const { 
        source_table, 
        target_table, 
        source_column, 
        target_column, 
        relationship_type = 'foreign_key',
        description 
      } = req.body;

      // Validate required fields
      if (!source_table || !target_table || !source_column || !target_column) {
        return res.status(400).json({
          success: false,
          error: 'source_table, target_table, source_column, and target_column are required'
        });
      }

      logger.info(`Adding relationship: ${source_table}.${source_column} -> ${target_table}.${target_column}`);

      const result = await this.nlqService.addTableRelationship({
        source_table,
        target_table,
        source_column,
        target_column,
        relationship_type,
        description
      });

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      logger.error('Relationship addition error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Refresh schema metadata
   * POST /api/nlq/refresh-schema
   */
  async refreshSchema(req, res) {
    try {
      logger.info('Refreshing schema metadata');

      await this.nlqService.refreshSchemaMetadata();

      res.status(200).json({
        success: true,
        message: 'Schema metadata refreshed successfully',
        metadata: {
          refreshed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Schema refresh error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Get service health status
   * GET /api/nlq/health
   */
  async getHealth(req, res) {
    try {
      // Simple health check for AdvancedNLQService
      const health = {
        healthy: true,
        service: 'AdvancedNLQService',
        timestamp: new Date().toISOString(),
        llm_available: true,
        llm_provider: 'Google Gemini Flash'
      };

      res.status(200).json(health);

    } catch (error) {
      logger.error('Health check error:', error);
      res.status(500).json({
        healthy: false,
        error: error.message
      });
    }
  }

  /**
   * Get service statistics
   * GET /api/nlq/stats
   */
  async getStats(req, res) {
    try {
      // This would typically return usage statistics
      // For now, return basic service info
      const stats = {
        service: 'NLQ Backend',
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        metadata: {
          generated_at: new Date().toISOString()
        }
      };

      res.status(200).json({
        success: true,
        stats
      });

    } catch (error) {
      logger.error('Stats retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }
}

module.exports = NLQController;
