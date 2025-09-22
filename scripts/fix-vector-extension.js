#!/usr/bin/env node

/**
 * Fix Vector Extension Script
 * This script installs the vector extension in both databases
 */

require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../src/utils/logger');

async function fixVectorExtension() {
  console.log('🔧 Fixing vector extension installation...\n');

  // Primary database connection
  const primaryPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nlq_database',
    user: process.env.DB_USER || 'nlq_user',
    password: process.env.DB_PASSWORD,
  });

  // Vector database connection
  const vectorPool = new Pool({
    host: process.env.VECTOR_DB_HOST || process.env.DB_HOST || 'localhost',
    port: process.env.VECTOR_DB_PORT || process.env.DB_PORT || 5432,
    database: process.env.VECTOR_DB_NAME || 'nlq_vectors',
    user: process.env.VECTOR_DB_USER || process.env.DB_USER || 'nlq_user',
    password: process.env.VECTOR_DB_PASSWORD || process.env.DB_PASSWORD,
  });

  try {
    // Fix primary database
    console.log('📊 Installing vector extension in primary database...');
    const primaryClient = await primaryPool.connect();
    await primaryClient.query('CREATE EXTENSION IF NOT EXISTS vector;');
    
    // Verify installation
    const result = await primaryClient.query("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';");
    if (result.rows.length > 0) {
      console.log(`✅ Vector extension installed in primary database: ${result.rows[0].extname} v${result.rows[0].extversion}`);
    } else {
      console.log('❌ Failed to install vector extension in primary database');
    }
    primaryClient.release();

    // Fix vector database
    console.log('🧠 Installing vector extension in vector database...');
    const vectorClient = await vectorPool.connect();
    await vectorClient.query('CREATE EXTENSION IF NOT EXISTS vector;');
    
    // Verify installation
    const vectorResult = await vectorClient.query("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';");
    if (vectorResult.rows.length > 0) {
      console.log(`✅ Vector extension installed in vector database: ${vectorResult.rows[0].extname} v${vectorResult.rows[0].extversion}`);
    } else {
      console.log('❌ Failed to install vector extension in vector database');
    }
    vectorClient.release();

    console.log('\n🎉 Vector extension fix completed successfully!');
    console.log('Your NLQ API should now work without the "extension vector is not available" error.');

  } catch (error) {
    console.error('❌ Error fixing vector extension:', error.message);
    process.exit(1);
  } finally {
    await primaryPool.end();
    await vectorPool.end();
  }
}

// Run the fix
fixVectorExtension().catch(console.error);
