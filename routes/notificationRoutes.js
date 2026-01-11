const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { authenticateToken, checkRole } = require('../middleware/auth');

// ===============================
// NOTIFICATION ROUTES
// ===============================

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 * @params  limit, offset, unreadOnly, type
 */
router.get('/', authenticateToken, NotificationController.getUserNotifications);

/**
 * @route   PUT /api/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:notificationId/read', authenticateToken, NotificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authenticateToken, NotificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:notificationId
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:notificationId', authenticateToken, NotificationController.deleteNotification);

/**
 * @route   POST /api/notifications
 * @desc    Create notification
 * @access  Private (Admin/Manager)
 */
router.post('/', authenticateToken, checkRole(['super_admin', 'admin', 'manager']), NotificationController.createNotification);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get('/preferences', authenticateToken, NotificationController.getNotificationPreferences);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put('/preferences', authenticateToken, NotificationController.updateNotificationPreferences);

/**
 * @route   GET /api/notifications/stats
 * @desc    Get notification statistics
 * @access  Private
 */
router.get('/stats', authenticateToken, NotificationController.getNotificationStats);

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification
 * @access  Private
 */
router.post('/test', authenticateToken, NotificationController.testNotification);

/**
 * @route   GET /api/notifications/connected-users
 * @desc    Get connected users (Admin only)
 * @access  Private (Admin only)
 */
router.get('/connected-users', authenticateToken, checkRole(['super_admin', 'admin']), NotificationController.getConnectedUsers);

module.exports = router;