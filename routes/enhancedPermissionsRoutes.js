const express = require('express');
const router = express.Router();
const EnhancedPermissionsController = require('../controllers/enhancedPermissionsController');

// Middleware to check if user is authenticated
const authenticateUser = (req, res, next) => {
    // Add your authentication logic here
    // For now, we'll assume user is in req.user
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    next();
};

// Middleware to check admin permissions
const requireAdmin = (req, res, next) => {
    // Check if user has admin role
    if (!req.user || !req.user.role || !['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
};

// ===== USER MANAGEMENT ROUTES =====

// Get all users with permissions
router.get('/users', authenticateUser, requireAdmin, EnhancedPermissionsController.getAllUsers);

// Create new user
router.post('/users', authenticateUser, requireAdmin, EnhancedPermissionsController.createUser);

// Update user permissions
router.put('/users/:userId/permissions', authenticateUser, requireAdmin, EnhancedPermissionsController.updateUserPermissions);

// ===== PERMISSION CHECKING ROUTES =====

// Check if user has specific permission
router.get('/users/:userId/permissions/:permission/check', authenticateUser, EnhancedPermissionsController.checkUserPermission);

// Get user's effective permissions
router.get('/users/:userId/permissions', authenticateUser, EnhancedPermissionsController.getUserEffectivePermissions);

// Check component access
router.get('/users/:userId/components/:component/access', authenticateUser, EnhancedPermissionsController.checkComponentAccess);

// ===== AUDIT LOGGING ROUTES =====

// Get audit logs
router.get('/audit-logs', authenticateUser, requireAdmin, EnhancedPermissionsController.getAuditLogs);

// ===== USER ACTIVITY TRACKING ROUTES =====

// Update user activity
router.post('/users/:userId/activity', authenticateUser, EnhancedPermissionsController.updateUserActivity);

// Get online users
router.get('/users/online', authenticateUser, EnhancedPermissionsController.getOnlineUsers);

module.exports = router;