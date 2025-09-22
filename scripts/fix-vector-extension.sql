-- Fix Vector Extension Script
-- This script installs the vector extension in both databases

-- Connect to main database and install vector extension
\c nlq_database;
CREATE EXTENSION IF NOT EXISTS vector;

-- Connect to vector database and ensure vector extension is installed
\c nlq_vectors;
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extensions are installed
\c nlq_database;
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

\c nlq_vectors;
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
