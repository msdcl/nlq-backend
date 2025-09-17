/**
 * Dashboard Factory
 * Factory pattern for creating dashboard-related instances
 * Follows Dependency Injection and Factory patterns
 */

const DashboardRepository = require('../repositories/DashboardRepository');
const DashboardService = require('../services/DashboardService');
const DashboardController = require('../controllers/DashboardController');
const db = require('../config/database');

class DashboardFactory {
  /**
   * Create a complete dashboard controller with all dependencies
   * @returns {DashboardController} Configured dashboard controller
   */
  static createDashboardController() {
    // Get database pool
    const dbPool = db.getPrimaryDB();
    
    // Create repository with database dependency
    const dashboardRepository = new DashboardRepository(dbPool);
    
    // Create service with repository dependency
    const dashboardService = new DashboardService(dashboardRepository);
    
    // Create controller with service dependency
    const dashboardController = new DashboardController(dashboardService);
    
    return dashboardController;
  }

  /**
   * Create dashboard repository only
   * @returns {DashboardRepository} Configured dashboard repository
   */
  static createDashboardRepository() {
    const dbPool = db.getPrimaryDB();
    return new DashboardRepository(dbPool);
  }

  /**
   * Create dashboard service only
   * @returns {DashboardService} Configured dashboard service
   */
  static createDashboardService() {
    const repository = this.createDashboardRepository();
    return new DashboardService(repository);
  }
}

module.exports = DashboardFactory;
