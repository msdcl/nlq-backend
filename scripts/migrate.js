/**
 * Database migration script
 * Sets up the required database tables and extensions
 */

require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../src/utils/logger');

class DatabaseMigrator {
  constructor() {
    this.primaryDB = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'nlq_database',
      user: process.env.DB_USER || 'nlq_user',
      password: process.env.DB_PASSWORD,
    });

    this.vectorDB = new Pool({
      host: process.env.VECTOR_DB_HOST || process.env.DB_HOST || 'localhost',
      port: process.env.VECTOR_DB_PORT || process.env.DB_PORT || 5432,
      database: process.env.VECTOR_DB_NAME || 'nlq_vectors',
      user: process.env.VECTOR_DB_USER || process.env.DB_USER || 'nlq_user',
      password: process.env.VECTOR_DB_PASSWORD || process.env.DB_PASSWORD,
    });
  }

  /**
   * Run all migrations
   */
  async migrate() {
    try {
      logger.info('Starting database migration...');

      // Test connections
      await this.testConnections();

      // Create primary database tables
      await this.createPrimaryTables();

      // Create vector database tables
      await this.createVectorTables();

      // Create indexes
      await this.createIndexes();

      // Insert sample data
      await this.insertSampleData();

      logger.info('Database migration completed successfully');

    } catch (error) {
      logger.error('Migration failed:', error);
      throw error;
    } finally {
      await this.closeConnections();
    }
  }

  /**
   * Test database connections
   */
  async testConnections() {
    try {
      // Test primary database
      const primaryClient = await this.primaryDB.connect();
      await primaryClient.query('SELECT NOW()');
      primaryClient.release();
      logger.info('Primary database connection successful');

      // Test vector database
      const vectorClient = await this.vectorDB.connect();
      await vectorClient.query('SELECT NOW()');
      vectorClient.release();
      logger.info('Vector database connection successful');

    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  /**
   * Create primary database tables
   */
  async createPrimaryTables() {
    const client = await this.primaryDB.connect();
    
    try {
      // Enable pgvector extension in primary database
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
      
      // Create sample tables for demonstration
      await client.query(`
        CREATE TABLE IF NOT EXISTS customers (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone VARCHAR(20),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS branches (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          code VARCHAR(10) UNIQUE NOT NULL,
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(100),
          manager_name VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS loans (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER REFERENCES customers(id),
          branch_id INTEGER REFERENCES branches(id),
          loan_amount DECIMAL(15,2) NOT NULL,
          interest_rate DECIMAL(5,2) NOT NULL,
          term_months INTEGER NOT NULL,
          disbursal_date DATE NOT NULL,
          due_date DATE NOT NULL,
          status VARCHAR(50) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS repayments (
          id SERIAL PRIMARY KEY,
          loan_id INTEGER REFERENCES loans(id),
          amount DECIMAL(15,2) NOT NULL,
          payment_date DATE NOT NULL,
          payment_method VARCHAR(50),
          status VARCHAR(50) DEFAULT 'completed',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100),
          description TEXT,
          min_amount DECIMAL(15,2),
          max_amount DECIMAL(15,2),
          interest_rate DECIMAL(5,2),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      logger.info('Primary database tables created successfully');

    } catch (error) {
      logger.error('Failed to create primary tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create vector database tables
   */
  async createVectorTables() {
    const client = await this.vectorDB.connect();
    
    try {
      // Enable pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

      // Create schema metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_metadata (
          id SERIAL PRIMARY KEY,
          table_name VARCHAR(255) NOT NULL,
          column_name VARCHAR(255),
          data_type VARCHAR(100),
          is_nullable BOOLEAN DEFAULT true,
          column_default TEXT,
          description TEXT,
          synonyms TEXT[],
          embedding vector(1536),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create table relationships table
      await client.query(`
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

      // Create query log table
      await client.query(`
        CREATE TABLE IF NOT EXISTS query_logs (
          id SERIAL PRIMARY KEY,
          query_text TEXT NOT NULL,
          generated_sql TEXT,
          execution_time INTEGER,
          success BOOLEAN DEFAULT false,
          error_message TEXT,
          user_ip INET,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      logger.info('Vector database tables created successfully');

    } catch (error) {
      logger.error('Failed to create vector tables:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create indexes for better performance
   */
  async createIndexes() {
    const vectorClient = await this.vectorDB.connect();
    
    try {
      // Create vector similarity index
      await vectorClient.query(`
        CREATE INDEX IF NOT EXISTS schema_metadata_embedding_idx 
        ON schema_metadata USING ivfflat (embedding vector_cosine_ops) 
        WITH (lists = 100);
      `);

      // Create other useful indexes
      await vectorClient.query(`
        CREATE INDEX IF NOT EXISTS schema_metadata_table_name_idx 
        ON schema_metadata (table_name);
      `);

      await vectorClient.query(`
        CREATE INDEX IF NOT EXISTS query_logs_created_at_idx 
        ON query_logs (created_at);
      `);

      logger.info('Database indexes created successfully');

    } catch (error) {
      logger.error('Failed to create indexes:', error);
      throw error;
    } finally {
      vectorClient.release();
    }
  }

  /**
   * Insert sample data
   */
  async insertSampleData() {
    const primaryClient = await this.primaryDB.connect();
    const vectorClient = await this.vectorDB.connect();
    
    try {
      // Insert sample customers
      await primaryClient.query(`
        INSERT INTO customers (name, email, phone, city, state, country) VALUES
        ('John Doe', 'john.doe@email.com', '+1234567890', 'New York', 'NY', 'USA'),
        ('Jane Smith', 'jane.smith@email.com', '+1234567891', 'Los Angeles', 'CA', 'USA'),
        ('Bob Johnson', 'bob.johnson@email.com', '+1234567892', 'Chicago', 'IL', 'USA'),
        ('Alice Brown', 'alice.brown@email.com', '+1234567893', 'Houston', 'TX', 'USA'),
        ('Charlie Wilson', 'charlie.wilson@email.com', '+1234567894', 'Phoenix', 'AZ', 'USA')
        ON CONFLICT (email) DO NOTHING;
      `);

      // Insert sample branches
      await primaryClient.query(`
        INSERT INTO branches (name, code, city, state, manager_name) VALUES
        ('Downtown Branch', 'DT001', 'New York', 'NY', 'Manager A'),
        ('Westside Branch', 'WS002', 'Los Angeles', 'CA', 'Manager B'),
        ('Central Branch', 'CT003', 'Chicago', 'IL', 'Manager C'),
        ('South Branch', 'ST004', 'Houston', 'TX', 'Manager D'),
        ('North Branch', 'NT005', 'Phoenix', 'AZ', 'Manager E')
        ON CONFLICT (code) DO NOTHING;
      `);

      // Insert sample products
      await primaryClient.query(`
        INSERT INTO products (name, category, min_amount, max_amount, interest_rate) VALUES
        ('Personal Loan', 'Personal', 1000, 50000, 12.5),
        ('Home Loan', 'Mortgage', 50000, 1000000, 8.5),
        ('Car Loan', 'Vehicle', 5000, 100000, 10.0),
        ('Business Loan', 'Business', 10000, 500000, 15.0),
        ('Education Loan', 'Education', 2000, 200000, 9.0)
        ON CONFLICT DO NOTHING;
      `);

      // Insert sample loans
      await primaryClient.query(`
        INSERT INTO loans (customer_id, branch_id, loan_amount, interest_rate, term_months, disbursal_date, due_date) VALUES
        (1, 1, 25000, 12.5, 24, '2024-01-15', '2026-01-15'),
        (2, 2, 50000, 8.5, 60, '2024-02-01', '2029-02-01'),
        (3, 3, 15000, 10.0, 36, '2024-02-15', '2027-02-15'),
        (4, 4, 75000, 15.0, 48, '2024-03-01', '2028-03-01'),
        (5, 5, 30000, 9.0, 24, '2024-03-15', '2026-03-15')
        ON CONFLICT DO NOTHING;
      `);

      // Insert sample repayments
      await primaryClient.query(`
        INSERT INTO repayments (loan_id, amount, payment_date, payment_method) VALUES
        (1, 1200, '2024-02-15', 'Bank Transfer'),
        (1, 1200, '2024-03-15', 'Bank Transfer'),
        (2, 850, '2024-03-01', 'Check'),
        (2, 850, '2024-04-01', 'Bank Transfer'),
        (3, 500, '2024-03-15', 'Cash'),
        (4, 1800, '2024-04-01', 'Bank Transfer'),
        (5, 1400, '2024-04-15', 'Bank Transfer')
        ON CONFLICT DO NOTHING;
      `);

      // Insert table relationships
      await vectorClient.query(`
        INSERT INTO table_relationships (source_table, target_table, source_column, target_column, relationship_type, description) VALUES
        ('loans', 'customers', 'customer_id', 'id', 'foreign_key', 'Loan belongs to customer'),
        ('loans', 'branches', 'branch_id', 'id', 'foreign_key', 'Loan processed by branch'),
        ('repayments', 'loans', 'loan_id', 'id', 'foreign_key', 'Repayment for loan')
        ON CONFLICT DO NOTHING;
      `);

      logger.info('Sample data inserted successfully');

    } catch (error) {
      logger.error('Failed to insert sample data:', error);
      throw error;
    } finally {
      primaryClient.release();
      vectorClient.release();
    }
  }

  /**
   * Close database connections
   */
  async closeConnections() {
    await this.primaryDB.end();
    await this.vectorDB.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  migrator.migrate()
    .then(() => {
      logger.info('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = DatabaseMigrator;
