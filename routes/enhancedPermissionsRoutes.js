const express = require('express');
const router = express.Router();
const EnhancedPermissionsController = require('../controllers/enhancedPermissionsController');
const { authenticateToken, checkRole } = require('../middleware/auth');

// ===== DEBUG ROUTES =====

// Simple test endpoint without authentication
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Enhanced permissions routes are working',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint with authentication
router.get('/test-auth', authenticateToken, (req, res) => {
    res.json({
        success: true,
        message: 'Authentication is working',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

// ===== USER MANAGEMENT ROUTES =====

// Get all users with permissions
router.get('/users', authenticateToken, checkRole(['admin', 'super_admin']), EnhancedPermissionsController.getAllUsers);

// Create new user
router.post('/users', authenticateToken, checkRole(['admin', 'super_admin']), EnhancedPermissionsController.createUser);

// Update user permissions
router.put('/users/:userId/permissions', authenticateToken, checkRole(['admin', 'super_admin']), EnhancedPermissionsController.updateUserPermissions);

// ===== PERMISSION CHECKING ROUTES =====

// Check if user has specific permission
router.get('/users/:userId/check/:permission', authenticateToken, EnhancedPermissionsController.checkUserPermission);

// Get user's effective permissions
router.get('/users/:userId/permissions', authenticateToken, EnhancedPermissionsController.getUserEffectivePermissions);

// Check component access
router.get('/users/:userId/component/:component', authenticateToken, EnhancedPermissionsController.checkComponentAccess);

// ===== AUDIT LOGGING ROUTES =====

// Get audit logs
router.get('/audit-logs', authenticateToken, checkRole(['admin', 'super_admin']), EnhancedPermissionsController.getAuditLogs);

// ===== USER ACTIVITY TRACKING ROUTES =====

// Update user activity
router.post('/users/:userId/activity', authenticateToken, EnhancedPermissionsController.updateUserActivity);

// Get online users
router.get('/users/online', authenticateToken, EnhancedPermissionsController.getOnlineUsers);

module.exports = router;