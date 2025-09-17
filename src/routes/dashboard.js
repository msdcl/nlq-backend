/**
 * Dashboard Routes - E-commerce Analytics Dashboard API
 * Provides endpoints for dashboard data
 */

const express = require('express');
const router = express.Router();
const DashboardFactory = require('../factories/DashboardFactory');
const { validateRequest } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimiter');

// Create dashboard controller using factory pattern with dependency injection
const dashboardController = DashboardFactory.createDashboardController();

/**
 * @route   GET /api/dashboard/metrics
 * @desc    Get dashboard metrics (KPIs)
 * @access  Public
 */
router.get('/metrics', generalLimiter, (req, res) => dashboardController.getMetrics(req, res));

/**
 * @route   GET /api/dashboard/revenue-trend
 * @desc    Get revenue trend data
 * @access  Public
 */
router.get('/revenue-trend', generalLimiter, (req, res) => dashboardController.getRevenueTrend(req, res));

/**
 * @route   GET /api/dashboard/sales-by-category
 * @desc    Get sales data by category
 * @access  Public
 */
router.get('/sales-by-category', generalLimiter, (req, res) => dashboardController.getSalesByCategory(req, res));

/**
 * @route   GET /api/dashboard/top-products
 * @desc    Get top selling products
 * @access  Public
 */
router.get('/top-products', generalLimiter, (req, res) => dashboardController.getTopProducts(req, res));

/**
 * @route   GET /api/dashboard/recent-orders
 * @desc    Get recent orders
 * @access  Public
 */
router.get('/recent-orders', generalLimiter, (req, res) => dashboardController.getRecentOrders(req, res));

/**
 * @route   GET /api/dashboard/all
 * @desc    Get all dashboard data in one request
 * @access  Public
 */
router.get('/all', generalLimiter, (req, res) => dashboardController.getAllDashboardData(req, res));

module.exports = router;
