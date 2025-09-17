/**
 * NLQ Service Tests
 * Tests for the Natural Language Query service functionality
 */

const request = require('supertest');
const express = require('express');
const NLQController = require('../src/controllers/NLQController');
const NLQService = require('../src/services/NLQService');

// Mock the NLQ service
jest.mock('../src/services/NLQService');

describe('NLQ Controller', () => {
  let app;
  let mockNLQService;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock NLQ service
    mockNLQService = {
      processQuery: jest.fn(),
      generateSQLOnly: jest.fn(),
      executeSQL: jest.fn(),
      getSuggestions: jest.fn(),
      getSchemaInfo: jest.fn(),
      addTableRelationship: jest.fn(),
      refreshSchemaMetadata: jest.fn(),
      getHealthStatus: jest.fn()
    };

    // Create controller with mocked service
    const controller = new NLQController();
    controller.nlqService = mockNLQService;

    // Setup routes
    app.post('/api/nlq/query', (req, res) => controller.processQuery(req, res));
    app.post('/api/nlq/generate-sql', (req, res) => controller.generateSQL(req, res));
    app.post('/api/nlq/execute-sql', (req, res) => controller.executeSQL(req, res));
    app.get('/api/nlq/suggestions', (req, res) => controller.getSuggestions(req, res));
    app.get('/api/nlq/schema', (req, res) => controller.getSchema(req, res));
    app.post('/api/nlq/relationships', (req, res) => controller.addRelationship(req, res));
    app.post('/api/nlq/refresh-schema', (req, res) => controller.refreshSchema(req, res));
    app.get('/api/nlq/health', (req, res) => controller.getHealth(req, res));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/nlq/query', () => {
    it('should process a valid query successfully', async () => {
      const mockResult = {
        success: true,
        query: 'Show me top customers',
        sql: 'SELECT * FROM customers LIMIT 10',
        confidence: 0.95,
        data: [{ id: 1, name: 'John Doe' }],
        columns: [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }]
      };

      mockNLQService.processQuery.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/nlq/query')
        .send({
          query: 'Show me top customers',
          language: 'en'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.processQuery).toHaveBeenCalledWith(
        'Show me top customers',
        { language: 'en' }
      );
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/nlq/query')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query is required');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/nlq/query')
        .send({
          query: '',
          language: 'en'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Query is required');
    });

    it('should return 400 for unsupported language', async () => {
      const response = await request(app)
        .post('/api/nlq/query')
        .send({
          query: 'Show me top customers',
          language: 'fr'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Unsupported language');
    });

    it('should handle service errors', async () => {
      mockNLQService.processQuery.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/nlq/query')
        .send({
          query: 'Show me top customers',
          language: 'en'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /api/nlq/generate-sql', () => {
    it('should generate SQL successfully', async () => {
      const mockResult = {
        success: true,
        query: 'Show me top customers',
        sql: 'SELECT * FROM customers LIMIT 10',
        confidence: 0.95
      };

      mockNLQService.generateSQLOnly.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/nlq/generate-sql')
        .send({
          query: 'Show me top customers',
          language: 'en'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.generateSQLOnly).toHaveBeenCalledWith(
        'Show me top customers',
        { language: 'en' }
      );
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/nlq/generate-sql')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/nlq/execute-sql', () => {
    it('should execute SQL successfully', async () => {
      const mockResult = {
        success: true,
        sql: 'SELECT * FROM customers LIMIT 10',
        data: [{ id: 1, name: 'John Doe' }],
        columns: [{ name: 'id', type: 'number' }],
        rowCount: 1,
        executionTime: 45
      };

      mockNLQService.executeSQL.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/nlq/execute-sql')
        .send({
          sql: 'SELECT * FROM customers LIMIT 10'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.executeSQL).toHaveBeenCalledWith(
        'SELECT * FROM customers LIMIT 10',
        {}
      );
    });

    it('should return 400 for missing SQL', async () => {
      const response = await request(app)
        .post('/api/nlq/execute-sql')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/nlq/suggestions', () => {
    it('should return suggestions successfully', async () => {
      const mockResult = {
        success: true,
        suggestions: [
          'Show me top customers',
          'What is the total revenue?'
        ]
      };

      mockNLQService.getSuggestions.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/nlq/suggestions?q=top');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.getSuggestions).toHaveBeenCalledWith('top');
    });

    it('should return suggestions for empty query', async () => {
      const mockResult = {
        success: true,
        suggestions: [
          'Show me top customers',
          'What is the total revenue?'
        ]
      };

      mockNLQService.getSuggestions.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/nlq/suggestions');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.getSuggestions).toHaveBeenCalledWith('');
    });
  });

  describe('GET /api/nlq/schema', () => {
    it('should return schema information successfully', async () => {
      const mockResult = {
        success: true,
        schema: {
          customers: [
            { column_name: 'id', data_type: 'integer', is_nullable: false },
            { column_name: 'name', data_type: 'varchar', is_nullable: false }
          ]
        }
      };

      mockNLQService.getSchemaInfo.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/nlq/schema');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.getSchemaInfo).toHaveBeenCalled();
    });

    it('should handle schema service errors', async () => {
      mockNLQService.getSchemaInfo.mockRejectedValue(new Error('Schema error'));

      const response = await request(app)
        .get('/api/nlq/schema');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/nlq/relationships', () => {
    it('should add table relationship successfully', async () => {
      const relationship = {
        source_table: 'loans',
        target_table: 'customers',
        source_column: 'customer_id',
        target_column: 'id',
        relationship_type: 'foreign_key',
        description: 'Loan belongs to customer'
      };

      const mockResult = {
        success: true,
        message: 'Table relationship added successfully',
        relationship
      };

      mockNLQService.addTableRelationship.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/nlq/relationships')
        .send(relationship);

      expect(response.status).toBe(201);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.addTableRelationship).toHaveBeenCalledWith(relationship);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/nlq/relationships')
        .send({
          source_table: 'loans'
          // Missing other required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/nlq/refresh-schema', () => {
    it('should refresh schema successfully', async () => {
      const mockResult = {
        success: true,
        message: 'Schema metadata refreshed successfully'
      };

      mockNLQService.refreshSchemaMetadata.mockResolvedValue();

      const response = await request(app)
        .post('/api/nlq/refresh-schema');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('refreshed');
      expect(mockNLQService.refreshSchemaMetadata).toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      mockNLQService.refreshSchemaMetadata.mockRejectedValue(new Error('Refresh error'));

      const response = await request(app)
        .post('/api/nlq/refresh-schema');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/nlq/health', () => {
    it('should return healthy status', async () => {
      const mockResult = {
        healthy: true,
        database: { connected: true },
        schema: { initialized: true }
      };

      mockNLQService.getHealthStatus.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/nlq/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResult);
      expect(mockNLQService.getHealthStatus).toHaveBeenCalled();
    });

    it('should return unhealthy status', async () => {
      const mockResult = {
        healthy: false,
        database: { connected: false },
        schema: { initialized: false }
      };

      mockNLQService.getHealthStatus.mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/nlq/health');

      expect(response.status).toBe(503);
      expect(response.body).toEqual(mockResult);
    });
  });
});
