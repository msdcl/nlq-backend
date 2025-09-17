/**
 * Simple NLQ Service - A simplified version that handles basic e-commerce queries
 * This service provides direct SQL generation for common e-commerce analytics queries
 */

const db = require('../config/database');
const logger = require('../utils/logger');

class SimpleNLQService {
  constructor() {
    this.primaryDB = db.getPrimaryDB();
  }

  /**
   * Process natural language query with simple pattern matching
   * @param {string} query - Natural language query
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Processing result
   */
  async processQuery(query, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing simple NLQ: "${query}"`);
      
      const normalizedQuery = query.toLowerCase().trim();
      logger.info(`Normalized query: "${normalizedQuery}"`);

      let sql = '';
      let explanation = '';

      // Pattern matching for common queries
      if (normalizedQuery.includes('highest order value') || normalizedQuery.includes('highest order amount')) {
        if (normalizedQuery.includes('today')) {
          sql = `
            SELECT 
              o.id as order_id,
              o.customer_id,
              o.total_amount,
              o.created_at,
              c.first_name,
              c.last_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            WHERE DATE(o.created_at) = CURRENT_DATE
            ORDER BY o.total_amount DESC
            LIMIT 1;
          `;
          explanation = 'This query finds the highest value order placed today, including customer details.';
        } else {
          sql = `
            SELECT 
              o.id as order_id,
              o.customer_id,
              o.total_amount,
              o.created_at,
              c.first_name,
              c.last_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            ORDER BY o.total_amount DESC
            LIMIT 1;
          `;
          explanation = 'This query finds the highest value order of all time, including customer details.';
        }
      } else if (normalizedQuery.includes('total sales') || normalizedQuery.includes('total revenue')) {
        if (normalizedQuery.includes('today')) {
          sql = `
            SELECT 
              COALESCE(SUM(total_amount), 0) as total_sales,
              COUNT(*) as order_count
            FROM orders 
            WHERE DATE(created_at) = CURRENT_DATE
            AND status IN ('delivered', 'shipped', 'completed');
          `;
          explanation = 'This query calculates the total sales value and order count for today.';
        } else if (normalizedQuery.includes('this month')) {
          sql = `
            SELECT 
              COALESCE(SUM(total_amount), 0) as total_sales,
              COUNT(*) as order_count
            FROM orders 
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            AND status IN ('delivered', 'shipped', 'completed');
          `;
          explanation = 'This query calculates the total sales value and order count for this month.';
        } else {
          sql = `
            SELECT 
              COALESCE(SUM(total_amount), 0) as total_sales,
              COUNT(*) as order_count
            FROM orders 
            WHERE status IN ('delivered', 'shipped', 'completed');
          `;
          explanation = 'This query calculates the total sales value and order count for all time.';
        }
      } else if (normalizedQuery.includes('top products') || normalizedQuery.includes('best selling')) {
        sql = `
          SELECT 
            p.name as product_name,
            p.category_id,
            c.name as category_name,
            SUM(oi.quantity) as total_quantity,
            SUM(oi.total_price) as total_revenue
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          JOIN categories c ON p.category_id = c.id
          JOIN orders o ON oi.order_id = o.id
          WHERE o.status IN ('delivered', 'shipped', 'completed')
          GROUP BY p.id, p.name, p.category_id, c.name
          ORDER BY total_quantity DESC
          LIMIT 10;
        `;
        explanation = 'This query shows the top 10 best-selling products by quantity and revenue.';
      } else if (normalizedQuery.includes('recent orders')) {
        sql = `
          SELECT 
            o.id as order_id,
            o.customer_id,
            o.total_amount,
            o.status,
            o.created_at,
            c.first_name,
            c.last_name
          FROM orders o
          JOIN customers c ON o.customer_id = c.id
          ORDER BY o.created_at DESC
          LIMIT 10;
        `;
        explanation = 'This query shows the 10 most recent orders with customer details.';
      } else if (normalizedQuery.includes('customers') && normalizedQuery.includes('count')) {
        sql = `
          SELECT 
            COUNT(*) as total_customers,
            COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_customers_30_days
          FROM customers;
        `;
        explanation = 'This query shows the total number of customers and new customers in the last 30 days.';
      } else if (normalizedQuery.includes('order count') && (normalizedQuery.includes('day') || normalizedQuery.includes('daily'))) {
        if (normalizedQuery.includes('month') || normalizedQuery.includes('current month')) {
          sql = `
            SELECT 
              DATE(created_at) as order_date,
              COUNT(*) as order_count,
              SUM(total_amount) as daily_revenue
            FROM orders 
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            GROUP BY DATE(created_at)
            ORDER BY order_date ASC;
          `;
          explanation = 'This query shows the daily order counts and revenue for the current month.';
        } else {
          sql = `
            SELECT 
              DATE(created_at) as order_date,
              COUNT(*) as order_count,
              SUM(total_amount) as daily_revenue
            FROM orders 
            GROUP BY DATE(created_at)
            ORDER BY order_date DESC
            LIMIT 30;
          `;
          explanation = 'This query shows the daily order counts and revenue for the last 30 days.';
        }
      } else if (normalizedQuery.includes('trend') || normalizedQuery.includes('trends')) {
        sql = `
          SELECT 
            DATE(created_at) as order_date,
            COUNT(*) as order_count,
            SUM(total_amount) as daily_revenue
          FROM orders 
          WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY order_date ASC;
        `;
        explanation = 'This query shows the daily order trends for the last 30 days.';
      } else if (normalizedQuery.includes('conversion rate') || normalizedQuery.includes('conversion')) {
        sql = `
          SELECT 
            COUNT(DISTINCT o.customer_id) as total_customers,
            COUNT(DISTINCT CASE WHEN o.status IN ('delivered', 'shipped', 'completed') THEN o.customer_id END) as converted_customers,
            ROUND(
              (COUNT(DISTINCT CASE WHEN o.status IN ('delivered', 'shipped', 'completed') THEN o.customer_id END)::DECIMAL / 
               NULLIF(COUNT(DISTINCT o.customer_id), 0)) * 100, 2
            ) as conversion_rate
          FROM orders o;
        `;
        explanation = 'This query calculates the conversion rate based on customers who have completed orders.';
      } else if (normalizedQuery.includes('top') && normalizedQuery.includes('customers') && (normalizedQuery.includes('value') || normalizedQuery.includes('spent') || normalizedQuery.includes('amount'))) {
        sql = `
          SELECT 
            c.id as customer_id,
            c.first_name,
            c.last_name,
            c.email,
            COUNT(o.id) as total_orders,
            COALESCE(SUM(o.total_amount), 0) as total_spent
          FROM customers c
          LEFT JOIN orders o ON c.id = o.customer_id
          GROUP BY c.id, c.first_name, c.last_name, c.email
          ORDER BY total_spent DESC, total_orders DESC
          LIMIT 5;
        `;
        explanation = 'This query shows the top 5 customers by total order value (spending), including their order count.';
      } else if (normalizedQuery.includes('top') && normalizedQuery.includes('customers') && (normalizedQuery.includes('orders') || normalizedQuery.includes('order'))) {
        sql = `
          SELECT 
            c.id as customer_id,
            c.first_name,
            c.last_name,
            c.email,
            COUNT(o.id) as total_orders,
            COALESCE(SUM(o.total_amount), 0) as total_spent
          FROM customers c
          LEFT JOIN orders o ON c.id = o.customer_id
          GROUP BY c.id, c.first_name, c.last_name, c.email
          ORDER BY total_orders DESC, total_spent DESC
          LIMIT 5;
        `;
        explanation = 'This query shows the top 5 customers by total number of orders, including their total spending.';
      } else {
        // Default fallback query
        sql = `
          SELECT 
            'orders' as table_name,
            COUNT(*) as record_count,
            'Total orders in the system' as description
          FROM orders
          UNION ALL
          SELECT 
            'customers' as table_name,
            COUNT(*) as record_count,
            'Total customers in the system' as description
          FROM customers
          UNION ALL
          SELECT 
            'products' as table_name,
            COUNT(*) as record_count,
            'Total products in the system' as description
          FROM products;
        `;
        explanation = 'This query shows basic statistics about the e-commerce system.';
      }

      // Execute the query
      const result = await this.primaryDB.query(sql);
      const executionTime = Date.now() - startTime;

      return {
        success: true,
        query: query,
        language: options.language || 'en',
        sql: sql.trim(),
        explanation: explanation,
        data: result.rows,
        columns: result.fields?.map(field => ({
          name: field.name,
          type: field.dataTypeID,
          nullable: field.nullable
        })) || [],
        rowCount: result.rowCount,
        executionTime: executionTime,
        metadata: {
          executed_at: new Date().toISOString(),
          query_type: 'simple_nlq'
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error('Simple NLQ processing failed:', error);
      
      return {
        success: false,
        error: error.message,
        query: query,
        executionTime: executionTime,
        metadata: {
          executed_at: new Date().toISOString(),
          query_type: 'simple_nlq'
        }
      };
    }
  }

  /**
   * Get available query patterns
   * @returns {Array} Array of supported query patterns
   */
  getSupportedPatterns() {
    return [
      "today's highest order value",
      "highest order value",
      "total sales today",
      "total sales this month",
      "total sales",
      "top products",
      "best selling products",
      "recent orders",
      "customer count",
      "total customers"
    ];
  }
}

module.exports = SimpleNLQService;
