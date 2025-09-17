/**
 * Main server file for NLQ Backend API
 * Sets up Express server with all middleware and routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const db = require('./config/database');
const nlqRoutes = require('./routes/nlq');
const dashboardRoutes = require('./routes/dashboard');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler, asyncHandler } = require('./middleware/errorHandler');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3001;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression middleware
    this.app.use(compression());

    // Request logging
    this.app.use(morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    }));

    // Body parsing middleware
    this.app.use(express.json({ 
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      }
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));

    // General rate limiting
    this.app.use(generalLimiter);

    // Request ID middleware
    this.app.use((req, res, next) => {
      req.requestId = require('uuid').v4();
      res.setHeader('X-Request-ID', req.requestId);
      next();
    });

    // Request timing middleware
    this.app.use((req, res, next) => {
      req.startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
      });
      next();
    });
  }

  /**
   * Setup API routes
   */
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: require('../package.json').version
      });
    });

    // API routes
    this.app.use('/api/nlq', nlqRoutes);
    this.app.use('/api/dashboard', dashboardRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'NLQ Backend API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          health: '/health',
          nlq: '/api/nlq',
          dashboard: '/api/dashboard',
          docs: '/api/docs'
        },
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', notFoundHandler);
  }

  /**
   * Setup error handling middleware
   */
  setupErrorHandling() {
    // Global error handler
    this.app.use(errorHandler);

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  /**
   * Start the server
   */
  async start() {
    try {
      // Test database connections
      const dbStatus = await db.testConnections();
      if (!dbStatus.primary || !dbStatus.vector) {
        throw new Error('Database connection failed');
      }

      logger.info('Database connections verified');

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`NLQ Backend API server running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Health check: http://localhost:${this.port}/health`);
        logger.info(`API docs: http://localhost:${this.port}/api/nlq`);
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error('Server error:', error);
        }
        process.exit(1);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    try {
      logger.info('Starting graceful shutdown...');

      // Close server
      if (this.server) {
        this.server.close(() => {
          logger.info('HTTP server closed');
        });
      }

      // Close database connections
      await db.closeConnections();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

module.exports = Server;
