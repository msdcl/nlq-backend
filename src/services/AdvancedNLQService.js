/**
 * Advanced NLQ Service using LangChain and Gemini AI
 * Implements the complete NLQ flow with vector search and LLM integration
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const db = require('../config/database');
const logger = require('../utils/logger');
const { GEMINI_API_KEY } = require('../environment');

class AdvancedNLQService {
  constructor() {
    this.primaryDB = db.getPrimaryDB();
    this.vectorDB = db.getVectorDB();
    this.isInitialized = false;
    this.genAI = null;
    this.llm = null;
    this.embeddings = null;
  }

  /**
   * Initialize the service with Gemini AI and LangChain
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize Gemini AI
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is required but not provided');
      }
      
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      this.llm = new ChatGoogleGenerativeAI({
        model: 'gemini-1.5-flash',
        apiKey: GEMINI_API_KEY,
        temperature: 0.1,
      });
      this.embeddings = new GoogleGenerativeAIEmbeddings({
        model: 'embedding-001',
        apiKey: GEMINI_API_KEY,
      });
      
      logger.info('LangChain and Gemini AI initialized successfully');

      // Enable pgvector extension
      await this.vectorDB.query('CREATE EXTENSION IF NOT EXISTS vector;');
      
      // Drop existing table if it exists (to fix dimension mismatch)
      await this.vectorDB.query('DROP TABLE IF EXISTS table_metadata;');
      
      // Create table metadata table for vector search
      await this.vectorDB.query(`
        CREATE TABLE table_metadata (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(255) NOT NULL,
          description TEXT,
          schema_info JSONB,
          embedding vector(768),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create index for vector similarity search
      await this.vectorDB.query(`
        CREATE INDEX IF NOT EXISTS table_metadata_embedding_idx 
        ON table_metadata USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      `);
      
      // Populate table metadata if empty
      await this.populateTableMetadata();
      
      this.isInitialized = true;
      logger.info('Advanced NLQ Service initialized successfully with LangChain');
    } catch (error) {
      logger.error('Failed to initialize Advanced NLQ Service:', error);
      throw error;
    }
  }

  /**
   * Step 1: Create embedding and do cosine similarity query to get top 5 tables
   */
  async findRelevantTables(query, limit = 5) {
    try {
      logger.info(`Step 1: Finding relevant tables for query: "${query}"`);
      
      // Generate query embedding using LangChain
      const queryEmbedding = await this.embeddings.embedQuery(query);
      
      // Vector similarity search using cosine similarity
      const searchResult = await this.vectorDB.query(`
        SELECT 
          table_name,
          description,
          schema_info,
          1 - (embedding <=> $1) as similarity
        FROM table_metadata
        ORDER BY embedding <=> $1
        LIMIT $2
      `, [`[${queryEmbedding.join(',')}]`, limit]);
      
      const relevantTables = searchResult.rows.map(row => ({
        tableName: row.table_name,
        description: row.description,
        schema: typeof row.schema_info === 'string' ? JSON.parse(row.schema_info) : row.schema_info,
        similarity: parseFloat(row.similarity)
      }));
      
      logger.info(`Found ${relevantTables.length} relevant tables with similarities: ${relevantTables.map(t => `${t.tableName}(${t.similarity.toFixed(3)})`).join(', ')}`);
      return relevantTables;
    } catch (error) {
      logger.error('Step 1 failed - Failed to find relevant tables:', error);
      throw error;
    }
  }

  /**
   * Step 2: Get complete schema of related tables from PostgreSQL
   */
  async getCompleteTableSchemas(tableNames) {
    try {
      logger.info(`Step 2: Getting complete schemas for tables: ${tableNames.join(', ')}`);
      
      const schemas = {};
      
      for (const tableName of tableNames) {
        const schema = await this.getTableSchema(tableName);
        schemas[tableName] = schema;
      }
      
      logger.info(`Retrieved schemas for ${Object.keys(schemas).length} tables`);
      return schemas;
    } catch (error) {
      logger.error('Step 2 failed - Failed to get complete table schemas:', error);
      throw error;
    }
  }

  /**
   * Get detailed schema information for a table
   */
  async getTableSchema(tableName) {
    try {
      const query = `
        SELECT 
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
          fk.foreign_table_name,
          fk.foreign_column_name,
          COALESCE(pgd.description, '') as column_description
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
        ) pk ON c.column_name = pk.column_name
        LEFT JOIN (
          SELECT 
            ku.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
          JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
          WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
        ) fk ON c.column_name = fk.column_name
        LEFT JOIN pg_class pgc ON pgc.relname = c.table_name
        LEFT JOIN pg_namespace pgn ON pgn.oid = pgc.relnamespace
        LEFT JOIN pg_description pgd ON pgd.objoid = pgc.oid AND pgd.objsubid = c.ordinal_position
        WHERE c.table_name = $1
        ORDER BY c.ordinal_position;
      `;
      
      const result = await this.primaryDB.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      logger.error(`Failed to get schema for table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Step 3: Use LLM with query + schema + context to generate SQL
   */
  async generateSQLWithLangChain(query, relevantTables, completeSchemas) {
    try {
      logger.info(`Step 3: Generating SQL using LangChain for query: "${query}"`);
      
      // Build comprehensive schema context
      const schemaContext = relevantTables.map(table => {
        const tableSchema = completeSchemas[table.tableName] || [];
        const columns = tableSchema.map(col => {
          let colInfo = `  ${col.column_name} (${col.data_type})`;
          if (col.is_primary_key) colInfo += ' [PRIMARY KEY]';
          if (col.is_foreign_key) colInfo += ` [FK -> ${col.foreign_table_name}.${col.foreign_column_name}]`;
          if (col.column_description) colInfo += ` - ${col.column_description}`;
          return colInfo;
        }).join('\n');
        
        return `Table: ${table.tableName}\nDescription: ${table.description}\nColumns:\n${columns}`;
      }).join('\n\n');

      // Create LangChain prompt template
      const promptTemplate = PromptTemplate.fromTemplate(`
You are an expert SQL query generator for an e-commerce database. Generate a PostgreSQL query based on the user's natural language request.

Database Schema:
{schemaContext}

User Query: {userQuery}

Instructions:
1. Generate ONLY a SELECT query - no INSERT, UPDATE, DELETE, or DROP statements
2. Use proper PostgreSQL syntax
3. Include appropriate JOINs based on foreign key relationships
4. Add meaningful column aliases for better readability
5. Use proper aggregation functions (SUM, COUNT, AVG, etc.) when needed
6. Include ORDER BY and LIMIT clauses when appropriate
7. Handle NULL values appropriately
8. Use proper date/time functions for temporal queries

Return ONLY the SQL query without any explanations or markdown formatting.
      `);

      // Create the chain
      const chain = promptTemplate.pipe(this.llm).pipe(new StringOutputParser());
      
      // Generate SQL
      const sql = await chain.invoke({
        schemaContext,
        userQuery: query
      });

      // Clean up the SQL (remove any markdown formatting)
      const cleanSQL = sql.replace(/```sql\n?/g, '').replace(/```\n?/g, '').trim();
      
      logger.info(`Generated SQL: ${cleanSQL}`);
      return cleanSQL;
    } catch (error) {
      logger.error('Step 3 failed - Failed to generate SQL with LangChain:', error);
      throw error;
    }
  }

  /**
   * Step 4: Validate SQL syntax and ensure only SELECT queries
   */
  async validateSQL(sql) {
    try {
      logger.info(`Step 4: Validating SQL query`);
      
      // Basic SQL validation
      const trimmedSQL = sql.trim().toLowerCase();
      
      // Check if it's a SELECT query
      if (!trimmedSQL.startsWith('select')) {
        throw new Error('Only SELECT queries are allowed');
      }
      
      // Check for dangerous operations (but allow SQL functions like CURRENT_DATE)
      const dangerousKeywords = ['drop', 'delete', 'insert', 'update', 'alter', 'truncate'];
      const allowedFunctions = ['current_date', 'current_timestamp', 'now()', 'date_trunc'];
      
      for (const keyword of dangerousKeywords) {
        if (trimmedSQL.includes(keyword)) {
          // Check if it's part of an allowed function
          const isAllowedFunction = allowedFunctions.some(func => 
            trimmedSQL.includes(func) && trimmedSQL.includes(keyword)
          );
          
          if (!isAllowedFunction) {
            throw new Error(`Dangerous operation '${keyword}' is not allowed`);
          }
        }
      }
      
      // Test the query syntax by preparing it
      try {
        await this.primaryDB.query('EXPLAIN ' + sql);
        logger.info('SQL validation passed');
        return true;
      } catch (syntaxError) {
        throw new Error(`SQL syntax error: ${syntaxError.message}`);
      }
    } catch (error) {
      logger.error('Step 4 failed - SQL validation failed:', error);
      throw error;
    }
  }

  /**
   * Step 5: Execute SQL and return response with generated query
   */
  async executeSQL(sql) {
    try {
      logger.info(`Step 5: Executing SQL query`);
      
      const result = await this.primaryDB.query(sql);
      
      logger.info(`Query executed successfully, returned ${result.rows.length} rows`);
      return {
        data: result.rows,
        columns: result.fields ? result.fields.map(field => field.name) : [],
        rowCount: result.rows.length
      };
    } catch (error) {
      logger.error('Step 5 failed - SQL execution failed:', error);
      throw error;
    }
  }

  /**
   * Main NLQ processing method - implements the complete 5-step flow
   */
  async processQuery(query, options = {}) {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      logger.info(`Processing NLQ query: "${query}"`);

      // Step 1: Create embedding and do cosine similarity query to get top 5 tables
      const relevantTables = await this.findRelevantTables(query, 5);
      
      // Step 2: Get complete schema of related tables from PostgreSQL
      const tableNames = relevantTables.map(t => t.tableName);
      const completeSchemas = await this.getCompleteTableSchemas(tableNames);
      
      // Step 3: Use LLM with query + schema + context to generate SQL
      const generatedSQL = await this.generateSQLWithLangChain(query, relevantTables, completeSchemas);
      
      // Step 4: Validate SQL syntax and ensure only SELECT queries
      await this.validateSQL(generatedSQL);
      
      // Step 5: Execute SQL and return response with generated query
      const queryResult = await this.executeSQL(generatedSQL);
      
      const processingTime = Date.now() - startTime;
      
      const response = {
        success: true,
        query: query,
        generatedSQL: generatedSQL,
        result: queryResult,
        processingTime: processingTime,
        relevantTables: relevantTables.map(t => ({
          tableName: t.tableName,
          description: t.description,
          similarity: t.similarity
        })),
        timestamp: new Date().toISOString()
      };

      logger.info(`NLQ processing completed in ${processingTime}ms`);
      return response;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`NLQ processing failed after ${processingTime}ms:`, error);
      
      return {
        success: false,
        query: query,
        error: error.message,
        processingTime: processingTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Populate table metadata for vector search
   */
  async populateTableMetadata() {
    try {
      // Check if metadata already exists
      const existing = await this.vectorDB.query('SELECT COUNT(*) as count FROM table_metadata');
      if (parseInt(existing.rows[0].count) > 0) {
        logger.info('Table metadata already populated');
        return;
      }

      // Get all tables
      const tables = await this.primaryDB.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);

      const tableDescriptions = {
        'customers': 'Customer information including personal details, contact information, and account data',
        'orders': 'Order records with customer references, order dates, status, and total amounts',
        'order_items': 'Individual items within orders including product references, quantities, and prices',
        'products': 'Product catalog with names, descriptions, categories, and pricing information',
        'categories': 'Product categories for organizing and filtering products',
        'inventory': 'Product stock levels and inventory management data'
      };

      for (const table of tables.rows) {
        const tableName = table.table_name;
        const description = tableDescriptions[tableName] || `Table containing ${tableName} data`;
        
        // Get schema information
        const schemaInfo = await this.getTableSchema(tableName);
        
        // Generate embedding using LangChain
        const embedding = await this.embeddings.embedQuery(description);
        
        // Insert metadata
        await this.vectorDB.query(`
          INSERT INTO table_metadata (table_name, description, schema_info, embedding)
          VALUES ($1, $2, $3, $4)
        `, [
          tableName,
          description,
          JSON.stringify(schemaInfo),
          `[${embedding.join(',')}]`
        ]);
      }
      
      logger.info(`Populated metadata for ${tables.rows.length} tables`);
    } catch (error) {
      logger.error('Failed to populate table metadata:', error);
      throw error;
    }
  }
}

module.exports = { AdvancedNLQService };
