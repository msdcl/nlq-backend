/**
 * Dashboard Service
 * Business logic layer for dashboard analytics
 * Follows Single Responsibility Principle - handles only dashboard business logic
 */

const logger = require('../utils/logger');

class DashboardService {
  constructor(dashboardRepository) {
    this.dashboardRepository = dashboardRepository;
  }

  /**
   * Get all dashboard metrics
   * @returns {Promise<Object>} Dashboard metrics object
   */
  async getMetrics() {
    try {
      logger.info('Fetching dashboard metrics');

      // Execute all metric queries in parallel for better performance
      const [
        totalRevenue,
        totalOrders,
        totalCustomers,
        conversionRate,
        averageOrderValue,
        totalProducts,
        returnRate,
        customerSatisfaction
      ] = await Promise.allSettled([
        this.dashboardRepository.getTotalSalesValue(),
        this.dashboardRepository.getTotalOrders(),
        this.dashboardRepository.getTotalCustomers(),
        this.dashboardRepository.getConversionRate(),
        this.dashboardRepository.getAverageOrderValue(),
        this.dashboardRepository.getTotalProducts(),
        this.dashboardRepository.getReturnRate(),
        this.dashboardRepository.getCustomerSatisfaction()
      ]);

      // Extract values from settled promises, with fallback to 0 for failed queries
      const metrics = {
        totalRevenue: this._extractValue(totalRevenue, 0),
        totalOrders: this._extractValue(totalOrders, 0),
        totalCustomers: this._extractValue(totalCustomers, 0),
        conversionRate: this._extractValue(conversionRate, 0),
        averageOrderValue: this._extractValue(averageOrderValue, 0),
        totalProducts: this._extractValue(totalProducts, 0),
        returnRate: this._extractValue(returnRate, 0),
        customerSatisfaction: this._extractValue(customerSatisfaction, 0)
      };

      logger.info('Successfully fetched dashboard metrics');
      return metrics;
    } catch (error) {
      logger.error('Error in getMetrics service:', error);
      throw new Error('Failed to fetch dashboard metrics');
    }
  }

  /**
   * Get revenue trend data
   * @returns {Promise<Array>} Revenue trend data
   */
  async getRevenueTrend() {
    try {
      logger.info('Fetching revenue trend data');
      const data = await this.dashboardRepository.getRevenueTrend();
      
      // If no data, return sample data for better UX
      if (data.length === 0) {
        return this._getSampleRevenueTrend();
      }

      logger.info('Successfully fetched revenue trend data');
      return data;
    } catch (error) {
      logger.error('Error in getRevenueTrend service:', error);
      throw new Error('Failed to fetch revenue trend data');
    }
  }

  /**
   * Get sales data by category
   * @returns {Promise<Array>} Sales by category data
   */
  async getSalesByCategory() {
    try {
      logger.info('Fetching sales by category data');
      const data = await this.dashboardRepository.getSalesByCategory();
      
      // If no data, return sample data
      if (data.length === 0) {
        return this._getSampleCategoryData();
      }

      logger.info('Successfully fetched sales by category data');
      return data;
    } catch (error) {
      logger.error('Error in getSalesByCategory service:', error);
      throw new Error('Failed to fetch sales by category data');
    }
  }

  /**
   * Get top products data
   * @param {number} limit - Number of top products to return
   * @returns {Promise<Array>} Top products data
   */
  async getTopProducts(limit = 5) {
    try {
      logger.info(`Fetching top ${limit} products data`);
      const data = await this.dashboardRepository.getTopProducts(limit);
      
      // If no data, return sample data
      if (data.length === 0) {
        return this._getSampleTopProducts();
      }

      logger.info('Successfully fetched top products data');
      return data;
    } catch (error) {
      logger.error('Error in getTopProducts service:', error);
      throw new Error('Failed to fetch top products data');
    }
  }

  /**
   * Get recent orders data
   * @param {number} limit - Number of recent orders to return
   * @returns {Promise<Array>} Recent orders data
   */
  async getRecentOrders(limit = 5) {
    try {
      logger.info(`Fetching recent ${limit} orders data`);
      const data = await this.dashboardRepository.getRecentOrders(limit);
      
      // If no data, return sample data
      if (data.length === 0) {
        return this._getSampleRecentOrders();
      }

      logger.info('Successfully fetched recent orders data');
      return data;
    } catch (error) {
      logger.error('Error in getRecentOrders service:', error);
      throw new Error('Failed to fetch recent orders data');
    }
  }

