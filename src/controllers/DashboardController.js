/**
 * Dashboard Controller
 * Handles HTTP requests for dashboard analytics
 * Follows Single Responsibility Principle - only handles HTTP concerns
 * Uses Dependency Injection for service layer
 */

const logger = require('../utils/logger');

class DashboardController {
  constructor(dashboardService) {
    this.dashboardService = dashboardService;
  }

  /**
   * Get dashboard metrics
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getMetrics(req, res) {
    try {
      logger.info('DashboardController: Fetching metrics');
      
      const metrics = await this.dashboardService.getMetrics();
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('DashboardController: Error fetching metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard metrics',
        message: error.message
      });
    }
  }

  /**
   * Get revenue trend data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRevenueTrend(req, res) {
    try {
      logger.info('DashboardController: Fetching revenue trend');
      
      const data = await this.dashboardService.getRevenueTrend();
      
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('DashboardController: Error fetching revenue trend:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch revenue trend data',
        message: error.message
      });
    }
  }

  /**
   * Get sales by category data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getSalesByCategory(req, res) {
    try {
      logger.info('DashboardController: Fetching sales by category');
      
      const data = await this.dashboardService.getSalesByCategory();
      
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('DashboardController: Error fetching sales by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch sales by category data',
        message: error.message
      });
    }
  }

  /**
   * Get top products data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getTopProducts(req, res) {
    try {
      logger.info('DashboardController: Fetching top products');
      
      const limit = parseInt(req.query.limit) || 5;
      const data = await this.dashboardService.getTopProducts(limit);
      
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('DashboardController: Error fetching top products:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch top products data',
        message: error.message
      });
    }
  }

  /**
   * Get recent orders data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getRecentOrders(req, res) {
    try {
      logger.info('DashboardController: Fetching recent orders');
      
      const limit = parseInt(req.query.limit) || 5;
      const data = await this.dashboardService.getRecentOrders(limit);
      
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('DashboardController: Error fetching recent orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch recent orders data',
        message: error.message
      });
    }
  }

  /**
   * Get all dashboard data
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getAllDashboardData(req, res) {
    try {
      logger.info('DashboardController: Fetching all dashboard data');
      
      const data = await this.dashboardService.getAllDashboardData();
      
      res.json({
        success: true,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('DashboardController: Error fetching all dashboard data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard data',
        message: error.message
      });
    }
  }
}

module.exports = DashboardController;