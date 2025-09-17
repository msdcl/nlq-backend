/**
 * Dashboard Repository
 * Handles all database operations for dashboard analytics
 * Follows Repository Pattern for data access abstraction
 */

const logger = require('../utils/logger');

class DashboardRepository {
  constructor(dbPool) {
    this.dbPool = dbPool;
  }

  /**
   * Get total sales value from all completed orders
   * @returns {Promise<number>} Total sales value
   */
  async getTotalSalesValue() {
    const query = `
      SELECT COALESCE(SUM(total_amount), 0) as total_sales_value
      FROM orders 
      WHERE status IN ('delivered', 'shipped', 'completed')
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseFloat(result.rows[0].total_sales_value);
    } catch (error) {
      logger.error('Error fetching total sales value:', error);
      throw new Error('Failed to fetch total sales value');
    }
  }

  /**
   * Get total orders count for current month
   * @returns {Promise<number>} Total orders count
   */
  async getTotalOrders() {
    const query = `
      SELECT COUNT(*) as total_orders
      FROM orders 
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseInt(result.rows[0].total_orders);
    } catch (error) {
      logger.error('Error fetching total orders:', error);
      throw new Error('Failed to fetch total orders');
    }
  }

  /**
   * Get total unique customers count
   * @returns {Promise<number>} Total customers count
   */
  async getTotalCustomers() {
    const query = `
      SELECT COUNT(DISTINCT customer_id) as total_customers
      FROM orders
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseInt(result.rows[0].total_customers);
    } catch (error) {
      logger.error('Error fetching total customers:', error);
      throw new Error('Failed to fetch total customers');
    }
  }

  /**
   * Get conversion rate for current month
   * @returns {Promise<number>} Conversion rate percentage
   */
  async getConversionRate() {
    const query = `
      SELECT
        CASE
          WHEN COUNT(*) > 0
          THEN ROUND((COUNT(CASE WHEN status = 'delivered' THEN 1 END)::FLOAT / COUNT(*) * 100)::NUMERIC, 2)
          ELSE 0
        END as conversion_rate
      FROM orders
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseFloat(result.rows[0].conversion_rate);
    } catch (error) {
      logger.error('Error fetching conversion rate:', error);
      throw new Error('Failed to fetch conversion rate');
    }
  }

  /**
   * Get average order value for current month
   * @returns {Promise<number>} Average order value
   */
  async getAverageOrderValue() {
    const query = `
      SELECT COALESCE(AVG(total_amount), 0) as avg_order_value
      FROM orders
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseFloat(result.rows[0].avg_order_value);
    } catch (error) {
      logger.error('Error fetching average order value:', error);
      throw new Error('Failed to fetch average order value');
    }
  }

  /**
   * Get total products count
   * @returns {Promise<number>} Total products count
   */
  async getTotalProducts() {
    const query = `
      SELECT COUNT(*) as total_products
      FROM products
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseInt(result.rows[0].total_products);
    } catch (error) {
      logger.error('Error fetching total products:', error);
      throw new Error('Failed to fetch total products');
    }
  }

  /**
   * Get return rate for current month
   * @returns {Promise<number>} Return rate percentage
   */
  async getReturnRate() {
    const query = `
      SELECT
        CASE
          WHEN COUNT(*) > 0
          THEN (COUNT(CASE WHEN status = 'returned' THEN 1 END)::FLOAT / COUNT(*) * 100)
          ELSE 0
        END as return_rate
      FROM orders
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseFloat(result.rows[0].return_rate);
    } catch (error) {
      logger.error('Error fetching return rate:', error);
      throw new Error('Failed to fetch return rate');
    }
  }

  /**
   * Get customer satisfaction rating
   * @returns {Promise<number>} Average customer satisfaction rating
   */
  async getCustomerSatisfaction() {
    const query = `
      SELECT COALESCE(AVG(rating), 0) as avg_rating
      FROM reviews
      WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return parseFloat(result.rows[0].avg_rating);
    } catch (error) {
      logger.error('Error fetching customer satisfaction:', error);
      throw new Error('Failed to fetch customer satisfaction');
    }
  }

  /**
   * Get revenue trend data for the current year
   * @returns {Promise<Array>} Revenue trend data by month
   */
  async getRevenueTrend() {
    const query = `
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        EXTRACT(MONTH FROM created_at) as month_num,
        SUM(total_amount) as revenue,
        COUNT(*) as orders
      FROM orders 
      WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE)
      AND status IN ('delivered', 'shipped', 'completed')
      GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
      ORDER BY EXTRACT(MONTH FROM created_at)
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return result.rows.map(row => ({
        month: row.month,
        revenue: parseFloat(row.revenue),
        orders: parseInt(row.orders)
      }));
    } catch (error) {
      logger.error('Error fetching revenue trend:', error);
      throw new Error('Failed to fetch revenue trend');
    }
  }

  /**
   * Get sales data by category
   * @returns {Promise<Array>} Sales data by category
   */
  async getSalesByCategory() {
    const query = `
      SELECT 
        c.name as category,
        SUM(oi.total_price) as sales,
        COUNT(DISTINCT o.id) as orders
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('delivered', 'shipped', 'completed')
      GROUP BY c.id, c.name
      ORDER BY sales DESC
    `;
    
    try {
      const result = await this.dbPool.query(query);
      return result.rows.map(row => ({
        category: row.category,
        sales: parseFloat(row.sales || 0),
        orders: parseInt(row.orders || 0)
      }));
    } catch (error) {
      logger.error('Error fetching sales by category:', error);
      throw new Error('Failed to fetch sales by category');
    }
  }

  /**
   * Get top products by sales
   * @param {number} limit - Number of top products to return
   * @returns {Promise<Array>} Top products data
   */
  async getTopProducts(limit = 5) {
    const query = `
      SELECT 
        p.name,
        SUM(oi.total_price) as revenue,
        SUM(oi.quantity) as sales,
        ROUND(
          (SUM(oi.total_price) - LAG(SUM(oi.total_price)) OVER (ORDER BY SUM(oi.total_price) DESC)) / 
          NULLIF(LAG(SUM(oi.total_price)) OVER (ORDER BY SUM(oi.total_price) DESC), 0) * 100, 2
        ) as growth
      FROM products p
      JOIN order_items oi ON p.id = oi.product_id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('delivered', 'shipped', 'completed')
      GROUP BY p.id, p.name
      ORDER BY revenue DESC
      LIMIT $1
    `;
    
    try {
      const result = await this.dbPool.query(query, [limit]);
      return result.rows.map(row => ({
        name: row.name,
        revenue: parseFloat(row.revenue),
        sales: parseInt(row.sales),
        growth: parseFloat(row.growth || 0)
      }));
    } catch (error) {
      logger.error('Error fetching top products:', error);
      throw new Error('Failed to fetch top products');
    }
  }

  /**
   * Get recent orders
   * @param {number} limit - Number of recent orders to return
   * @returns {Promise<Array>} Recent orders data
   */
  async getRecentOrders(limit = 5) {
    const query = `
      SELECT 
        o.id,
        CONCAT(c.first_name, ' ', c.last_name) as customer,
        o.total_amount as amount,
        o.status,
        o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC
      LIMIT $1
    `;
    
    try {
      const result = await this.dbPool.query(query, [limit]);
      return result.rows.map(row => ({
        id: row.id,
        customer: row.customer,
        amount: parseFloat(row.amount).toFixed(2),
        status: row.status.charAt(0).toUpperCase() + row.status.slice(1)
      }));
    } catch (error) {
      logger.error('Error fetching recent orders:', error);
      throw new Error('Failed to fetch recent orders');
    }
  }
}

module.exports = DashboardRepository;
