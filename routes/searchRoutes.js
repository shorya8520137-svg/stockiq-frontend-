const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/searchController');
const { authenticateToken } = require('../middleware/auth');

// ===============================
// SEARCH ROUTES
// ===============================

/**
 * @route   GET /api/search/global
 * @desc    Global search across all entities
 * @access  Private
 * @params  query, type, limit, offset
 */
router.get('/global', authenticateToken, SearchController.globalSearch);

/**
 * @route   GET /api/search/suggestions
 * @desc    Get search suggestions
 * @access  Private
 * @params  query, limit
 */
router.get('/suggestions', authenticateToken, SearchController.getSearchSuggestions);

/**
 * @route   GET /api/search/analytics
 * @desc    Get search analytics data
 * @access  Private (Admin only)
 * @params  startDate, endDate, userId, limit
 */
router.get('/analytics', authenticateToken, SearchController.getSearchAnalytics);

/**
 * @route   GET /api/search/popular
 * @desc    Get popular search queries
 * @access  Private
 * @params  limit
 */
router.get('/popular', authenticateToken, SearchController.getPopularSearches);

module.exports = router;