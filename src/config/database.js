/**
 * Database configuration and connection management
 * Handles both primary PostgreSQL database and vector database connections
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

class DatabaseConfig {
  constructor() {
    this.primaryPool = null;
    this.vectorPool = null;
  }

  /**
   * Initialize primary database connection
   * @returns {Pool} PostgreSQL connection pool
   */
  initializePrimaryDB() {
    if (this.primaryPool) {
      return this.primaryPool;
    }

    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'nlq_database',
      user: process.env.DB_USER || 'nlq_user',
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.primaryPool = new Pool(config);

    this.primaryPool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });

    logger.info('Primary database connection pool initialized');
    return this.primaryPool;
  }

  /**
   * Initialize vector database connection for embeddings
   * @returns {Pool} PostgreSQL connection pool with pgvector extension
   */
  initializeVectorDB() {
    if (this.vectorPool) {
      return this.vectorPool;
    }

    const config = {
      host: process.env.VECTOR_DB_HOST || process.env.DB_HOST || 'localhost',
      port: process.env.VECTOR_DB_PORT || process.env.DB_PORT || 5432,
      database: process.env.VECTOR_DB_NAME || 'nlq_vectors',
      user: process.env.VECTOR_DB_USER || process.env.DB_USER || 'nlq_user',
      password: process.env.VECTOR_DB_PASSWORD || process.env.DB_PASSWORD,
      max: 10, // Smaller pool for vector operations
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

    this.vectorPool = new Pool(config);

    this.vectorPool.on('error', (err) => {
      logger.error('Unexpected error on vector database client', err);
    });

    logger.info('Vector database connection pool initialized');
    return this.vectorPool;
  }

  /**
   * Get primary database pool
   * @returns {Pool} Primary database connection pool
   */
  getPrimaryDB() {
    if (!this.primaryPool) {
      return this.initializePrimaryDB();
    }
    return this.primaryPool;
  }

  /**
   * Get vector database pool
   * @returns {Pool} Vector database connection pool
   */
  getVectorDB() {
    if (!this.vectorPool) {
      return this.initializeVectorDB();
    }
    return this.vectorPool;
  }

  /**
   * Test database connections
   * @returns {Promise<Object>} Connection status
   */
  async testConnections() {
    const results = {
      primary: false,
      vector: false,
      errors: []
    };

    try {
      // Test primary database
      const primaryClient = await this.getPrimaryDB().connect();
      await primaryClient.query('SELECT NOW()');
      primaryClient.release();
      results.primary = true;
    } catch (error) {
      results.errors.push(`Primary DB: ${error.message}`);
      logger.error('Primary database connection failed:', error);
    }

    try {
      // Test vector database
      const vectorClient = await this.getVectorDB().connect();
      await vectorClient.query('SELECT NOW()');
      vectorClient.release();
      results.vector = true;
    } catch (error) {
      results.errors.push(`Vector DB: ${error.message}`);
      logger.error('Vector database connection failed:', error);
    }

    return results;
  }

  /**
   * Close all database connections
   */
  async closeConnections() {
    if (this.primaryPool) {
      await this.primaryPool.end();
      this.primaryPool = null;
    }
    if (this.vectorPool) {
      await this.vectorPool.end();
      this.vectorPool = null;
    }
    logger.info('All database connections closed');
  }
}

module.exports = new DatabaseConfig();
