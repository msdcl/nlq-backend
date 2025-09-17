/**
 * Query Execution Service - Handles safe SQL query execution
 * Provides sandboxing, validation, and result processing
 */

const db = require('../config/database');
const logger = require('../utils/logger');
const { format } = require('sql-formatter');

class QueryExecutionService {
  constructor() {
    this.primaryDB = db.getPrimaryDB();
    this.maxResultRows = parseInt(process.env.MAX_RESULT_ROWS) || 10000;
    this.queryTimeout = parseInt(process.env.QUERY_TIMEOUT_MS) || 30000;
    this.sandboxMode = process.env.SANDBOX_MODE === 'true';
  }

  /**
   * Execute SQL query with safety checks
   * @param {string} sql - SQL query to execute
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Query execution result
   */
  async executeQuery(sql, options = {}) {
    const startTime = Date.now();
    
    try {
      // Validate query safety
      await this.validateQuerySafety(sql);
      
      // Format SQL for better readability
      const formattedSQL = this.formatSQL(sql);
      
      // Execute query with timeout
      const result = await this.executeWithTimeout(formattedSQL, options);
      
      const executionTime = Date.now() - startTime;
      
      logger.info(`Query executed successfully in ${executionTime}ms`);
      
      return {
        success: true,
        data: result.rows,
        columns: result.fields?.map(field => ({
          name: field.name,
          type: field.dataTypeID,
          nullable: field.nullable
        })) || [],
        rowCount: result.rowCount,
        executionTime,
        sql: formattedSQL,
        metadata: {
          executed_at: new Date().toISOString(),
          sandbox_mode: this.sandboxMode
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Query execution failed:', error);
      
      return {
        success: false,
        error: error.message,
        executionTime,
        sql: this.formatSQL(sql),
        metadata: {
          executed_at: new Date().toISOString(),
          sandbox_mode: this.sandboxMode
        }
      };
    }
  }

  /**
   * Validate query safety before execution
   * @param {string} sql - SQL query to validate
   * @throws {Error} If query is unsafe
   */
  async validateQuerySafety(sql) {
    const upperSQL = sql.toUpperCase().trim();
    
    // Check for dangerous operations
    const dangerousKeywords = [
      'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 
      'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
    ];
    
    for (const keyword of dangerousKeywords) {
      if (upperSQL.includes(keyword)) {
        throw new Error(`Dangerous operation detected: ${keyword} statements are not allowed`);
      }
    }
    
    // Check for system table access
    const systemTables = [
      'pg_', 'information_schema', 'sys', 'mysql', 'performance_schema'
    ];
    
    for (const table of systemTables) {
      if (upperSQL.includes(table)) {
        throw new Error(`Access to system table detected: ${table} access is not allowed`);
      }
    }
    
    // Check for file system access
    if (upperSQL.includes('COPY') || upperSQL.includes('\\COPY')) {
      throw new Error('File system access operations are not allowed');
    }
    
    // Check for function calls that might be dangerous
    const dangerousFunctions = [
      'pg_read_file', 'pg_ls_dir', 'lo_import', 'lo_export'
    ];
    
    for (const func of dangerousFunctions) {
      if (upperSQL.includes(func)) {
        throw new Error(`Dangerous function call detected: ${func} is not allowed`);
      }
    }
    
    // Validate query structure
    if (!upperSQL.startsWith('SELECT')) {
      throw new Error('Only SELECT queries are allowed');
    }
    
    // Check for subqueries that might be dangerous
    if (this.containsDangerousSubquery(sql)) {
      throw new Error('Query contains potentially dangerous subqueries');
    }
  }

  /**
   * Check if query contains dangerous subqueries
   * @param {string} sql - SQL query
   * @returns {boolean} True if dangerous subquery found
   */
  containsDangerousSubquery(sql) {
    // This is a simplified check - in production, you'd want more sophisticated parsing
    const dangerousPatterns = [
      /SELECT.*FROM.*pg_/i,
      /SELECT.*FROM.*information_schema/i,
      /SELECT.*FROM.*sys\./i
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(sql));
  }

  /**
   * Execute query with timeout
   * @param {string} sql - SQL query
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Query result
   */
  async executeWithTimeout(sql, options = {}) {
    return new Promise(async (resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Query timeout after ${this.queryTimeout}ms`));
      }, this.queryTimeout);
      
      try {
        const client = await this.primaryDB.connect();
        
        // Set query timeout at database level
        await client.query(`SET statement_timeout = ${this.queryTimeout}`);
        
        // Add LIMIT if not present and maxResultRows is set
        let finalSQL = sql;
        if (this.maxResultRows && !sql.toUpperCase().includes('LIMIT')) {
          finalSQL = `${sql} LIMIT ${this.maxResultRows}`;
        }
        
        const result = await client.query(finalSQL);
        client.release();
        
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Format SQL query for better readability
   * @param {string} sql - SQL query
   * @returns {string} Formatted SQL
   */
  formatSQL(sql) {
    try {
      return format(sql, {
        language: 'postgresql',
        tabWidth: 2,
        useTabs: false,
        keywordCase: 'upper',
        functionCase: 'upper'
      });
    } catch (error) {
      logger.warn('Failed to format SQL:', error);
      return sql;
    }
  }

  /**
   * Get query execution plan
   * @param {string} sql - SQL query
   * @returns {Promise<Object>} Execution plan
   */
  async getExecutionPlan(sql) {
    try {
      const explainSQL = `EXPLAIN (FORMAT JSON, ANALYZE, BUFFERS) ${sql}`;
      const result = await this.executeWithTimeout(explainSQL);
      
      return {
        plan: result.rows[0]['QUERY PLAN'],
        metadata: {
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to get execution plan:', error);
      throw new Error(`Execution plan generation failed: ${error.message}`);
    }
  }

  /**
   * Estimate query cost without execution
   * @param {string} sql - SQL query
   * @returns {Promise<Object>} Cost estimation
   */
  async estimateQueryCost(sql) {
    try {
      const explainSQL = `EXPLAIN (FORMAT JSON) ${sql}`;
      const result = await this.executeWithTimeout(explainSQL);
      
      const plan = result.rows[0]['QUERY PLAN'][0];
      const totalCost = plan['Total Cost'];
      const estimatedRows = plan['Plan Rows'];
      
      return {
        totalCost,
        estimatedRows,
        costPerRow: totalCost / Math.max(estimatedRows, 1),
        metadata: {
          estimated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Failed to estimate query cost:', error);
      throw new Error(`Cost estimation failed: ${error.message}`);
    }
  }

  /**
   * Test query syntax without execution
   * @param {string} sql - SQL query
   * @returns {Promise<Object>} Syntax validation result
   */
  async validateSyntax(sql) {
    try {
      const explainSQL = `EXPLAIN ${sql}`;
      await this.executeWithTimeout(explainSQL);
      
      return {
        valid: true,
        message: 'Query syntax is valid'
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message,
        error: error.code
      };
    }
  }

  /**
   * Get query statistics
   * @param {string} queryId - Query identifier
   * @returns {Promise<Object>} Query statistics
   */
  async getQueryStats(queryId) {
    try {
      // This would typically query a query log table
      // For now, return basic stats
      return {
        queryId,
        totalExecutions: 0,
        averageExecutionTime: 0,
        lastExecuted: null,
        successRate: 0
      };
    } catch (error) {
      logger.error('Failed to get query stats:', error);
      throw error;
    }
  }

  /**
   * Cancel running query
   * @param {string} queryId - Query identifier
   * @returns {Promise<boolean>} Success status
   */
  async cancelQuery(queryId) {
    try {
      // In a real implementation, you'd track active queries and cancel them
      logger.info(`Query ${queryId} cancellation requested`);
      return true;
    } catch (error) {
      logger.error('Failed to cancel query:', error);
      return false;
    }
  }

  /**
   * Get database connection status
   * @returns {Promise<Object>} Connection status
   */
  async getConnectionStatus() {
    try {
      const result = await this.primaryDB.query('SELECT NOW() as current_time, version() as version');
      return {
        connected: true,
        currentTime: result.rows[0].current_time,
        version: result.rows[0].version
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

module.exports = QueryExecutionService;
