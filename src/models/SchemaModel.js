/**
 * Schema Model - Manages database schema metadata and vector embeddings
 * Handles table/column information storage and retrieval for NLQ processing
 */

const db = require('../config/database');
const logger = require('../utils/logger');

class SchemaModel {
  constructor() {
    this.primaryDB = db.getPrimaryDB();
    this.vectorDB = db.getVectorDB();
  }

  /**
   * Initialize schema tables and vector extension
   */
  async initialize() {
    try {
      // Enable pgvector extension
      await this.vectorDB.query('CREATE EXTENSION IF NOT EXISTS vector;');
      
      // Create schema metadata table
      await this.vectorDB.query(`
        CREATE TABLE IF NOT EXISTS schema_metadata (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(255) NOT NULL,
          column_name VARCHAR(255),
          data_type VARCHAR(100),
          is_nullable BOOLEAN DEFAULT true,
          column_default TEXT,
          description TEXT,
          synonyms TEXT[], -- Array of synonyms for the column
          embedding vector(1536), -- Gemini embedding dimension
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create index for vector similarity search
      await this.vectorDB.query(`
        CREATE INDEX IF NOT EXISTS schema_metadata_embedding_idx 
        ON schema_metadata USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      `);

      // Create table relationships table
      await this.vectorDB.query(`
        CREATE TABLE IF NOT EXISTS table_relationships (
          id SERIAL PRIMARY KEY,
          source_table VARCHAR(255) NOT NULL,
          target_table VARCHAR(255) NOT NULL,
          source_column VARCHAR(255) NOT NULL,
          target_column VARCHAR(255) NOT NULL,
          relationship_type VARCHAR(50) DEFAULT 'foreign_key',
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      logger.info('Schema metadata tables initialized');
    } catch (error) {
      logger.error('Failed to initialize schema tables:', error);
      throw error;
    }
  }

  /**
   * Extract schema information from the primary database
   * @param {string} schemaName - Database schema name (default: 'public')
   * @returns {Promise<Array>} Array of table and column metadata
   */
  async extractSchema(schemaName = 'public') {
    try {
      const query = `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          COALESCE(pgd.description, '') as description
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
        LEFT JOIN pg_class pgc ON pgc.relname = t.table_name
        LEFT JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace AND pgn.nspname = t.table_schema
        LEFT JOIN pg_description pgd ON pgd.objoid = pgc.oid AND pgd.objsubid = c.ordinal_position
        WHERE t.table_schema = $1
        AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name, c.ordinal_position;
      `;

      const result = await this.primaryDB.query(query, [schemaName]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to extract schema:', error);
      throw error;
    }
  }

  /**
   * Store schema metadata with embeddings
   * @param {Array} schemaData - Schema metadata array
   * @param {Function} embeddingFunction - Function to generate embeddings
   */
  async storeSchemaMetadata(schemaData, embeddingFunction) {
    try {
      // Clear existing metadata
      await this.vectorDB.query('DELETE FROM schema_metadata');

      for (const row of schemaData) {
        // Create description text for embedding
        const description = this.createDescription(row);
        
        // Generate embedding
        const embedding = await embeddingFunction(description);
        
        // Insert metadata
        await this.vectorDB.query(`
          INSERT INTO schema_metadata 
          (table_name, column_name, data_type, is_nullable, column_default, description, embedding)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          row.table_name,
          row.column_name,
          row.data_type,
          row.is_nullable === 'YES',
          row.column_default,
          row.description || '',
          `[${embedding.join(',')}]` // Convert array to PostgreSQL array format
        ]);
      }

      logger.info(`Stored ${schemaData.length} schema metadata entries`);
    } catch (error) {
      logger.error('Failed to store schema metadata:', error);
      throw error;
    }
  }

  /**
   * Create a descriptive text for schema metadata
   * @param {Object} row - Schema row data
   * @returns {string} Description text
   */
  createDescription(row) {
    const parts = [
      `Table: ${row.table_name}`,
      `Column: ${row.column_name}`,
      `Type: ${row.data_type}`,
      row.is_nullable === 'YES' ? 'Nullable' : 'Not null'
    ];

    if (row.column_default) {
      parts.push(`Default: ${row.column_default}`);
    }

    if (row.description) {
      parts.push(`Description: ${row.description}`);
    }

    return parts.join(', ');
  }

  /**
   * Find relevant schema metadata using vector similarity
   * @param {string} query - Natural language query
   * @param {Array} queryEmbedding - Query embedding vector
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Relevant schema metadata
   */
  async findRelevantSchema(query, queryEmbedding, limit = 10) {
    try {
      const embeddingStr = `[${queryEmbedding.join(',')}]`;
      
      const result = await this.vectorDB.query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          description,
          1 - (embedding <=> $1) as similarity
        FROM schema_metadata
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1
        LIMIT $2
      `, [embeddingStr, limit]);

      return result.rows;
    } catch (error) {
      logger.error('Failed to find relevant schema:', error);
      throw error;
    }
  }

  /**
   * Get table relationships
   * @param {string} tableName - Table name to find relationships for
   * @returns {Promise<Array>} Table relationships
   */
  async getTableRelationships(tableName = null) {
    try {
      let query = 'SELECT * FROM table_relationships';
      let params = [];

      if (tableName) {
        query += ' WHERE source_table = $1 OR target_table = $1';
        params = [tableName];
      }

      query += ' ORDER BY source_table, target_table';

      const result = await this.vectorDB.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Failed to get table relationships:', error);
      throw error;
    }
  }

  /**
   * Add table relationship
   * @param {Object} relationship - Relationship data
   */
  async addTableRelationship(relationship) {
    try {
      await this.vectorDB.query(`
        INSERT INTO table_relationships 
        (source_table, target_table, source_column, target_column, relationship_type, description)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        relationship.source_table,
        relationship.target_table,
        relationship.source_column,
        relationship.target_column,
        relationship.relationship_type || 'foreign_key',
        relationship.description || ''
      ]);

      logger.info(`Added relationship: ${relationship.source_table} -> ${relationship.target_table}`);
    } catch (error) {
      logger.error('Failed to add table relationship:', error);
      throw error;
    }
  }

  /**
   * Get all table names
   * @returns {Promise<Array>} Array of table names
   */
  async getAllTables() {
    try {
      const result = await this.vectorDB.query(`
        SELECT DISTINCT table_name 
        FROM schema_metadata 
        ORDER BY table_name
      `);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      logger.error('Failed to get all tables:', error);
      throw error;
    }
  }

  /**
   * Get columns for a specific table
   * @param {string} tableName - Table name
   * @returns {Promise<Array>} Array of column metadata
   */
  async getTableColumns(tableName) {
    try {
      const result = await this.vectorDB.query(`
        SELECT column_name, data_type, is_nullable, description
        FROM schema_metadata 
        WHERE table_name = $1
        ORDER BY column_name
      `, [tableName]);

      return result.rows;
    } catch (error) {
      logger.error(`Failed to get columns for table ${tableName}:`, error);
      throw error;
    }
  }
}

module.exports = SchemaModel;
