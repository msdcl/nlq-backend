/**
 * NLQ Service - Main service that orchestrates natural language to SQL conversion
 * Combines schema awareness, LLM processing, and query execution
 */

const SchemaModel = require('../models/SchemaModel');
const LLMService = require('./LLMService');
const QueryExecutionService = require('./QueryExecutionService');
const logger = require('../utils/logger');

class NLQService {
  constructor() {
    this.schemaModel = new SchemaModel();
    this.llmService = new LLMService();
    this.queryService = new QueryExecutionService();
    this.isInitialized = false;
  }

  /**
   * Initialize the NLQ service
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      if (this.isInitialized) {
        return;
      }

      // Initialize schema model
      await this.schemaModel.initialize();
      
      // Extract and store schema metadata
      await this.refreshSchemaMetadata();
      
      this.isInitialized = true;
      logger.info('NLQ Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize NLQ service:', error);
      throw error;
    }
  }

  /**
   * Refresh schema metadata from the database
   * @returns {Promise<void>}
   */
  async refreshSchemaMetadata() {
    try {
      logger.info('Refreshing schema metadata...');
      
      // Extract schema from primary database
      const schemaData = await this.schemaModel.extractSchema();
      
      // Generate embeddings and store metadata
      await this.schemaModel.storeSchemaMetadata(schemaData, (text) => 
        this.llmService.generateEmbedding(text)
      );
      
      logger.info(`Schema metadata refreshed: ${schemaData.length} entries`);
    } catch (error) {
      logger.error('Failed to refresh schema metadata:', error);
      throw error;
    }
  }

  /**
   * Process natural language query
   * @param {string} query - Natural language query
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processQuery(query, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        language = 'en',
        includeExplanation = true,
        validateBeforeExecution = true,
        maxResults = 1000
      } = options;

      logger.info(`Processing NLQ: "${query}" (${language})`);

      // Step 1: Generate query embedding
      const queryEmbedding = await this.llmService.generateEmbedding(query);
      
      // Step 2: Find relevant schema metadata
      const schemaContext = await this.schemaModel.findRelevantSchema(
        query, 
        queryEmbedding, 
        15 // Get top 15 relevant schema items
      );

      // Step 3: Generate SQL using LLM
      const sqlResult = await this.llmService.generateSQL(query, schemaContext, language);
      
      // Step 4: Validate SQL syntax
      const syntaxValidation = await this.queryService.validateSyntax(sqlResult.sql);
      
      if (!syntaxValidation.valid) {
        return {
          success: false,
          error: 'Generated SQL has syntax errors',
          details: syntaxValidation,
          query,
          processingTime: Date.now() - startTime
        };
      }

      // Step 5: Estimate query cost
      const costEstimation = await this.queryService.estimateQueryCost(sqlResult.sql);
      
      // Step 6: Execute query if validation passes
      let executionResult = null;
      if (validateBeforeExecution) {
        executionResult = await this.queryService.executeQuery(sqlResult.sql, {
          maxResults
        });
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        query,
        language,
        sql: sqlResult.sql,
        confidence: sqlResult.confidence,
        explanation: includeExplanation ? sqlResult.explanation : null,
        schemaContext: schemaContext.map(item => ({
          table: item.table_name,
          column: item.column_name,
          type: item.data_type,
          similarity: item.similarity
        })),
        costEstimation,
        executionResult,
        metadata: {
          processed_at: new Date().toISOString(),
          processing_time: processingTime,
          model: sqlResult.metadata.model
        }
      };

    } catch (error) {
      logger.error('Failed to process NLQ:', error);
      return {
        success: false,
        error: error.message,
        query,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Generate SQL without execution
   * @param {string} query - Natural language query
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} SQL generation result
   */
  async generateSQLOnly(query, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const { language = 'en' } = options;

      // Generate query embedding
      const queryEmbedding = await this.llmService.generateEmbedding(query);
      
      // Find relevant schema
      const schemaContext = await this.schemaModel.findRelevantSchema(
        query, 
        queryEmbedding, 
        15
      );

      // Generate SQL
      const sqlResult = await this.llmService.generateSQL(query, schemaContext, language);

      return {
        success: true,
        query,
        sql: sqlResult.sql,
        confidence: sqlResult.confidence,
        explanation: sqlResult.explanation,
        schemaContext: schemaContext.map(item => ({
          table: item.table_name,
          column: item.column_name,
          type: item.data_type,
          similarity: item.similarity
        })),
        metadata: {
          generated_at: new Date().toISOString(),
          model: sqlResult.metadata.model
        }
      };

    } catch (error) {
      logger.error('Failed to generate SQL:', error);
      return {
        success: false,
        error: error.message,
        query
      };
    }
  }

  /**
   * Execute pre-generated SQL
   * @param {string} sql - SQL query to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeSQL(sql, options = {}) {
    try {
      const { maxResults = 1000 } = options;
      
      const result = await this.queryService.executeQuery(sql, { maxResults });
      
      return {
        success: true,
        sql,
        ...result,
        metadata: {
          executed_at: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Failed to execute SQL:', error);
      return {
        success: false,
        error: error.message,
        sql
      };
    }
  }

  /**
   * Get query suggestions based on schema
   * @param {string} partialQuery - Partial natural language query
   * @returns {Promise<Array>} Query suggestions
   */
  async getQuerySuggestions(partialQuery) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const suggestions = [
        'Show me the top 10 customers by loan amount',
        'What is the total revenue for last month?',
        'Which branch has the highest number of loans?',
        'Show me customers who haven\'t made payments in 30 days',
        'What is the average loan amount by region?',
        'Show me the loan disbursement trend over the last 6 months',
        'Which products are most popular this quarter?',
        'Show me customers with overdue payments',
        'What is the loan approval rate by branch?',
        'Show me the monthly loan disbursement summary'
      ];

      // Filter suggestions based on partial query
      const filteredSuggestions = suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(partialQuery.toLowerCase())
      );

      return {
        success: true,
        suggestions: filteredSuggestions.slice(0, 5),
        metadata: {
          generated_at: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Failed to get query suggestions:', error);
      return {
        success: false,
        error: error.message,
        suggestions: []
      };
    }
  }

  /**
   * Get available tables and columns
   * @returns {Promise<Object>} Schema information
   */
  async getSchemaInfo() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const tables = await this.schemaModel.getAllTables();
      const schemaInfo = {};

      for (const tableName of tables) {
        const columns = await this.schemaModel.getTableColumns(tableName);
        schemaInfo[tableName] = columns;
      }

      return {
        success: true,
        schema: schemaInfo,
        metadata: {
          generated_at: new Date().toISOString(),
          tableCount: tables.length
        }
      };

    } catch (error) {
      logger.error('Failed to get schema info:', error);
      return {
        success: false,
        error: error.message,
        schema: {}
      };
    }
  }

  /**
   * Add table relationship
   * @param {Object} relationship - Relationship data
   * @returns {Promise<Object>} Operation result
   */
  async addTableRelationship(relationship) {
    try {
      await this.schemaModel.addTableRelationship(relationship);
      
      return {
        success: true,
        message: 'Table relationship added successfully',
        relationship
      };

    } catch (error) {
      logger.error('Failed to add table relationship:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    try {
      const dbStatus = await this.queryService.getConnectionStatus();
      const schemaStatus = this.isInitialized;
      
      return {
        healthy: dbStatus.connected && schemaStatus,
        database: dbStatus,
        schema: {
          initialized: schemaStatus
        },
        metadata: {
          checked_at: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        metadata: {
          checked_at: new Date().toISOString()
        }
      };
    }
  }
}

module.exports = NLQService;
