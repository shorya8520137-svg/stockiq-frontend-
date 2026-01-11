const express = require('express');
const router = express.Router();
const MentionController = require('../controllers/mentionController');
const { authenticateToken } = require('../middleware/auth');

// ===============================
// MENTION ROUTES
// ===============================

/**
 * @route   POST /api/mentions
 * @desc    Create mention(s)
 * @access  Private
 */
router.post('/', authenticateToken, MentionController.createMention);

/**
 * @route   GET /api/mentions
 * @desc    Get user mentions
 * @access  Private
 * @params  limit, offset, unreadOnly, entityType
 */
router.get('/', authenticateToken, MentionController.getUserMentions);

/**
 * @route   PUT /api/mentions/:mentionId/read
 * @desc    Mark mention as read
 * @access  Private
 */
router.put('/:mentionId/read', authenticateToken, MentionController.markMentionAsRead);

/**
 * @route   GET /api/mentions/search-users
 * @desc    Search users for mentions
 * @access  Private
 * @params  query, limit
 */
router.get('/search-users', authenticateToken, MentionController.searchUsersForMention);

/**
 * @route   POST /api/mentions/parse
 * @desc    Parse mentions from text
 * @access  Private
 */
router.post('/parse', authenticateToken, MentionController.parseMentionsFromText);

/**
 * @route   GET /api/mentions/stats
 * @desc    Get mention statistics
 * @access  Private
 * @params  days
 */
router.get('/stats', authenticateToken, MentionController.getMentionStats);

module.exports = router;