  /**
   * Get all dashboard data in one call
   * @returns {Promise<Object>} Complete dashboard data
   */
  async getAllDashboardData() {
    try {
      logger.info('Fetching all dashboard data');

      // Execute all data fetching in parallel for better performance
      const [metricsResult, revenueResult, categoryResult, productsResult, ordersResult] = await Promise.allSettled([
        this.getMetrics(),
        this.getRevenueTrend(),
        this.getSalesByCategory(),
        this.getTopProducts(),
        this.getRecentOrders()
      ]);

      const data = {
        metrics: this._extractValue(metricsResult, {}),
        revenueData: this._extractValue(revenueResult, []),
        categoryData: this._extractValue(categoryResult, []),
        topProducts: this._extractValue(productsResult, []),
        recentOrders: this._extractValue(ordersResult, [])
      };

      logger.info('Successfully fetched all dashboard data');
      return data;
    } catch (error) {
      logger.error('Error in getAllDashboardData service:', error);
      throw new Error('Failed to fetch dashboard data');
    }
  }

  /**
   * Extract value from settled promise, with fallback
   * @private
   * @param {Object} settledPromise - Promise.allSettled result
   * @param {*} fallback - Fallback value if promise rejected
   * @returns {*} Extracted value or fallback
   */
  _extractValue(settledPromise, fallback) {
    return settledPromise.status === 'fulfilled' ? settledPromise.value : fallback;
  }

  /**
   * Get sample revenue trend data for fallback
   * @private
   * @returns {Array} Sample revenue trend data
   */
  _getSampleRevenueTrend() {
    return [
      { month: 'Jan', revenue: 12000, orders: 240 },
      { month: 'Feb', revenue: 15000, orders: 300 },
      { month: 'Mar', revenue: 18000, orders: 360 },
      { month: 'Apr', revenue: 16000, orders: 320 },
      { month: 'May', revenue: 20000, orders: 400 },
      { month: 'Jun', revenue: 22000, orders: 440 },
      { month: 'Jul', revenue: 19000, orders: 380 },
      { month: 'Aug', revenue: 25000, orders: 500 },
      { month: 'Sep', revenue: 21000, orders: 420 }
    ];
  }

  /**
   * Get sample category data for fallback
   * @private
   * @returns {Array} Sample category data
   */
  _getSampleCategoryData() {
    return [
      { category: 'Electronics', sales: 45000, orders: 120 },
      { category: 'Clothing', sales: 32000, orders: 200 },
      { category: 'Books', sales: 18000, orders: 150 },
      { category: 'Home & Garden', sales: 25000, orders: 80 },
      { category: 'Sports', sales: 15000, orders: 60 }
    ];
  }

  /**
   * Get sample top products data for fallback
   * @private
   * @returns {Array} Sample top products data
   */
  _getSampleTopProducts() {
    return [
      { name: 'Wireless Headphones', revenue: 12000, sales: 120, growth: 15.2 },
      { name: 'Smart Watch', revenue: 9500, sales: 95, growth: 8.7 },
      { name: 'Laptop Stand', revenue: 7800, sales: 156, growth: -2.1 },
      { name: 'Bluetooth Speaker', revenue: 6500, sales: 130, growth: 12.3 },
      { name: 'Phone Case', revenue: 4200, sales: 210, growth: 5.8 }
    ];
  }

  /**
   * Get sample recent orders data for fallback
   * @private
   * @returns {Array} Sample recent orders data
   */
  _getSampleRecentOrders() {
    return [
      { id: 'ORD-001', customer: 'John Doe', amount: '299.99', status: 'Delivered' },
      { id: 'ORD-002', customer: 'Jane Smith', amount: '149.50', status: 'Shipped' },
      { id: 'ORD-003', customer: 'Bob Johnson', amount: '89.99', status: 'Processing' },
      { id: 'ORD-004', customer: 'Alice Brown', amount: '199.99', status: 'Delivered' },
      { id: 'ORD-005', customer: 'Charlie Wilson', amount: '79.99', status: 'Shipped' }
    ];
  }
}

module.exports = DashboardService;
