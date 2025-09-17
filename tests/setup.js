/**
 * Jest test setup
 * Global test configuration and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'nlq_test';
process.env.DB_USER = 'nlq_test';
process.env.DB_PASSWORD = 'test_password';
process.env.VECTOR_DB_HOST = 'localhost';
process.env.VECTOR_DB_PORT = '5432';
process.env.VECTOR_DB_NAME = 'nlq_vectors_test';
process.env.VECTOR_DB_USER = 'nlq_test';
process.env.VECTOR_DB_PASSWORD = 'test_password';
process.env.GEMINI_API_KEY = 'AIzaSyBuFETpI5OM57lB59G7Rm5eHUh0Tj6dpU4';
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.PORT = '3001';
process.env.RATE_LIMIT_WINDOW_MS = '900000';
process.env.RATE_LIMIT_MAX_REQUESTS = '100';
process.env.QUERY_TIMEOUT_MS = '30000';
process.env.MAX_RESULT_ROWS = '10000';
process.env.SANDBOX_MODE = 'true';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Global test utilities
global.testUtils = {
  // Create mock request object
  createMockRequest: (body = {}, query = {}, params = {}) => ({
    body,
    query,
    params,
    headers: {
      'content-type': 'application/json'
    }
  }),

  // Create mock response object
  createMockResponse: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis()
    };
    return res;
  },

  // Create mock database result
  createMockDBResult: (rows = [], fields = [], rowCount = 0) => ({
    rows,
    fields,
    rowCount
  }),

  // Create mock query result
  createMockQueryResult: (data = [], columns = [], sql = 'SELECT * FROM test') => ({
    success: true,
    query: 'test query',
    sql,
    confidence: 0.95,
    explanation: 'Test explanation',
    data,
    columns,
    rowCount: data.length,
    executionTime: 45,
    metadata: {
      generated_at: new Date().toISOString(),
      model: 'gemini-pro'
    }
  }),

  // Create mock schema metadata
  createMockSchemaMetadata: () => [
    {
      table_name: 'customers',
      column_name: 'id',
      data_type: 'integer',
      is_nullable: false,
      description: 'Customer ID',
      similarity: 0.95
    },
    {
      table_name: 'customers',
      column_name: 'name',
      data_type: 'varchar',
      is_nullable: true,
      description: 'Customer name',
      similarity: 0.90
    }
  ],

  // Wait for async operations
  waitFor: (ms = 100) => new Promise(resolve => setTimeout(resolve, ms))
};

// Mock external dependencies
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    colorize: jest.fn(),
    printf: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn()
    }))
  }))
}));

// Mock pg (PostgreSQL client)
jest.mock('pg', () => ({
  Pool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  }))
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234')
}));

// Mock moment
jest.mock('moment', () => {
  const moment = jest.fn(() => ({
    format: jest.fn(() => '2024-01-01T12:00:00Z'),
    toISOString: jest.fn(() => '2024-01-01T12:00:00Z'),
    add: jest.fn(() => moment()),
    subtract: jest.fn(() => moment()),
    diff: jest.fn(() => 1000),
    valueOf: jest.fn(() => 1704110400000)
  }));
  
  moment.utc = jest.fn(() => moment());
  moment.now = jest.fn(() => 1704110400000);
  
  return moment;
});

// Mock lodash
jest.mock('lodash', () => ({
  isEmpty: jest.fn((value) => !value || Object.keys(value).length === 0),
  isArray: jest.fn((value) => Array.isArray(value)),
  isString: jest.fn((value) => typeof value === 'string'),
  isNumber: jest.fn((value) => typeof value === 'number'),
  isObject: jest.fn((value) => value !== null && typeof value === 'object'),
  cloneDeep: jest.fn((value) => JSON.parse(JSON.stringify(value))),
  merge: jest.fn((target, ...sources) => Object.assign(target, ...sources)),
  pick: jest.fn((object, keys) => {
    const result = {};
    keys.forEach(key => {
      if (object.hasOwnProperty(key)) {
        result[key] = object[key];
      }
    });
    return result;
  }),
  omit: jest.fn((object, keys) => {
    const result = { ...object };
    keys.forEach(key => delete result[key]);
    return result;
  })
}));

// Global test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});
