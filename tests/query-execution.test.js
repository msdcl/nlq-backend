/**
 * Query Execution Service Tests
 * Tests for the query execution and validation functionality
 */

const QueryExecutionService = require('../src/services/QueryExecutionService');

// Mock the database
jest.mock('../src/config/database', () => ({
  getPrimaryDB: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn()
  }))
}));

describe('QueryExecutionService', () => {
  let queryService;
  let mockDB;

  beforeEach(() => {
    const db = require('../src/config/database');
    mockDB = db.getPrimaryDB();
    queryService = new QueryExecutionService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateQuerySafety', () => {
    it('should allow valid SELECT queries', async () => {
      const validQueries = [
        'SELECT * FROM customers',
        'SELECT id, name FROM customers WHERE id = 1',
        'SELECT COUNT(*) FROM orders',
        'SELECT c.name, o.amount FROM customers c JOIN orders o ON c.id = o.customer_id'
      ];

      for (const sql of validQueries) {
        await expect(queryService.validateQuerySafety(sql)).resolves.not.toThrow();
      }
    });

    it('should reject dangerous operations', async () => {
      const dangerousQueries = [
        'DROP TABLE customers',
        'DELETE FROM customers',
        'UPDATE customers SET name = "hacked"',
        'INSERT INTO customers VALUES (1, "hacker")',
        'ALTER TABLE customers ADD COLUMN hacked VARCHAR(255)',
        'TRUNCATE TABLE customers',
        'GRANT ALL PRIVILEGES ON customers TO public',
        'REVOKE ALL PRIVILEGES ON customers FROM public'
      ];

      for (const sql of dangerousQueries) {
        await expect(queryService.validateQuerySafety(sql)).rejects.toThrow();
      }
    });

    it('should reject system table access', async () => {
      const systemQueries = [
        'SELECT * FROM pg_user',
        'SELECT * FROM information_schema.tables',
        'SELECT * FROM sys.tables'
      ];

      for (const sql of systemQueries) {
        await expect(queryService.validateQuerySafety(sql)).rejects.toThrow();
      }
    });

    it('should reject file system access', async () => {
      const fileQueries = [
        'COPY customers TO \'/tmp/data.csv\'',
        '\\COPY customers TO \'/tmp/data.csv\''
      ];

      for (const sql of fileQueries) {
        await expect(queryService.validateQuerySafety(sql)).rejects.toThrow();
      }
    });

    it('should reject dangerous function calls', async () => {
      const dangerousFunctions = [
        'SELECT pg_read_file(\'/etc/passwd\')',
        'SELECT pg_ls_dir(\'/\')',
        'SELECT lo_import(\'/etc/passwd\')'
      ];

      for (const sql of dangerousFunctions) {
        await expect(queryService.validateQuerySafety(sql)).rejects.toThrow();
      }
    });

    it('should reject non-SELECT queries', async () => {
      const nonSelectQueries = [
        'CREATE TABLE test (id INT)',
        'EXPLAIN SELECT * FROM customers',
        'WITH RECURSIVE t AS (SELECT 1) SELECT * FROM t'
      ];

      for (const sql of nonSelectQueries) {
        await expect(queryService.validateQuerySafety(sql)).rejects.toThrow();
      }
    });
  });

  describe('executeQuery', () => {
    it('should execute valid query successfully', async () => {
      const mockResult = {
        rows: [
          { id: 1, name: 'John Doe' },
          { id: 2, name: 'Jane Smith' }
        ],
        fields: [
          { name: 'id', dataTypeID: 23, nullable: false },
          { name: 'name', dataTypeID: 1043, nullable: true }
        ],
        rowCount: 2
      };

      mockDB.query.mockResolvedValue(mockResult);

      const result = await queryService.executeQuery('SELECT id, name FROM customers');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.rows);
      expect(result.columns).toHaveLength(2);
      expect(result.rowCount).toBe(2);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(mockDB.query).toHaveBeenCalled();
    });

    it('should handle query execution errors', async () => {
      const error = new Error('Table does not exist');
      mockDB.query.mockRejectedValue(error);

      const result = await queryService.executeQuery('SELECT * FROM nonexistent_table');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Table does not exist');
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should add LIMIT clause when not present', async () => {
      const mockResult = { rows: [], fields: [], rowCount: 0 };
      mockDB.query.mockResolvedValue(mockResult);

      await queryService.executeQuery('SELECT * FROM customers');

      expect(mockDB.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.any(Object)
      );
    });

    it('should not add LIMIT when already present', async () => {
      const mockResult = { rows: [], fields: [], rowCount: 0 };
      mockDB.query.mockResolvedValue(mockResult);

      await queryService.executeQuery('SELECT * FROM customers LIMIT 5');

      expect(mockDB.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 5'),
        expect.any(Object)
      );
    });

    it('should respect maxResults option', async () => {
      const mockResult = { rows: [], fields: [], rowCount: 0 };
      mockDB.query.mockResolvedValue(mockResult);

      await queryService.executeQuery('SELECT * FROM customers', { maxResults: 50 });

      expect(mockDB.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.any(Object)
      );
    });
  });

  describe('validateSyntax', () => {
    it('should validate correct SQL syntax', async () => {
      mockDB.query.mockResolvedValue({ rows: [] });

      const result = await queryService.validateSyntax('SELECT * FROM customers');

      expect(result.valid).toBe(true);
      expect(result.message).toBe('Query syntax is valid');
    });

    it('should detect syntax errors', async () => {
      const error = new Error('syntax error at or near "FRO"');
      error.code = '42601';
      mockDB.query.mockRejectedValue(error);

      const result = await queryService.validateSyntax('SELECT * FRO customers');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('syntax error');
      expect(result.error).toBe('42601');
    });
  });

  describe('getExecutionPlan', () => {
    it('should return execution plan', async () => {
      const mockPlan = {
        'QUERY PLAN': [
          {
            'Plan': {
              'Node Type': 'Seq Scan',
              'Relation Name': 'customers',
              'Total Cost': 25.0,
              'Plan Rows': 100
            }
          }
        ]
      };

      mockDB.query.mockResolvedValue(mockPlan);

      const result = await queryService.getExecutionPlan('SELECT * FROM customers');

      expect(result.plan).toEqual(mockPlan['QUERY PLAN']);
      expect(result.metadata.generated_at).toBeDefined();
    });

    it('should handle execution plan errors', async () => {
      const error = new Error('Query planning failed');
      mockDB.query.mockRejectedValue(error);

      await expect(queryService.getExecutionPlan('INVALID SQL')).rejects.toThrow();
    });
  });

  describe('estimateQueryCost', () => {
    it('should estimate query cost', async () => {
      const mockPlan = {
        'QUERY PLAN': [
          {
            'Total Cost': 25.0,
            'Plan Rows': 100
          }
        ]
      };

      mockDB.query.mockResolvedValue(mockPlan);

      const result = await queryService.estimateQueryCost('SELECT * FROM customers');

      expect(result.totalCost).toBe(25.0);
      expect(result.estimatedRows).toBe(100);
      expect(result.costPerRow).toBe(0.25);
      expect(result.metadata.estimated_at).toBeDefined();
    });

    it('should handle cost estimation errors', async () => {
      const error = new Error('Cost estimation failed');
      mockDB.query.mockRejectedValue(error);

      await expect(queryService.estimateQueryCost('INVALID SQL')).rejects.toThrow();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status when connected', async () => {
      const mockResult = {
        rows: [
          {
            current_time: '2024-01-01T12:00:00Z',
            version: 'PostgreSQL 15.0'
          }
        ]
      };

      mockDB.query.mockResolvedValue(mockResult);

      const result = await queryService.getConnectionStatus();

      expect(result.connected).toBe(true);
      expect(result.currentTime).toBeDefined();
      expect(result.version).toBe('PostgreSQL 15.0');
    });

    it('should return connection status when disconnected', async () => {
      const error = new Error('Connection failed');
      mockDB.query.mockRejectedValue(error);

      const result = await queryService.getConnectionStatus();

      expect(result.connected).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('formatSQL', () => {
    it('should format SQL query', () => {
      const sql = 'select id,name from customers where id=1';
      const formatted = queryService.formatSQL(sql);

      expect(formatted).toContain('SELECT');
      expect(formatted).toContain('FROM');
      expect(formatted).toContain('WHERE');
    });

    it('should handle formatting errors gracefully', () => {
      const invalidSQL = 'invalid sql syntax';
      const formatted = queryService.formatSQL(invalidSQL);

      expect(formatted).toBe(invalidSQL);
    });
  });
});
